CREATE DATABASE IF NOT EXISTS pc_it_work_admin;
USE pc_it_work_admin;

CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100),
  email VARCHAR(100) UNIQUE,
  password VARCHAR(255),
  role ENUM('super_admin','admin','staff') DEFAULT 'staff',
  status ENUM('active','inactive','blocked') DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_by INT NULL
);

CREATE TABLE attendance (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  attendance_date DATE NULL,
  login_time DATETIME NULL,
  logout_time DATETIME NULL,
  break_start DATETIME NULL,
  break_end DATETIME NULL,
  lunch_start DATETIME NULL,
  lunch_end DATETIME NULL,
  break_seconds INT DEFAULT 0,
  lunch_seconds INT DEFAULT 0,
  permission_seconds INT DEFAULT 0,
  total_seconds INT DEFAULT 0,
  net_work_seconds INT DEFAULT 0,
  total_hours VARCHAR(50) NULL,
  net_work_hours VARCHAR(50) NULL,
  status ENUM('present','late','half-day','absent','leave','permission') DEFAULT 'present',
  updated_by INT NULL,
  updated_at DATETIME NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE attendance_sessions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  attendance_id INT NOT NULL,
  user_id INT NOT NULL,
  type ENUM('break','lunch','permission') NOT NULL,
  start_time DATETIME NOT NULL,
  end_time DATETIME NULL,
  duration_seconds INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (attendance_id) REFERENCES attendance(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE chat_groups (
  id INT AUTO_INCREMENT PRIMARY KEY,
  group_name VARCHAR(255) NULL,
  created_by INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  group_description TEXT NULL,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
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
  message TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  message_type ENUM('text','image','document','voice') DEFAULT 'text',
  file_url TEXT NULL,
  file_name VARCHAR(255) NULL,
  file_mime VARCHAR(100) NULL,
  file_size INT NULL,
  FOREIGN KEY (group_id) REFERENCES chat_groups(id) ON DELETE CASCADE,
  FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE tasks (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT NULL,
  assigned_to INT NULL,
  assigned_by INT NULL,
  status ENUM('pending','in_progress','completed') DEFAULT 'pending',
  priority ENUM('low','medium','high') DEFAULT 'medium',
  deadline DATE NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  attachment_url TEXT NULL,
  attachment_name VARCHAR(255) NULL,
  attachment_mime VARCHAR(100) NULL,
  attachment_size INT NULL,
  completed_at DATETIME NULL,
  FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (assigned_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE task_assignees (
  id INT AUTO_INCREMENT PRIMARY KEY,
  task_id INT NOT NULL,
  user_id INT NOT NULL,
  assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY unique_task_user (task_id, user_id),
  FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

----------------------------------------------------------------
----------------------------------------------------------------
----------------------------------------------------------------
----------------------------------------------------------------
CREATE DATABASE IF NOT EXISTS pc_it_work_admin;
USE pc_it_work_admin;

SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS task_attachments;
DROP TABLE IF EXISTS task_assignees;
DROP TABLE IF EXISTS messages;
DROP TABLE IF EXISTS group_members;
DROP TABLE IF EXISTS chat_groups;
DROP TABLE IF EXISTS attendance_sessions;
DROP TABLE IF EXISTS attendance;
DROP TABLE IF EXISTS tasks;
DROP TABLE IF EXISTS users;

SET FOREIGN_KEY_CHECKS = 1;

-- =========================
-- USERS TABLE
-- =========================

CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,

    role ENUM(
        'super_admin',
        'admin',
        'staff'
    ) DEFAULT 'staff',

    status ENUM(
        'active',
        'inactive',
        'blocked'
    ) DEFAULT 'active',

    created_by INT NULL,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =========================
-- ATTENDANCE TABLE
-- =========================

CREATE TABLE attendance (
    id INT AUTO_INCREMENT PRIMARY KEY,

    user_id INT NOT NULL,

    attendance_date DATE NULL,

    login_time DATETIME NULL,
    logout_time DATETIME NULL,

    break_start DATETIME NULL,
    break_end DATETIME NULL,

    lunch_start DATETIME NULL,
    lunch_end DATETIME NULL,

    break_seconds INT DEFAULT 0,
    lunch_seconds INT DEFAULT 0,
    permission_seconds INT DEFAULT 0,

    total_seconds INT DEFAULT 0,
    net_work_seconds INT DEFAULT 0,

    total_hours VARCHAR(50) NULL,
    net_work_hours VARCHAR(50) NULL,

    status ENUM(
        'present',
        'late',
        'half-day',
        'absent',
        'leave',
        'permission'
    ) DEFAULT 'present',

    updated_by INT NULL,
    updated_at DATETIME NULL,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (user_id)
    REFERENCES users(id)
    ON DELETE CASCADE,

    FOREIGN KEY (updated_by)
    REFERENCES users(id)
    ON DELETE SET NULL
);

-- =========================
-- ATTENDANCE SESSIONS
-- =========================

CREATE TABLE attendance_sessions (
    id INT AUTO_INCREMENT PRIMARY KEY,

    attendance_id INT NOT NULL,
    user_id INT NOT NULL,

    type ENUM(
        'break',
        'lunch',
        'permission'
    ) NOT NULL,

    start_time DATETIME NOT NULL,
    end_time DATETIME NULL,

    duration_seconds INT DEFAULT 0,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (attendance_id)
    REFERENCES attendance(id)
    ON DELETE CASCADE,

    FOREIGN KEY (user_id)
    REFERENCES users(id)
    ON DELETE CASCADE
);

-- =========================
-- TASKS TABLE
-- =========================

CREATE TABLE tasks (
    id INT AUTO_INCREMENT PRIMARY KEY,

    title VARCHAR(255) NOT NULL,
    description TEXT NULL,

    assigned_to INT NULL,
    assigned_by INT NULL,

    status ENUM(
        'pending',
        'in_progress',
        'completed'
    ) DEFAULT 'pending',

    priority ENUM(
        'low',
        'medium',
        'high'
    ) DEFAULT 'medium',

    deadline DATE NULL,

    attachment_url TEXT NULL,
    attachment_name VARCHAR(255) NULL,
    attachment_mime VARCHAR(100) NULL,
    attachment_size INT NULL,

    completed_at DATETIME NULL,

    updated_by INT NULL,
    updated_at DATETIME NULL,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (assigned_to)
    REFERENCES users(id)
    ON DELETE SET NULL,

    FOREIGN KEY (assigned_by)
    REFERENCES users(id)
    ON DELETE SET NULL,

    FOREIGN KEY (updated_by)
    REFERENCES users(id)
    ON DELETE SET NULL
);

-- =========================
-- TASK ASSIGNEES
-- =========================

CREATE TABLE task_assignees (
    id INT AUTO_INCREMENT PRIMARY KEY,

    task_id INT NOT NULL,
    user_id INT NOT NULL,

    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    UNIQUE KEY unique_task_user (
        task_id,
        user_id
    ),

    FOREIGN KEY (task_id)
    REFERENCES tasks(id)
    ON DELETE CASCADE,

    FOREIGN KEY (user_id)
    REFERENCES users(id)
    ON DELETE CASCADE
);

-- =========================
-- TASK ATTACHMENTS
-- =========================

CREATE TABLE task_attachments (
    id INT AUTO_INCREMENT PRIMARY KEY,

    task_id INT NOT NULL,

    file_url TEXT NOT NULL,
    file_name VARCHAR(255) NULL,
    file_mime VARCHAR(100) NULL,
    file_size INT NULL,

    uploaded_by INT NULL,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (task_id)
    REFERENCES tasks(id)
    ON DELETE CASCADE,

    FOREIGN KEY (uploaded_by)
    REFERENCES users(id)
    ON DELETE SET NULL
);

-- =========================
-- CHAT GROUPS
-- =========================

CREATE TABLE chat_groups (
    id INT AUTO_INCREMENT PRIMARY KEY,

    group_name VARCHAR(255) NOT NULL,
    group_description TEXT NULL,

    created_by INT NULL,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (created_by)
    REFERENCES users(id)
    ON DELETE SET NULL
);

-- =========================
-- GROUP MEMBERS
-- =========================

CREATE TABLE group_members (
    id INT AUTO_INCREMENT PRIMARY KEY,

    group_id INT NOT NULL,
    user_id INT NOT NULL,

    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    UNIQUE KEY unique_group_user (
        group_id,
        user_id
    ),

    FOREIGN KEY (group_id)
    REFERENCES chat_groups(id)
    ON DELETE CASCADE,

    FOREIGN KEY (user_id)
    REFERENCES users(id)
    ON DELETE CASCADE
);

-- =========================
-- MESSAGES TABLE
-- =========================

CREATE TABLE messages (
    id INT AUTO_INCREMENT PRIMARY KEY,

    group_id INT NOT NULL,
    sender_id INT NOT NULL,

    message TEXT NULL,

    message_type ENUM(
        'text',
        'image',
        'document',
        'voice'
    ) DEFAULT 'text',

    file_url TEXT NULL,
    file_name VARCHAR(255) NULL,
    file_mime VARCHAR(100) NULL,
    file_size INT NULL,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (group_id)
    REFERENCES chat_groups(id)
    ON DELETE CASCADE,

    FOREIGN KEY (sender_id)
    REFERENCES users(id)
    ON DELETE CASCADE
);