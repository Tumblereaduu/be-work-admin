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

const parseAssignedTo = (raw) => {
  if (raw == null || raw === "") return [];

  if (Array.isArray(raw)) {
    return raw.map((id) => Number(id)).filter((id) => Number.isInteger(id) && id > 0);
  }

  if (typeof raw === "string") {
    const trimmed = raw.trim();
    if (!trimmed) return [];

    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        return parsed.map((id) => Number(id)).filter((id) => Number.isInteger(id) && id > 0);
      }
    } catch {
      // fall through
    }

    return trimmed
      .split(",")
      .map((id) => Number(id.trim()))
      .filter((id) => Number.isInteger(id) && id > 0);
  }

  const single = Number(raw);
  return Number.isInteger(single) && single > 0 ? [single] : [];
};

const collectUploadedFiles = (req) => {
  const files = [];

  if (Array.isArray(req.files?.attachments)) {
    files.push(...req.files.attachments);
  }

  if (Array.isArray(req.files?.attachment)) {
    files.push(...req.files.attachment);
  }

  if (req.file) {
    files.push(req.file);
  }

  return files;
};

const insertTaskAttachments = async (executor, taskId, files, uploadedBy) => {
  if (!files.length) return;

  const values = files.map((file) => [
    taskId,
    `/uploads/tasks/${file.filename}`,
    file.originalname,
    file.mimetype,
    file.size,
    uploadedBy,
  ]);

  await executor.query(
    `
      INSERT INTO task_attachments
      (task_id, file_url, file_name, file_mime, file_size, uploaded_by)
      VALUES ?
    `,
    [values]
  );
};

const attachAssigneesToTasks = async (tasks) => {
  if (!tasks.length) return tasks;

  const taskIds = tasks.map((task) => task.id);
  const placeholders = taskIds.map(() => "?").join(", ");

  const [assigneeRows] = await pool.query(
    `
      SELECT ta.task_id, u.id, u.name
      FROM task_assignees ta
      INNER JOIN users u ON u.id = ta.user_id
      WHERE ta.task_id IN (${placeholders})
      ORDER BY u.name ASC
    `,
    taskIds
  );

  const assigneesByTask = {};

  for (const row of assigneeRows) {
    if (!assigneesByTask[row.task_id]) {
      assigneesByTask[row.task_id] = [];
    }

    assigneesByTask[row.task_id].push({
      id: row.id,
      name: row.name,
    });
  }

  return tasks.map((task) => {
    const assignees =
      assigneesByTask[task.id] ||
      (task.assigned_to
        ? [{ id: task.assigned_to, name: task.staff_name || null }]
        : []);

    return {
      ...task,
      assignees,
      staff_names: assignees.map((a) => a.name).filter(Boolean).join(", ") || null,
      staff_name: assignees[0]?.name || task.staff_name || null,
    };
  });
};

const attachAttachmentsToTasks = async (tasks) => {
  if (!tasks.length) return tasks;

  const taskIds = tasks.map((task) => task.id);
  const placeholders = taskIds.map(() => "?").join(", ");

  const [rows] = await pool.query(
    `
      SELECT *
      FROM task_attachments
      WHERE task_id IN (${placeholders})
      ORDER BY created_at ASC
    `,
    taskIds
  );

  const attachmentsByTask = {};

  for (const row of rows) {
    if (!attachmentsByTask[row.task_id]) {
      attachmentsByTask[row.task_id] = [];
    }

    attachmentsByTask[row.task_id].push({
      id: row.id,
      file_url: row.file_url,
      file_name: row.file_name,
      file_mime: row.file_mime,
      file_size: row.file_size,
      uploaded_by: row.uploaded_by,
      created_at: row.created_at,
    });
  }

  return tasks.map((task) => {
    const attachments = [...(attachmentsByTask[task.id] || [])];

    if (
      task.attachment_url &&
      !attachments.some((file) => file.file_url === task.attachment_url)
    ) {
      attachments.unshift({
        id: null,
        file_url: task.attachment_url,
        file_name: task.attachment_name,
        file_mime: task.attachment_mime,
        file_size: task.attachment_size,
        legacy: true,
      });
    }

    return { ...task, attachments };
  });
};

const enrichTasks = async (tasks) => {
  const withAssignees = await attachAssigneesToTasks(tasks);
  return attachAttachmentsToTasks(withAssignees);
};

