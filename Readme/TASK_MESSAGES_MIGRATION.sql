-- Task Messages/Replies Table Migration
-- Created: June 3, 2026
-- Purpose: Store task messages and replies for task discussions

CREATE TABLE IF NOT EXISTS task_messages (
  id INT AUTO_INCREMENT PRIMARY KEY,
  task_id INT NOT NULL,
  user_id INT NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_task_id (task_id),
  INDEX idx_user_id (user_id),
  INDEX idx_created_at (created_at)
);
