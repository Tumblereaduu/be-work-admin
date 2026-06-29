/**
 * Run once: adds attendance columns, sessions table, extends status enum.
 * Usage: node scripts/migrate-attendance-advanced.js
 */
import pool from "../src/config/db.js";

const run = async () => {
  const alters = [
    "ALTER TABLE attendance ADD COLUMN attendance_date DATE NULL",
    "ALTER TABLE attendance ADD COLUMN break_start DATETIME NULL",
    "ALTER TABLE attendance ADD COLUMN break_end DATETIME NULL",
    "ALTER TABLE attendance ADD COLUMN lunch_start DATETIME NULL",
    "ALTER TABLE attendance ADD COLUMN lunch_end DATETIME NULL",
    "ALTER TABLE attendance ADD COLUMN break_seconds INT DEFAULT 0",
    "ALTER TABLE attendance ADD COLUMN lunch_seconds INT DEFAULT 0",
    "ALTER TABLE attendance ADD COLUMN permission_seconds INT DEFAULT 0",
    "ALTER TABLE attendance ADD COLUMN total_seconds INT DEFAULT 0",
    "ALTER TABLE attendance ADD COLUMN net_work_seconds INT DEFAULT 0",
    "ALTER TABLE attendance ADD COLUMN net_work_hours VARCHAR(50) NULL",
    "ALTER TABLE attendance ADD COLUMN updated_by INT NULL",
    "ALTER TABLE attendance ADD COLUMN updated_at DATETIME NULL",
  ];

  for (const sql of alters) {
    try {
      await pool.query(sql);
      console.log("OK:", sql.slice(0, 60) + "...");
    } catch (e) {
      console.log("skip:", e.sqlMessage || e.message);
    }
  }

  try {
    await pool.query(`
      UPDATE attendance
      SET attendance_date = DATE(COALESCE(login_time, created_at))
      WHERE attendance_date IS NULL
    `);
    console.log("backfilled attendance_date");
  } catch (e) {
    console.log("backfill date:", e.sqlMessage || e.message);
  }

  try {
    await pool.query(`
      ALTER TABLE attendance
      MODIFY status ENUM('present','late','half-day','absent','leave','permission')
      DEFAULT 'present'
    `);
    console.log("status enum extended");
  } catch (e) {
    console.log("status enum:", e.sqlMessage || e.message);
  }

  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS attendance_sessions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        attendance_id INT NOT NULL,
        user_id INT NOT NULL,
        type ENUM('break','lunch','permission') NOT NULL,
        start_time DATETIME NOT NULL,
        end_time DATETIME NULL,
        duration_seconds INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (attendance_id) REFERENCES attendance(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        INDEX idx_attendance_open (attendance_id, end_time)
      )
    `);
    console.log("attendance_sessions ready");
  } catch (e) {
    console.log("sessions table:", e.sqlMessage || e.message);
  }

  process.exit(0);
};

run();
