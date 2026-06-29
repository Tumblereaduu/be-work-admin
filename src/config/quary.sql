CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100),
    email VARCHAR(100) UNIQUE,
    password VARCHAR(255),
    role ENUM('admin','employee') DEFAULT 'employee',
    status ENUM('active','blocked') DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE users
ADD COLUMN role ENUM(
  'super_admin',
  'admin',
  'staff'
) DEFAULT 'staff',

ADD COLUMN status ENUM(
  'active',
  'inactive'
) DEFAULT 'active',

ADD COLUMN created_by INT NULL,

ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;



CREATE TABLE tasks (

    id INT PRIMARY KEY AUTO_INCREMENT,

    title VARCHAR(255) NOT NULL,

    description TEXT,

    assigned_to INT NOT NULL,

    assigned_by INT NOT NULL,

    status ENUM(
        'pending',
        'in_progress',
        'completed'
    ) DEFAULT 'pending',

    deadline DATE,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE tasks
ADD COLUMN attachment_url TEXT NULL,
ADD COLUMN attachment_name VARCHAR(255) NULL,
ADD COLUMN attachment_mime VARCHAR(100) NULL,
ADD COLUMN attachment_size INT NULL,
ADD COLUMN completed_at DATETIME NULL;

ALTER TABLE tasks
ADD COLUMN priority ENUM('low', 'medium', 'high') DEFAULT 'medium' AFTER status;

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

ALTER TABLE tasks
ADD COLUMN updated_by INT NULL,
ADD COLUMN updated_at DATETIME NULL;

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
);

CREATE TABLE chat_groups (
    id INT AUTO_INCREMENT PRIMARY KEY,
    group_name VARCHAR(255) NOT NULL,
    group_description TEXT NULL,
    created_by INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE group_members (
    id INT AUTO_INCREMENT PRIMARY KEY,
    group_id INT NOT NULL,
    user_id INT NOT NULL,
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY unique_group_user (group_id, user_id),
    FOREIGN KEY (group_id) REFERENCES chat_groups(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE messages (
    id INT AUTO_INCREMENT PRIMARY KEY,
    group_id INT NOT NULL,
    sender_id INT NOT NULL,
    message TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (group_id) REFERENCES chat_groups(id) ON DELETE CASCADE,
    FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS task_messages (
  id INT AUTO_INCREMENT PRIMARY KEY,
  task_id INT NOT NULL,
  user_id INT NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);