import pool from "../config/db.js";

export const COMPANY_START_HOUR = Number(process.env.COMPANY_START_HOUR) || 9;
export const COMPANY_START_MINUTE = Number(process.env.COMPANY_START_MINUTE) || 15;
export const MIN_FULL_DAY_SECONDS =
  Number(process.env.MIN_FULL_DAY_HOURS || 8) * 3600;
export const HALF_DAY_THRESHOLD_SECONDS =
  Number(process.env.HALF_DAY_HOURS || 4) * 3600;

export const VALID_STATUSES = [
  "present",
  "late",
  "half-day",
  "absent",
  "leave",
  "permission",
];

export const formatSeconds = (seconds) => {
  const safe = Math.max(0, Math.floor(Number(seconds) || 0));
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  return `${hours}h ${minutes}m`;
};

export const isLateLogin = (loginTime) => {
  const date = new Date(loginTime);
  const thresholdMinutes = COMPANY_START_HOUR * 60 + COMPANY_START_MINUTE;
  const loginMinutes = date.getHours() * 60 + date.getMinutes();
  return loginMinutes > thresholdMinutes;
};

export const recalculateAttendance = async (attendanceId, options = {}) => {
  const { preserveManualStatus = false } = options;

  const [rows] = await pool.query("SELECT * FROM attendance WHERE id = ?", [
    attendanceId,
  ]);

  if (!rows.length) return null;

  const record = rows[0];

  const [sessions] = await pool.query(
    `
      SELECT type, COALESCE(SUM(duration_seconds), 0) AS total_seconds
      FROM attendance_sessions
      WHERE attendance_id = ? AND end_time IS NOT NULL
      GROUP BY type
    `,
    [attendanceId]
  );

  const sessionTotals = { break: 0, lunch: 0, permission: 0 };
  for (const row of sessions) {
    sessionTotals[row.type] = Number(row.total_seconds) || 0;
  }

  const breakSeconds = sessionTotals.break;
  const lunchSeconds = sessionTotals.lunch;
  const permissionSeconds = sessionTotals.permission;

  let totalSeconds = 0;
  let netWorkSeconds = 0;

  if (record.login_time && record.logout_time) {
    const loginMs = new Date(record.login_time).getTime();
    const logoutMs = new Date(record.logout_time).getTime();
    totalSeconds = Math.max(0, Math.floor((logoutMs - loginMs) / 1000));
    netWorkSeconds = Math.max(
      0,
      totalSeconds - breakSeconds - lunchSeconds - permissionSeconds
    );
  }

  let status = record.status || "present";

  if (!preserveManualStatus || !["leave", "absent", "permission"].includes(status)) {
    if (record.login_time) {
      if (isLateLogin(record.login_time)) {
        status = "late";
      } else if (status !== "leave" && status !== "absent") {
        status = "present";
      }
    }

    if (record.logout_time && netWorkSeconds > 0) {
      if (
        netWorkSeconds < MIN_FULL_DAY_SECONDS &&
        !["leave", "absent", "permission"].includes(status)
      ) {
        status = "half-day";
      } else if (netWorkSeconds < HALF_DAY_THRESHOLD_SECONDS) {
        status = "half-day";
      } else if (status === "late") {
        status = "late";
      } else if (!["leave", "absent", "permission"].includes(status)) {
        status = "present";
      }
    }
  }

  const totalHours = record.logout_time ? formatSeconds(totalSeconds) : record.total_hours;
  const netWorkHours = record.logout_time
    ? formatSeconds(netWorkSeconds)
    : record.net_work_hours;

  await pool.query(
    `
      UPDATE attendance SET
        break_seconds = ?,
        lunch_seconds = ?,
        permission_seconds = ?,
        total_seconds = ?,
        net_work_seconds = ?,
        total_hours = ?,
        net_work_hours = ?,
        status = ?,
        attendance_date = COALESCE(attendance_date, DATE(COALESCE(login_time, created_at)))
      WHERE id = ?
    `,
    [
      breakSeconds,
      lunchSeconds,
      permissionSeconds,
      totalSeconds,
      netWorkSeconds,
      totalHours,
      netWorkHours,
      status,
      attendanceId,
    ]
  );

  const [updated] = await pool.query("SELECT * FROM attendance WHERE id = ?", [
    attendanceId,
  ]);

  return updated[0];
};

export const getTodayAttendanceRow = async (userId) => {
  const [rows] = await pool.query(
    `
      SELECT * FROM attendance
      WHERE user_id = ?
        AND (
          attendance_date = CURDATE()
          OR DATE(COALESCE(login_time, created_at)) = CURDATE()
        )
      ORDER BY id DESC
      LIMIT 1
    `,
    [userId]
  );
  return rows[0] || null;
};

