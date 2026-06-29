-- Chat Attachments and Voice Notes Migration
-- This migration adds support for attachments, voice notes, and enhanced message types

-- ALTER messages TABLE TO ADD ATTACHMENT AND VOICE NOTE SUPPORT
-- If columns already exist, this will skip them (using ALTER IGNORE or checking first)

ALTER TABLE messages 
ADD COLUMN IF NOT EXISTS message_type ENUM('text','image','document','voice') DEFAULT 'text',
ADD COLUMN IF NOT EXISTS file_url TEXT NULL,
ADD COLUMN IF NOT EXISTS file_name VARCHAR(255) NULL,
ADD COLUMN IF NOT EXISTS file_mime VARCHAR(100) NULL,
ADD COLUMN IF NOT EXISTS file_size INT NULL;

-- CREATE INDEX FOR FASTER QUERIES
CREATE INDEX IF NOT EXISTS idx_messages_group_id ON messages(group_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_message_type ON messages(message_type);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at);

-- VERIFY TABLE STRUCTURE
-- SELECT COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE, COLUMN_DEFAULT 
-- FROM INFORMATION_SCHEMA.COLUMNS 
-- WHERE TABLE_NAME = 'messages' AND TABLE_SCHEMA = DATABASE();
