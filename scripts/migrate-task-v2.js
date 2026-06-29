import pool from "../src/config/db.js";

const run = async () => {
  try {
    await pool.query(
      "ALTER TABLE tasks ADD COLUMN updated_by INT NULL AFTER assigned_by"
    );
    console.log("updated_by added");
  } catch (error) {
    console.log("updated_by:", error.sqlMessage || error.message);
  }

  try {
    await pool.query(
      "ALTER TABLE tasks ADD COLUMN updated_at DATETIME NULL AFTER updated_by"
    );
    console.log("updated_at added");
  } catch (error) {
    console.log("updated_at:", error.sqlMessage || error.message);
  }

  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS task_attachments (
        id INT AUTO_INCREMENT PRIMARY KEY,
        task_id INT NOT NULL,
        file_url TEXT NOT NULL,
        file_name VARCHAR(255) NULL,
        file_mime VARCHAR(100) NULL,
        file_size INT NULL,
        uploaded_by INT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
        FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE SET NULL
      )
    `);
    console.log("task_attachments ready");
  } catch (error) {
    console.log("task_attachments:", error.sqlMessage || error.message);
  }

  try {
    const [result] = await pool.query(`
      INSERT INTO task_attachments (task_id, file_url, file_name, file_mime, file_size, uploaded_by)
      SELECT id, attachment_url, attachment_name, attachment_mime, attachment_size, assigned_by
      FROM tasks
      WHERE attachment_url IS NOT NULL
        AND NOT EXISTS (
          SELECT 1 FROM task_attachments ta
          WHERE ta.task_id = tasks.id AND ta.file_url = tasks.attachment_url
        )
    `);
    console.log("legacy attachments migrated:", result.affectedRows);
  } catch (error) {
    console.log("migrate attachments:", error.sqlMessage || error.message);
  }

  process.exit(0);
};

run();
