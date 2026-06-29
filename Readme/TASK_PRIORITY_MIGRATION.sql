-- Run once on existing databases

ALTER TABLE tasks
ADD COLUMN IF NOT EXISTS priority ENUM('low', 'medium', 'high') DEFAULT 'medium' AFTER status;

CREATE TABLE IF NOT EXISTS task_assignees (
    id INT AUTO_INCREMENT PRIMARY KEY,
    task_id INT NOT NULL,
    user_id INT NOT NULL,
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY unique_task_user (task_id, user_id),
    FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

INSERT IGNORE INTO task_assignees (task_id, user_id)
SELECT id, assigned_to
FROM tasks
WHERE assigned_to IS NOT NULL;