const userCanAccessTask = (task, userId, assignees) => {
  if (assignees?.some((assignee) => assignee.id === userId)) {
    return true;
  }

  return task.assigned_to === userId;
};

const buildStaffAccessCondition = (userId) => ({
  sql: `(
    t.assigned_to = ?
    OR EXISTS (
      SELECT 1 FROM task_assignees ta
      WHERE ta.task_id = t.id AND ta.user_id = ?
    )
  )`,
  params: [userId, userId],
});

const buildUserFilterCondition = (userId) => ({
  sql: `(
    t.assigned_to = ?
    OR EXISTS (
      SELECT 1 FROM task_assignees ta
      WHERE ta.task_id = t.id AND ta.user_id = ?
    )
  )`,
  params: [userId, userId],
});

const getAssigneeIds = async (taskId) => {
  const [rows] = await pool.query(
    "SELECT user_id FROM task_assignees WHERE task_id = ?",
    [taskId]
  );
  return rows.map((row) => row.user_id);
};

const markTaskUpdated = async (executor, taskId, userId) => {
  await executor.query(
    "UPDATE tasks SET updated_by = ?, updated_at = NOW() WHERE id = ?",
    [userId, taskId]
  );
};

const assertCanModifyTask = async (req, currentTask, assigneeIds) => {
  if (currentTask.status === "completed") {
    return {
      ok: false,
      status: 400,
      message: "Completed tasks cannot be modified",
    };
  }

  if (req.user.role === "staff") {
    const canUpdate =
      assigneeIds.includes(req.user.id) || currentTask.assigned_to === req.user.id;

    if (!canUpdate) {
      return { ok: false, status: 403, message: "Access denied" };
    }
  }

  return { ok: true };
};