export const attachSessionsToRecords = async (records) => {
  if (!records.length) return records;

  const ids = records.map((r) => r.id);
  const placeholders = ids.map(() => "?").join(", ");

  const [sessions] = await pool.query(
    `
      SELECT * FROM attendance_sessions
      WHERE attendance_id IN (${placeholders})
      ORDER BY start_time ASC
    `,
    ids
  );

  const [counts] = await pool.query(
    `
      SELECT attendance_id, type, COUNT(*) AS session_count
      FROM attendance_sessions
      WHERE attendance_id IN (${placeholders}) AND end_time IS NOT NULL
      GROUP BY attendance_id, type
    `,
    ids
  );

  const sessionsByAttendance = {};
  const countsByAttendance = {};

  for (const session of sessions) {
    if (!sessionsByAttendance[session.attendance_id]) {
      sessionsByAttendance[session.attendance_id] = [];
    }
    sessionsByAttendance[session.attendance_id].push(session);
  }

  for (const row of counts) {
    if (!countsByAttendance[row.attendance_id]) {
      countsByAttendance[row.attendance_id] = { break: 0, lunch: 0, permission: 0 };
    }
    countsByAttendance[row.attendance_id][row.type] = row.session_count;
  }

  return records.map((record) => ({
    ...record,
    sessions: sessionsByAttendance[record.id] || [],
    break_count: countsByAttendance[record.id]?.break || 0,
    lunch_count: countsByAttendance[record.id]?.lunch || 0,
    permission_count: countsByAttendance[record.id]?.permission || 0,
    gross_hours: formatSeconds(record.total_seconds),
    net_hours: formatSeconds(record.net_work_seconds),
    break_time: formatSeconds(record.break_seconds),
    lunch_time: formatSeconds(record.lunch_seconds),
    permission_time: formatSeconds(record.permission_seconds),
  }));
};

export const enrichAttendanceRows = async (rows) => {
  const withSessions = await attachSessionsToRecords(rows);

  const updaterIds = [
    ...new Set(withSessions.map((r) => r.updated_by).filter(Boolean)),
  ];

  if (!updaterIds.length) return withSessions;

  const placeholders = updaterIds.map(() => "?").join(", ");
  const [users] = await pool.query(
    `SELECT id, name FROM users WHERE id IN (${placeholders})`,
    updaterIds
  );

  const nameMap = Object.fromEntries(users.map((u) => [u.id, u.name]));

  return withSessions.map((row) => ({
    ...row,
    updated_by_name: row.updated_by ? nameMap[row.updated_by] || null : null,
  }));
};

export const buildDateFilter = (fromDate, toDate, alias = "a") => {
  const conditions = [];
  const params = [];

  if (fromDate) {
    conditions.push(
      `COALESCE(${alias}.attendance_date, DATE(${alias}.login_time), DATE(${alias}.created_at)) >= ?`
    );
    params.push(fromDate);
  }

  if (toDate) {
    conditions.push(
      `COALESCE(${alias}.attendance_date, DATE(${alias}.login_time), DATE(${alias}.created_at)) <= ?`
    );
    params.push(toDate);
  }

  return { conditions, params };
};

export const computeSummaryFromRows = (rows) => {
  const summary = {
    total_working_hours: "0h 0m",
    net_working_hours: "0h 0m",
    total_working_seconds: 0,
    net_working_seconds: 0,
    late_count: 0,
    half_day_count: 0,
    leave_count: 0,
    permission_count: 0,
    working_days: 0,
    absent_days: 0,
    break_total: "0h 0m",
    lunch_total: "0h 0m",
    permission_total: "0h 0m",
    break_total_seconds: 0,
    lunch_total_seconds: 0,
    permission_total_seconds: 0,
    completed_days: 0,
  };

  let totalSeconds = 0;
  let netSeconds = 0;
  let breakSeconds = 0;
  let lunchSeconds = 0;
  let permissionSeconds = 0;

  for (const row of rows) {
    totalSeconds += Number(row.total_seconds) || 0;
    netSeconds += Number(row.net_work_seconds) || 0;
    breakSeconds += Number(row.break_seconds) || 0;
    lunchSeconds += Number(row.lunch_seconds) || 0;
    permissionSeconds += Number(row.permission_seconds) || 0;

    if (row.status === "late") summary.late_count += 1;
    if (row.status === "half-day") summary.half_day_count += 1;
    if (row.status === "leave") summary.leave_count += 1;
    if (row.status === "permission") summary.permission_count += 1;
    if (row.status === "absent") summary.absent_days += 1;

    if (!["absent", "leave"].includes(row.status) && row.login_time) {
      summary.working_days += 1;
    }

    if (row.logout_time) summary.completed_days += 1;
  }

  summary.total_working_seconds = totalSeconds;
  summary.net_working_seconds = netSeconds;
  summary.break_total_seconds = breakSeconds;
  summary.lunch_total_seconds = lunchSeconds;
  summary.permission_total_seconds = permissionSeconds;
  summary.total_working_hours = formatSeconds(totalSeconds);
  summary.net_working_hours = formatSeconds(netSeconds);
  summary.break_total = formatSeconds(breakSeconds);
  summary.lunch_total = formatSeconds(lunchSeconds);
  summary.permission_total = formatSeconds(permissionSeconds);

  return summary;
};

