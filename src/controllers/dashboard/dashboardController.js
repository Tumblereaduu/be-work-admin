import pool from "../../config/db.js";

const VALID_PRIORITIES = ["low", "medium", "high"];
const VALID_STATUSES = ["pending", "in_progress", "completed"];

const TASK_SELECT = `
  t.*,
  staff.name AS staff_name,
  assigner.name AS assigned_by_name,
  updater.name AS updated_by_name
`;

const TASK_JOINS = `
  LEFT JOIN users staff ON staff.id = t.assigned_to
  LEFT JOIN users assigner ON assigner.id = t.assigned_by
  LEFT JOIN users updater ON updater.id = t.updated_by
`;

const buildAccessCondition = (user, targetUserId) => {
  const effectiveUserId =
    user.role === "staff" ? user.id : targetUserId || user.id;

  return {
    sql: `(
      t.assigned_to = ?
      OR EXISTS (
        SELECT 1 FROM task_assignees ta
        WHERE ta.task_id = t.id AND ta.user_id = ?
      )
    )`,
    params: [effectiveUserId, effectiveUserId],
    effectiveUserId,
  };
};

const countTasksForUser = async (userId, extraCondition = "", extraParams = []) => {
  const access = buildAccessCondition({ role: "staff", id: userId }, userId);

  const [pendingRows] = await pool.query(
    `
      SELECT COUNT(DISTINCT t.id) AS total
      FROM tasks t
      WHERE ${access.sql}
        AND t.status IN ('pending', 'in_progress')
        ${extraCondition}
    `,
    [...access.params, ...extraParams]
  );

  const [completedRows] = await pool.query(
    `
      SELECT COUNT(DISTINCT t.id) AS total
      FROM tasks t
      WHERE ${access.sql}
        AND t.status = 'completed'
        ${extraCondition}
    `,
    [...access.params, ...extraParams]
  );

  const [priorityRows] = await pool.query(
    `
      SELECT t.priority, COUNT(DISTINCT t.id) AS total
      FROM tasks t
      WHERE ${access.sql}
        ${extraCondition}
      GROUP BY t.priority
    `,
    [...access.params, ...extraParams]
  );

  const priority = { high: 0, medium: 0, low: 0 };

  for (const row of priorityRows) {
    if (priority[row.priority] !== undefined) {
      priority[row.priority] = row.total;
    }
  }

  return {
    pending: pendingRows[0]?.total || 0,
    completed: completedRows[0]?.total || 0,
    priority,
  };
};

export const getDashboardStats = async (req, res) => {
  try {
    const [users] = await pool.query("SELECT COUNT(*) AS totalUsers FROM users");
    const [attendance] = await pool.query(
      "SELECT COUNT(*) AS totalAttendance FROM attendance"
    );
    const [tasks] = await pool.query("SELECT COUNT(*) AS totalTasks FROM tasks");
    const [activeStaff] = await pool.query(
      "SELECT COUNT(*) AS activeStaff FROM users WHERE role = 'staff' AND status = 'active'"
    );

    return res.status(200).json({
      success: true,
      stats: {
        totalUsers: users[0].totalUsers,
        totalAttendance: attendance[0].totalAttendance,
        totalTasks: tasks[0].totalTasks,
        activeStaff: activeStaff[0]?.activeStaff || 0,
      },
    });
  } catch (error) {
    console.log("DASHBOARD ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Server Error",
      error: error.message,
    });
  }
};

export const getTaskStats = async (req, res) => {
  try {
    const userStats = await countTasksForUser(req.user.id);

    const response = {
      user: userStats,
    };

    if (req.user.role === "admin" || req.user.role === "super_admin") {
      const [allPending] = await pool.query(
        "SELECT COUNT(*) AS total FROM tasks WHERE status IN ('pending', 'in_progress')"
      );
      const [allCompleted] = await pool.query(
        "SELECT COUNT(*) AS total FROM tasks WHERE status = 'completed'"
      );
      const [allPriority] = await pool.query(
        "SELECT priority, COUNT(*) AS total FROM tasks GROUP BY priority"
      );

      const all = {
        pending: allPending[0]?.total || 0,
        completed: allCompleted[0]?.total || 0,
        priority: { high: 0, medium: 0, low: 0 },
      };

      for (const row of allPriority) {
        if (all.priority[row.priority] !== undefined) {
          all.priority[row.priority] = row.total;
        }
      }

      response.all = all;
    }

    return res.status(200).json({
      success: true,
      stats: response,
    });
  } catch (error) {
    console.log("TASK STATS ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

export const getDashboardTasks = async (req, res) => {
  try {
    const { status = "", priority = "", user_id = "" } = req.query;

    const conditions = [];
    const params = [];

    if (req.user.role === "staff") {
      const access = buildAccessCondition(req.user, req.user.id);
      conditions.push(access.sql);
      params.push(...access.params);
    } else if (user_id) {
      const filterUserId = Number(user_id);
      if (Number.isInteger(filterUserId) && filterUserId > 0) {
        const access = buildAccessCondition(req.user, filterUserId);
        conditions.push(access.sql);
        params.push(...access.params);
      }
    }

    if (status === "pending") {
      conditions.push("t.status IN ('pending', 'in_progress')");
    } else if (status === "completed") {
      conditions.push("t.status = 'completed'");
    } else if (status && VALID_STATUSES.includes(status)) {
      conditions.push("t.status = ?");
      params.push(status);
    }

    if (priority && VALID_PRIORITIES.includes(priority)) {
      conditions.push("t.priority = ?");
      params.push(priority);
    }

    const whereClause = `WHERE ${conditions.join(" AND ")}`;

    const [tasks] = await pool.query(
      `
        SELECT ${TASK_SELECT}
        FROM tasks t
        ${TASK_JOINS}
        ${whereClause}
        ORDER BY t.id DESC
        LIMIT 100
      `,
      params
    );

    const taskIds = tasks.map((task) => task.id);
    let assigneesByTask = {};

    if (taskIds.length) {
      const placeholders = taskIds.map(() => "?").join(", ");
      const [assigneeRows] = await pool.query(
        `
          SELECT ta.task_id, u.id, u.name
          FROM task_assignees ta
          INNER JOIN users u ON u.id = ta.user_id
          WHERE ta.task_id IN (${placeholders})
        `,
        taskIds
      );

      for (const row of assigneeRows) {
        if (!assigneesByTask[row.task_id]) assigneesByTask[row.task_id] = [];
        assigneesByTask[row.task_id].push({ id: row.id, name: row.name });
      }
    }

    const data = tasks.map((task) => {
      const assignees =
        assigneesByTask[task.id] ||
        (task.assigned_to
          ? [{ id: task.assigned_to, name: task.staff_name }]
          : []);

      return {
        ...task,
        assignees,
        staff_names: assignees.map((a) => a.name).join(", ") || task.staff_name,
      };
    });

    return res.status(200).json({
      success: true,
      data,
      filter: { status, priority, user_id: user_id || null },
    });
  } catch (error) {
    console.log("DASHBOARD TASKS ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};
