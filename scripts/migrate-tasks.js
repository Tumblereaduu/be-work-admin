import pool from "../src/config/db.js";

const run = async () => {
  try {
    await pool.query(
      "ALTER TABLE tasks ADD COLUMN priority ENUM('low', 'medium', 'high') DEFAULT 'medium' AFTER status"
    );
    console.log("priority column added");
  } catch (error) {
    console.log("priority:", error.sqlMessage || error.message);
  }

  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS task_assignees (
        id INT AUTO_INCREMENT PRIMARY KEY,
        task_id INT NOT NULL,
        user_id INT NOT NULL,
        assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY unique_task_user (task_id, user_id),
        FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);
    console.log("task_assignees table ready");
  } catch (error) {
    console.log("task_assignees:", error.sqlMessage || error.message);
  }

  try {
    const [result] = await pool.query(`
      INSERT IGNORE INTO task_assignees (task_id, user_id)
      SELECT id, assigned_to
      FROM tasks
      WHERE assigned_to IS NOT NULL
    `);
    console.log("migrated assignees:", result.affectedRows);
  } catch (error) {
    console.log("migrate assignees:", error.sqlMessage || error.message);
  }

  process.exit(0);
};

run();