export const buildTrendAnalytics = (rows, range = "day") => {
  const buckets = {};

  for (const row of rows) {
    const dateKey =
      row.attendance_date ||
      (row.login_time
        ? new Date(row.login_time).toISOString().slice(0, 10)
        : new Date(row.created_at).toISOString().slice(0, 10));

    let bucketKey = dateKey;

    if (range === "week") {
      const d = new Date(dateKey);
      const day = d.getDay();
      const diff = d.getDate() - day + (day === 0 ? -6 : 1);
      const monday = new Date(d.setDate(diff));
      bucketKey = monday.toISOString().slice(0, 10);
    } else if (range === "month") {
      bucketKey = dateKey.slice(0, 7);
    }

    if (!buckets[bucketKey]) {
      buckets[bucketKey] = {
        label: bucketKey,
        gross_seconds: 0,
        net_seconds: 0,
        late: 0,
        half_day: 0,
        leave: 0,
        working_days: 0,
      };
    }

    buckets[bucketKey].gross_seconds += Number(row.total_seconds) || 0;
    buckets[bucketKey].net_seconds += Number(row.net_work_seconds) || 0;
    if (row.status === "late") buckets[bucketKey].late += 1;
    if (row.status === "half-day") buckets[bucketKey].half_day += 1;
    if (row.status === "leave") buckets[bucketKey].leave += 1;
    if (!["absent", "leave"].includes(row.status) && row.login_time) {
      buckets[bucketKey].working_days += 1;
    }
  }

  return Object.values(buckets)
    .sort((a, b) => a.label.localeCompare(b.label))
    .map((bucket) => ({
      ...bucket,
      gross_hours: formatSeconds(bucket.gross_seconds),
      net_hours: formatSeconds(bucket.net_seconds),
    }));
};

export const buildMonthlyReport = async (userId, month, year) => {
  const [users] = await pool.query(
    "SELECT id, name, email, role FROM users WHERE id = ?",
    [userId]
  );

  if (!users.length) {
    return null;
  }

  const fromDate = `${year}-${String(month).padStart(2, "0")}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const toDate = `${year}-${String(month).padStart(2, "0")}-${lastDay}`;

  const [rows] = await pool.query(
    `
      SELECT a.*, u.name, u.email
      FROM attendance a
      JOIN users u ON u.id = a.user_id
      WHERE a.user_id = ?
        AND COALESCE(a.attendance_date, DATE(a.login_time), DATE(a.created_at)) BETWEEN ? AND ?
      ORDER BY COALESCE(a.attendance_date, DATE(a.login_time)) ASC
    `,
    [userId, fromDate, toDate]
  );

  const enriched = await enrichAttendanceRows(rows);
  const summary = computeSummaryFromRows(enriched);

  const daily = enriched.map((row) => ({
    date: row.attendance_date || row.login_time?.toISOString?.()?.slice(0, 10),
    login_time: row.login_time,
    logout_time: row.logout_time,
    break_count: row.break_count,
    break_duration: row.break_time,
    lunch_count: row.lunch_count,
    lunch_duration: row.lunch_time,
    permission_duration: row.permission_time,
    gross_working_time: row.gross_hours || row.total_hours,
    net_working_time: row.net_hours || row.net_work_hours,
    status: row.status,
    late: row.status === "late",
    half_day: row.status === "half-day",
    leave: row.status === "leave",
  }));

  return {
    user: users[0],
    period: { month: Number(month), year: Number(year), fromDate, toDate },
    summary: {
      ...summary,
      total_working_days: summary.working_days,
      total_leave_days: summary.leave_count,
      total_monthly_working_hours: summary.net_working_hours,
    },
    daily,
    records: enriched,
  };
};

export const reportToCsv = (report) => {
  const lines = [
    `Attendance Report - ${report.user.name}`,
    `Email,${report.user.email}`,
    `Period,${report.period.fromDate} to ${report.period.toDate}`,
    "",
    "Date,Login,Logout,Break Count,Break Duration,Lunch Count,Lunch Duration,Permission,Gross Hours,Net Hours,Status",
  ];

  for (const day of report.daily) {
    lines.push(
      [
        day.date || "",
        day.login_time ? new Date(day.login_time).toLocaleString() : "",
        day.logout_time ? new Date(day.logout_time).toLocaleString() : "",
        day.break_count,
        day.break_duration,
        day.lunch_count,
        day.lunch_duration,
        day.permission_duration,
        day.gross_working_time,
        day.net_working_time,
        day.status,
      ]
        .map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`)
        .join(",")
    );
  }

  lines.push("");
  lines.push(`Total Working Days,${report.summary.total_working_days}`);
  lines.push(`Total Leave Days,${report.summary.total_leave_days}`);
  lines.push(`Late Count,${report.summary.late_count}`);
  lines.push(`Half Day Count,${report.summary.half_day_count}`);
  lines.push(`Monthly Net Hours,${report.summary.total_monthly_working_hours}`);

  return lines.join("\n");
};