// CREATE TASK
export const createTask = async (req, res) => {
  try {
    const role = req.user.role;

    if (role !== "admin" && role !== "super_admin" && role !== "staff") {
      return res.status(403).json({ success: false, message: "Access denied" });
    }

    const { title, description, deadline, priority = "medium" } = req.body || {};
    const assigneeIds = parseAssignedTo(req.body?.assigned_to);
    const uploadFiles = collectUploadedFiles(req);

    if (!title?.trim()) {
      return res.status(400).json({ success: false, message: "Title is required" });
    }

    if (!assigneeIds.length) {
      return res.status(400).json({
        success: false,
        message: "At least one staff member must be assigned",
      });
    }

    if (!VALID_PRIORITIES.includes(priority)) {
      return res.status(400).json({
        success: false,
        message: "Invalid priority. Use low, medium, or high",
      });
    }

    const [staffRows] = await pool.query(
      `
        SELECT id FROM users
        WHERE id IN (${assigneeIds.map(() => "?").join(", ")})
          AND role IN ('staff', 'admin', 'super_admin')
          AND status = 'active'
      `,
      assigneeIds
    );

    if (staffRows.length !== assigneeIds.length) {
      return res.status(400).json({
        success: false,
        message: "One or more assigned staff members are invalid",
      });
    }

    const firstFile = uploadFiles[0] || null;
    const attachment_url = firstFile ? `/uploads/tasks/${firstFile.filename}` : null;
    const attachment_name = firstFile ? firstFile.originalname : null;
    const attachment_mime = firstFile ? firstFile.mimetype : null;
    const attachment_size = firstFile ? firstFile.size : null;

    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();

      const [result] = await connection.query(
        `
          INSERT INTO tasks
          (
            title, description, assigned_to, assigned_by, deadline, priority,
            attachment_url, attachment_name, attachment_mime, attachment_size,
            updated_by, updated_at
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
        `,
        [
          title.trim(),
          description || null,
          assigneeIds[0],
          req.user.id,
          deadline || null,
          priority,
          attachment_url,
          attachment_name,
          attachment_mime,
          attachment_size,
          req.user.id,
        ]
      );

      const taskId = result.insertId;

      await connection.query(
        "INSERT INTO task_assignees (task_id, user_id) VALUES ?",
        [assigneeIds.map((userId) => [taskId, userId])]
      );

      await insertTaskAttachments(connection, taskId, uploadFiles, req.user.id);

      await connection.commit();

      return res.status(201).json({
        success: true,
        message: "Task created successfully",
        taskId,
      });
    } catch (transactionError) {
      await connection.rollback();
      throw transactionError;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.log(error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// GET TASKS
export const getTasks = async (req, res) => {
  try {
    const { search = "", status = "", priority = "", user_id = "" } = req.query;

    const conditions = [];
    const params = [];

    if (search.trim()) {
      conditions.push("(t.title LIKE ? OR t.description LIKE ?)");
      const term = `%${search.trim()}%`;
      params.push(term, term);
    }

    if (status && VALID_STATUSES.includes(status)) {
      conditions.push("t.status = ?");
      params.push(status);
    }

    if (priority && VALID_PRIORITIES.includes(priority)) {
      conditions.push("t.priority = ?");
      params.push(priority);
    }

    if (req.user.role === "staff") {
      const staffFilter = buildStaffAccessCondition(req.user.id);
      conditions.push(staffFilter.sql);
      params.push(...staffFilter.params);
    } else if (user_id) {
      const filterUserId = Number(user_id);
      if (Number.isInteger(filterUserId) && filterUserId > 0) {
        const userFilter = buildUserFilterCondition(filterUserId);
        conditions.push(userFilter.sql);
        params.push(...userFilter.params);
      }
    }

    const whereClause = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

    const [tasks] = await pool.query(
      `
        SELECT ${TASK_SELECT}
        FROM tasks t
        ${TASK_JOINS}
        ${whereClause}
        ORDER BY t.id DESC
      `,
      params
    );

    const data = await enrichTasks(tasks);

    return res.status(200).json({ success: true, data });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// GET TASK BY ID
export const getTaskById = async (req, res) => {
  try {
    const { id } = req.params;

    const [rows] = await pool.query(
      `
        SELECT ${TASK_SELECT}
        FROM tasks t
        ${TASK_JOINS}
        WHERE t.id = ?
      `,
      [id]
    );

    if (!rows.length) {
      return res.status(404).json({ success: false, message: "Task not found" });
    }

    const [task] = await enrichTasks(rows);

    if (req.user.role === "staff" && !userCanAccessTask(task, req.user.id, task.assignees)) {
      return res.status(403).json({ success: false, message: "Access denied" });
    }

    return res.status(200).json({ success: true, data: task });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// UPDATE TASK (status + attachments)
export const updateTask = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body || {};
    const uploadFiles = collectUploadedFiles(req);

    const [taskRows] = await pool.query("SELECT * FROM tasks WHERE id = ?", [id]);

    if (!taskRows.length) {
      return res.status(404).json({ success: false, message: "Task not found" });
    }

    const currentTask = taskRows[0];
    const assigneeIds = await getAssigneeIds(id);

    const access = await assertCanModifyTask(req, currentTask, assigneeIds);
    if (!access.ok) {
      return res.status(access.status).json({
        success: false,
        message: access.message,
      });
    }

    if (status && !VALID_STATUSES.includes(status)) {
      return res.status(400).json({ success: false, message: "Invalid status" });
    }

    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();

      if (status) {
        if (status === "completed") {
          await connection.query(
            "UPDATE tasks SET status = ?, completed_at = NOW() WHERE id = ?",
            [status, id]
          );
        } else {
          await connection.query(
            "UPDATE tasks SET status = ?, completed_at = NULL WHERE id = ?",
            [status, id]
          );
        }
      }

      await insertTaskAttachments(connection, id, uploadFiles, req.user.id);
      await markTaskUpdated(connection, id, req.user.id);

      await connection.commit();

      return res.status(200).json({
        success: true,
        message: "Task updated successfully",
      });
    } catch (transactionError) {
      await connection.rollback();
      throw transactionError;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.log(error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// UPDATE TASK STATUS (legacy route)
export const updateTaskStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!VALID_STATUSES.includes(status)) {
      return res.status(400).json({ success: false, message: "Invalid status" });
    }

    const [taskRows] = await pool.query("SELECT * FROM tasks WHERE id = ?", [id]);

    if (!taskRows.length) {
      return res.status(404).json({ success: false, message: "Task not found" });
    }

    const currentTask = taskRows[0];
    const assigneeIds = await getAssigneeIds(id);

    const access = await assertCanModifyTask(req, currentTask, assigneeIds);
    if (!access.ok) {
      return res.status(access.status).json({
        success: false,
        message: access.message,
      });
    }

    if (status === "completed") {
      await pool.query(
        "UPDATE tasks SET status = ?, completed_at = NOW() WHERE id = ?",
        [status, id]
      );
    } else {
      await pool.query(
        "UPDATE tasks SET status = ?, completed_at = NULL WHERE id = ?",
        [status, id]
      );
    }

    await markTaskUpdated(pool, id, req.user.id);

    return res.status(200).json({
      success: true,
      message: "Task updated successfully",
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// ADD TASK MESSAGE/REPLY
export const addTaskMessage = async (req, res) => {
  try {
    const { id } = req.params;
    const { message } = req.body || {};

    // Validate message
    if (!message || !message.trim()) {
      return res.status(400).json({
        success: false,
        message: "Message is required",
      });
    }

    // Check task exists
    const [taskRows] = await pool.query("SELECT * FROM tasks WHERE id = ?", [id]);

    if (!taskRows.length) {
      return res.status(404).json({
        success: false,
        message: "Task not found",
      });
    }

    const currentTask = taskRows[0];
    const assigneeIds = await getAssigneeIds(id);

    // Authorization check
    // admin/super_admin can send to any task
    // staff can only send to assigned tasks
    if (req.user.role === "staff") {
      const hasAccess =
        assigneeIds.includes(req.user.id) || currentTask.assigned_to === req.user.id;

      if (!hasAccess) {
        return res.status(403).json({
          success: false,
          message: "Access denied",
        });
      }
    }

    // Insert message
    const [result] = await pool.query(
      `
        INSERT INTO task_messages (task_id, user_id, message)
        VALUES (?, ?, ?)
      `,
      [id, req.user.id, message.trim()]
    );

    // Get inserted message with user details
    const [messageRows] = await pool.query(
      `
        SELECT 
          tm.id,
          tm.task_id,
          tm.user_id,
          u.name AS user_name,
          u.role AS user_role,
          tm.message,
          tm.created_at
        FROM task_messages tm
        INNER JOIN users u ON u.id = tm.user_id
        WHERE tm.id = ?
      `,
      [result.insertId]
    );

    if (!messageRows.length) {
      return res.status(500).json({
        success: false,
        message: "Server error",
      });
    }

    const insertedMessage = messageRows[0];

    return res.status(201).json({
      success: true,
      message: "Task message sent successfully",
      data: {
        id: insertedMessage.id,
        task_id: insertedMessage.task_id,
        user_id: insertedMessage.user_id,
        user_name: insertedMessage.user_name,
        user_role: insertedMessage.user_role,
        message: insertedMessage.message,
        created_at: insertedMessage.created_at,
      },
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

// GET TASK MESSAGES/REPLIES
export const getTaskMessages = async (req, res) => {
  try {
    const { id } = req.params;

    // Check task exists
    const [taskRows] = await pool.query("SELECT * FROM tasks WHERE id = ?", [id]);

    if (!taskRows.length) {
      return res.status(404).json({
        success: false,
        message: "Task not found",
      });
    }

    const currentTask = taskRows[0];
    const assigneeIds = await getAssigneeIds(id);

    // Authorization check
    // admin/super_admin can view all messages
    // staff can only view assigned task messages
    if (req.user.role === "staff") {
      const hasAccess =
        assigneeIds.includes(req.user.id) || currentTask.assigned_to === req.user.id;

      if (!hasAccess) {
        return res.status(403).json({
          success: false,
          message: "Access denied",
        });
      }
    }

    // Get messages ordered by created_at ASC
    const [messages] = await pool.query(
      `
        SELECT 
          tm.id,
          tm.task_id,
          tm.user_id,
          u.name AS user_name,
          u.role AS user_role,
          tm.message,
          tm.created_at
        FROM task_messages tm
        INNER JOIN users u ON u.id = tm.user_id
        WHERE tm.task_id = ?
        ORDER BY tm.created_at ASC
      `,
      [id]
    );

    return res.status(200).json({
      success: true,
      messages: messages.map((msg) => ({
        id: msg.id,
        task_id: msg.task_id,
        user_id: msg.user_id,
        user_name: msg.user_name,
        user_role: msg.user_role,
        message: msg.message,
        created_at: msg.created_at,
      })),
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};
