import PDFDocument from "pdfkit";

import pool from "../../config/db.js";
import {
  VALID_STATUSES,
  formatSeconds,
  isLateLogin,
  recalculateAttendance,
  getTodayAttendanceRow,
  enrichAttendanceRows,
  buildDateFilter,
  computeSummaryFromRows,
  buildTrendAnalytics,
  buildMonthlyReport,
  reportToCsv,
  HALF_DAY_THRESHOLD_SECONDS,
} from "../../services/attendanceService.js";

const SESSION_TYPES = ["break", "lunch", "permission"];

const mapSessionColumn = {
  break: { start: "break_start", end: "break_end" },
  lunch: { start: "lunch_start", end: "lunch_end" },
};

// LOGIN ATTENDANCE
export const markLogin = async (req, res) => {
  try {
    const userId = req.user.id;
    const existing = await getTodayAttendanceRow(userId);

    if (existing) {
      return res.status(400).json({
        success: false,
        message: "Attendance already marked today",
      });
    }

    let status = isLateLogin(new Date()) ? "late" : "present";

    await pool.query(
      `
        INSERT INTO attendance
        (user_id, login_time, attendance_date, status, break_seconds, lunch_seconds, permission_seconds)
        VALUES (?, NOW(), CURDATE(), ?, 0, 0, 0)
      `,
      [userId, status]
    );

    res.json({
      success: true,
      message: "Login attendance marked",
      status,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

// LOGOUT ATTENDANCE
export const markLogout = async (req, res) => {
  try {
    const userId = req.user.id;
    const attendance = await getTodayAttendanceRow(userId);

    if (!attendance) {
      return res.status(400).json({
        success: false,
        message: "Login attendance not found",
      });
    }

    if (attendance.logout_time) {
      return res.status(400).json({
        success: false,
        message: "Logout already marked",
      });
    }

    const [openSessions] = await pool.query(
      `
        SELECT id, type FROM attendance_sessions
        WHERE attendance_id = ? AND end_time IS NULL
      `,
      [attendance.id]
    );

    for (const session of openSessions) {
      await endSessionById(session.id, userId);
    }

    await pool.query(
      "UPDATE attendance SET logout_time = NOW() WHERE id = ?",
      [attendance.id]
    );

    const updated = await recalculateAttendance(attendance.id);

    res.json({
      success: true,
      message: "Logout attendance marked",
      totalHours: updated?.total_hours,
      netWorkHours: updated?.net_work_hours,
      status: updated?.status,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

const endSessionById = async (sessionId, userId) => {
  const [rows] = await pool.query(
    "SELECT * FROM attendance_sessions WHERE id = ?",
    [sessionId]
  );

  if (!rows.length || rows[0].end_time) return;

  const session = rows[0];
  const endTime = new Date();
  const startTime = new Date(session.start_time);
  const durationSeconds = Math.max(
    0,
    Math.floor((endTime - startTime) / 1000)
  );

  await pool.query(
    `
      UPDATE attendance_sessions
      SET end_time = NOW(), duration_seconds = ?
      WHERE id = ?
    `,
    [durationSeconds, sessionId]
  );

  const cols = mapSessionColumn[session.type];
  if (cols) {
    await pool.query(
      `UPDATE attendance SET ${cols.end} = NOW() WHERE id = ?`,
      [session.attendance_id]
    );
  }

  await recalculateAttendance(session.attendance_id);
};

const startSession = async (req, res, type) => {
  try {
    const userId = req.user.id;
    const attendance = await getTodayAttendanceRow(userId);

    if (!attendance || !attendance.login_time) {
      return res.status(400).json({
        success: false,
        message: "Mark login attendance first",
      });
    }

    if (attendance.logout_time) {
      return res.status(400).json({
        success: false,
        message: "Cannot start session after logout",
      });
    }

    const [openSame] = await pool.query(
      `
        SELECT id FROM attendance_sessions
        WHERE attendance_id = ? AND type = ? AND end_time IS NULL
        LIMIT 1
      `,
      [attendance.id, type]
    );

    if (openSame.length) {
      return res.status(400).json({
        success: false,
        message: `Active ${type} session already running`,
      });
    }

    const [openAny] = await pool.query(
      `
        SELECT id, type FROM attendance_sessions
        WHERE attendance_id = ? AND end_time IS NULL
        LIMIT 1
      `,
      [attendance.id]
    );

    if (openAny.length) {
      return res.status(400).json({
        success: false,
        message: `Please end active ${openAny[0].type} session first`,
      });
    }

    await pool.query(
      `
        INSERT INTO attendance_sessions
        (attendance_id, user_id, type, start_time)
        VALUES (?, ?, ?, NOW())
      `,
      [attendance.id, userId, type]
    );

    const cols = mapSessionColumn[type];
    if (cols) {
      await pool.query(
        `UPDATE attendance SET ${cols.start} = NOW() WHERE id = ?`,
        [attendance.id]
      );
    }

    const [active] = await pool.query(
      `
        SELECT * FROM attendance_sessions
        WHERE attendance_id = ? AND type = ? AND end_time IS NULL
        ORDER BY id DESC LIMIT 1
      `,
      [attendance.id, type]
    );

    res.json({
      success: true,
      message: `${type} started`,
      session: active[0],
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

const endSession = async (req, res, type) => {
  try {
    const userId = req.user.id;
    const attendance = await getTodayAttendanceRow(userId);

    if (!attendance) {
      return res.status(400).json({
        success: false,
        message: "No attendance record for today",
      });
    }

    const [open] = await pool.query(
      `
        SELECT id FROM attendance_sessions
        WHERE attendance_id = ? AND type = ? AND end_time IS NULL
        ORDER BY id DESC LIMIT 1
      `,
      [attendance.id, type]
    );

    if (!open.length) {
      return res.status(400).json({
        success: false,
        message: `No active ${type} session found`,
      });
    }

    await endSessionById(open[0].id, userId);
    const updated = await recalculateAttendance(attendance.id);

    res.json({
      success: true,
      message: `${type} ended`,
      attendance: updated,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

export const startBreak = (req, res) => startSession(req, res, "break");
export const endBreak = (req, res) => endSession(req, res, "break");
export const startLunch = (req, res) => startSession(req, res, "lunch");
export const endLunch = (req, res) => endSession(req, res, "lunch");
export const startPermission = (req, res) => startSession(req, res, "permission");
export const endPermission = (req, res) => endSession(req, res, "permission");

export const getActiveSessions = async (req, res) => {
  try {
    const attendance = await getTodayAttendanceRow(req.user.id);

    if (!attendance) {
      return res.json({ success: true, active: null, attendance: null });
    }

    const [open] = await pool.query(
      `
        SELECT * FROM attendance_sessions
        WHERE attendance_id = ? AND end_time IS NULL
        ORDER BY id DESC LIMIT 1
      `,
      [attendance.id]
    );

    res.json({
      success: true,
      attendance,
      active: open[0] || null,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

const fetchAttendanceList = async (req, targetUserId = null) => {
  const { from_date, to_date } = req.query;
  const conditions = [];
  const params = [];

  if (targetUserId) {
    conditions.push("a.user_id = ?");
    params.push(targetUserId);
  } else if (req.user.role === "staff" || req.user.role === "admin") {
    conditions.push("a.user_id = ?");
    params.push(req.user.id);
  }

  const dateFilter = buildDateFilter(from_date, to_date, "a");
  conditions.push(...dateFilter.conditions);
  params.push(...dateFilter.params);

  const whereClause = conditions.length
    ? `WHERE ${conditions.join(" AND ")}`
    : "";

  const [rows] = await pool.query(
    `
      SELECT a.*, u.name, u.email, u.role,
        updater.name AS updated_by_name
      FROM attendance a
      JOIN users u ON u.id = a.user_id
      LEFT JOIN users updater ON updater.id = a.updated_by
      ${whereClause}
      ORDER BY COALESCE(a.attendance_date, DATE(a.login_time), DATE(a.created_at)) DESC, a.id DESC
    `,
    params
  );

  return enrichAttendanceRows(rows);
};

// GET MY ATTENDANCE
export const getMyAttendance = async (req, res) => {
  try {
    const data = await fetchAttendanceList(req, req.user.id);
    const summary = computeSummaryFromRows(data);
    const today = await getTodayAttendanceRow(req.user.id);

    let activeSession = null;
    if (today) {
      const [open] = await pool.query(
        `
          SELECT * FROM attendance_sessions
          WHERE attendance_id = ? AND end_time IS NULL
          ORDER BY id DESC LIMIT 1
        `,
        [today.id]
      );
      activeSession = open[0] || null;
    }

    res.json({
      success: true,
      data,
      summary,
      today,
      activeSession,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

// GET ALL ATTENDANCE (super_admin)
export const getAllAttendance = async (req, res) => {
  try {
    const { user_id, from_date, to_date } = req.query;
    const conditions = [];
    const params = [];

    if (user_id) {
      conditions.push("a.user_id = ?");
      params.push(Number(user_id));
    }

    const dateFilter = buildDateFilter(from_date, to_date, "a");
    conditions.push(...dateFilter.conditions);
    params.push(...dateFilter.params);

    const whereClause = conditions.length
      ? `WHERE ${conditions.join(" AND ")}`
      : "";

    const [rows] = await pool.query(
      `
        SELECT a.*, u.name, u.email, u.role,
          updater.name AS updated_by_name
        FROM attendance a
        JOIN users u ON u.id = a.user_id
        LEFT JOIN users updater ON updater.id = a.updated_by
        ${whereClause}
        ORDER BY COALESCE(a.attendance_date, DATE(a.login_time), DATE(a.created_at)) DESC, a.id DESC
      `,
      params
    );

    const data = await enrichAttendanceRows(rows);
    const summary = computeSummaryFromRows(data);

    res.json({ success: true, data, summary });
  } catch (error) {
    console.log(error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

// GET SUMMARY
export const getAttendanceSummary = async (req, res) => {
  try {
    const {
      user_id,
      from_date,
      to_date,
      range = "day",
    } = req.query;

    const conditions = [];
    const params = [];

    if (req.user.role === "super_admin") {
      if (user_id) {
        conditions.push("a.user_id = ?");
        params.push(Number(user_id));
      }
    } else {
      if (user_id && Number(user_id) !== req.user.id) {
        return res.status(403).json({
          success: false,
          message: "Access denied",
        });
      }
      conditions.push("a.user_id = ?");
      params.push(req.user.id);
    }

    const dateFilter = buildDateFilter(from_date, to_date, "a");
    conditions.push(...dateFilter.conditions);
    params.push(...dateFilter.params);

    const whereClause = conditions.length
      ? `WHERE ${conditions.join(" AND ")}`
      : "";

    const [rows] = await pool.query(
      `
        SELECT a.* FROM attendance a
        ${whereClause}
        ORDER BY COALESCE(a.attendance_date, DATE(a.login_time)) ASC
      `,
      params
    );

    const enriched = await enrichAttendanceRows(rows);
    const summary = computeSummaryFromRows(enriched);
    const trends = buildTrendAnalytics(enriched, range);

    res.json({
      success: true,
      summary,
      trends,
      range,
      user_id: user_id ? Number(user_id) : null,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

// PUT UPDATE ATTENDANCE (super_admin)
export const updateAttendance = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      login_time,
      logout_time,
      break_seconds,
      lunch_seconds,
      permission_seconds,
      status,
    } = req.body;

    const [rows] = await pool.query("SELECT * FROM attendance WHERE id = ?", [id]);

    if (!rows.length) {
      return res.status(404).json({
        success: false,
        message: "Attendance not found",
      });
    }

    const updates = [];
    const params = [];

    if (login_time !== undefined) {
      updates.push("login_time = ?");
      params.push(login_time);
    }
    if (logout_time !== undefined) {
      updates.push("logout_time = ?");
      params.push(logout_time || null);
    }
    if (break_seconds !== undefined) {
      updates.push("break_seconds = ?");
      params.push(Number(break_seconds) || 0);
    }
    if (lunch_seconds !== undefined) {
      updates.push("lunch_seconds = ?");
      params.push(Number(lunch_seconds) || 0);
    }
    if (permission_seconds !== undefined) {
      updates.push("permission_seconds = ?");
      params.push(Number(permission_seconds) || 0);
    }
    if (status && VALID_STATUSES.includes(status)) {
      updates.push("status = ?");
      params.push(status);
    }

    updates.push("updated_by = ?");
    updates.push("updated_at = NOW()");
    params.push(req.user.id);

    await pool.query(
      `UPDATE attendance SET ${updates.join(", ")} WHERE id = ?`,
      [...params, id]
    );

    const preserveManualStatus = Boolean(status);
    const updated = await recalculateAttendance(id, { preserveManualStatus });

    if (status && VALID_STATUSES.includes(status)) {
      await pool.query("UPDATE attendance SET status = ? WHERE id = ?", [
        status,
        id,
      ]);
    }

    const [final] = await pool.query(
      `
        SELECT a.*, u.name, u.email, updater.name AS updated_by_name
        FROM attendance a
        JOIN users u ON u.id = a.user_id
        LEFT JOIN users updater ON updater.id = a.updated_by
        WHERE a.id = ?
      `,
      [id]
    );

    const [enriched] = await enrichAttendanceRows(final);

    res.json({
      success: true,
      message: "Attendance updated",
      data: enriched,
      preview: {
        gross_seconds: updated?.total_seconds,
        net_seconds: updated?.net_work_seconds,
        gross_hours: updated?.total_hours,
        net_hours: updated?.net_work_hours,
        half_day_threshold: formatSeconds(HALF_DAY_THRESHOLD_SECONDS),
      },
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

// GET REPORT JSON
export const getAttendanceReport = async (req, res) => {
  try {
    const {
      user_id,
      month = new Date().getMonth() + 1,
      year = new Date().getFullYear(),
      format = "json",
    } = req.query;

    let targetUserId = req.user.id;

    if (req.user.role === "super_admin" && user_id) {
      targetUserId = Number(user_id);
    } else if (
      user_id &&
      Number(user_id) !== req.user.id &&
      req.user.role !== "super_admin"
    ) {
      return res.status(403).json({ success: false, message: "Access denied" });
    }

    const report = await buildMonthlyReport(
      targetUserId,
      Number(month),
      Number(year)
    );

    if (!report) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    if (format === "csv") {
      res.setHeader("Content-Type", "text/csv");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="attendance-${targetUserId}-${year}-${month}.csv"`
      );
      return res.send(reportToCsv(report));
    }

    res.json({ success: true, report });
  } catch (error) {
    console.log(error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

// DOWNLOAD REPORT (super_admin)
export const downloadAttendanceReport = async (req, res) => {
  try {
    const {
      user_id,
      month = new Date().getMonth() + 1,
      year = new Date().getFullYear(),
      format = "csv",
    } = req.query;

    if (!user_id) {
      return res.status(400).json({
        success: false,
        message: "user_id is required",
      });
    }

    const report = await buildMonthlyReport(
      Number(user_id),
      Number(month),
      Number(year)
    );

    if (!report) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const filename = `attendance-${report.user.name.replace(/\s+/g, "_")}-${year}-${month}`;

    if (format === "pdf") {
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${filename}.pdf"`
      );

      const doc = new PDFDocument({ margin: 40 });
      doc.pipe(res);

      doc.fontSize(18).text("Monthly Attendance Report", { align: "center" });
      doc.moveDown();
      doc.fontSize(12).text(`Name: ${report.user.name}`);
      doc.text(`Email: ${report.user.email}`);
      doc.text(`Period: ${report.period.fromDate} to ${report.period.toDate}`);
      doc.moveDown();

      doc.fontSize(11).text(
        `Working Days: ${report.summary.total_working_days} | Leave: ${report.summary.total_leave_days} | Late: ${report.summary.late_count} | Half-day: ${report.summary.half_day_count}`
      );
      doc.text(`Net Monthly Hours: ${report.summary.total_monthly_working_hours}`);
      doc.moveDown();

      doc.fontSize(10);
      for (const day of report.daily) {
        doc.text(
          `${day.date || "-"} | In: ${day.login_time ? new Date(day.login_time).toLocaleTimeString() : "-"} | Out: ${day.logout_time ? new Date(day.logout_time).toLocaleTimeString() : "-"} | Net: ${day.net_working_time} | ${day.status}`
        );
      }

      doc.end();
      return;
    }

    res.setHeader("Content-Type", "text/csv");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${filename}.csv"`
    );
    res.send(reportToCsv(report));
  } catch (error) {
    console.log(error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

// Legacy admin helpers (backward compatible)
export const getTodayAttendance = async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT a.*, u.name, u.email
      FROM attendance a
      JOIN users u ON a.user_id = u.id
      WHERE COALESCE(a.attendance_date, DATE(a.created_at)) = CURDATE()
      ORDER BY a.created_at DESC
    `);
    const data = await enrichAttendanceRows(rows);
    res.json({ success: true, data });
  } catch (error) {
    console.log(error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

export const getLateAttendance = async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT a.*, u.name, u.email
      FROM attendance a
      JOIN users u ON a.user_id = u.id
      WHERE a.status = 'late'
      ORDER BY a.created_at DESC
    `);
    const data = await enrichAttendanceRows(rows);
    res.json({ success: true, data });
  } catch (error) {
    console.log(error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};
