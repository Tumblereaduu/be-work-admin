# Task Messages API - Quick Reference

**Status:** ✅ Implemented & Ready

---

## Quick Start

### Database Setup
```sql
-- Run this SQL to create the task_messages table
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
```

---

## API Endpoints

### 1. POST /api/tasks/:id/messages
**Add a message to a task**

```bash
curl -X POST http://localhost:5001/api/tasks/3/messages \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{"message": "Task update text"}'
```

**Request:**
```json
{
  "message": "I have started working on this"
}
```

**Response (201):**
```json
{
  "success": true,
  "message": "Task message sent successfully",
  "data": {
    "id": 1,
    "task_id": 3,
    "user_id": 2,
    "user_name": "Kishore",
    "user_role": "staff",
    "message": "I have started working on this",
    "created_at": "2026-06-03T10:30:00.000Z"
  }
}
```

---

### 2. GET /api/tasks/:id/messages
**Get all messages for a task**

```bash
curl -X GET http://localhost:5001/api/tasks/3/messages \
  -H "Authorization: Bearer {token}"
```

**Response (200):**
```json
{
  "success": true,
  "messages": [
    {
      "id": 1,
      "task_id": 3,
      "user_id": 2,
      "user_name": "Kishore",
      "user_role": "staff",
      "message": "I have started working on this",
      "created_at": "2026-06-03T10:30:00.000Z"
    },
    {
      "id": 2,
      "task_id": 3,
      "user_id": 1,
      "user_name": "Admin User",
      "user_role": "admin",
      "message": "Great! Keep going",
      "created_at": "2026-06-03T10:45:00.000Z"
    }
  ]
}
```

---

## Authorization Rules

### Who Can Send Messages?
- **Admin/Super Admin:** Can send to ANY task
- **Staff:** Can send ONLY to assigned tasks (direct or via task_assignees)

### Who Can View Messages?
- **Admin/Super Admin:** Can view ALL messages
- **Staff:** Can view ONLY assigned task messages

---

## Error Responses

### 400 - Message Required
```json
{"success": false, "message": "Message is required"}
```

### 404 - Task Not Found
```json
{"success": false, "message": "Task not found"}
```

### 403 - Access Denied
```json
{"success": false, "message": "Access denied"}
```

### 500 - Server Error
```json
{"success": false, "message": "Server error"}
```

---

## Code Files Modified

| File | Changes |
|------|---------|
| `src/controllers/task/taskController.js` | Added `addTaskMessage()` and `getTaskMessages()` |
| `src/routes/taskRoutes.js` | Added 2 new routes for messages |

---

## Testing Checklist

- [ ] Database table created
- [ ] Admin can send message to any task
- [ ] Admin can view all messages
- [ ] Staff can send message to assigned task
- [ ] Staff cannot send message to unassigned task
- [ ] Staff can view messages from assigned task
- [ ] Staff cannot view messages from unassigned task
- [ ] Message required validation works
- [ ] Task not found returns 404
- [ ] Access denied returns 403
- [ ] Messages ordered by created_at (oldest first)
- [ ] User info included in response
- [ ] Deleting task cascades to messages
- [ ] Empty message rejected

---

## Implementation Code

### Task Controller Functions

```javascript
// ADD TASK MESSAGE
export const addTaskMessage = async (req, res) => {
  const { id } = req.params;
  const { message } = req.body;
  
  // Validate
  if (!message?.trim()) {
    return res.status(400).json({success: false, message: "Message is required"});
  }
  
  // Check task exists
  const [taskRows] = await pool.query("SELECT * FROM tasks WHERE id = ?", [id]);
  if (!taskRows.length) {
    return res.status(404).json({success: false, message: "Task not found"});
  }
  
  // Check permission
  const assigneeIds = await getAssigneeIds(id);
  if (req.user.role === "staff") {
    const hasAccess = assigneeIds.includes(req.user.id) || taskRows[0].assigned_to === req.user.id;
    if (!hasAccess) {
      return res.status(403).json({success: false, message: "Access denied"});
    }
  }
  
  // Insert message
  const [result] = await pool.query(
    "INSERT INTO task_messages (task_id, user_id, message) VALUES (?, ?, ?)",
    [id, req.user.id, message.trim()]
  );
  
  // Get inserted message with user info
  const [msgs] = await pool.query(
    `SELECT tm.id, tm.task_id, tm.user_id, u.name AS user_name, u.role AS user_role, 
            tm.message, tm.created_at
     FROM task_messages tm
     INNER JOIN users u ON u.id = tm.user_id
     WHERE tm.id = ?`,
    [result.insertId]
  );
  
  return res.status(201).json({success: true, message: "Task message sent successfully", data: msgs[0]});
};

// GET TASK MESSAGES
export const getTaskMessages = async (req, res) => {
  const { id } = req.params;
  
  // Check task exists
  const [taskRows] = await pool.query("SELECT * FROM tasks WHERE id = ?", [id]);
  if (!taskRows.length) {
    return res.status(404).json({success: false, message: "Task not found"});
  }
  
  // Check permission
  const assigneeIds = await getAssigneeIds(id);
  if (req.user.role === "staff") {
    const hasAccess = assigneeIds.includes(req.user.id) || taskRows[0].assigned_to === req.user.id;
    if (!hasAccess) {
      return res.status(403).json({success: false, message: "Access denied"});
    }
  }
  
  // Get messages
  const [messages] = await pool.query(
    `SELECT tm.id, tm.task_id, tm.user_id, u.name AS user_name, u.role AS user_role,
            tm.message, tm.created_at
     FROM task_messages tm
     INNER JOIN users u ON u.id = tm.user_id
     WHERE tm.task_id = ?
     ORDER BY tm.created_at ASC`,
    [id]
  );
  
  return res.status(200).json({success: true, messages});
};
```

### Task Routes

```javascript
import { addTaskMessage, getTaskMessages } from "../controllers/task/taskController.js";

// Add Task Message/Reply
router.post("/:id/messages", verifyToken, addTaskMessage);

// Get Task Messages/Replies
router.get("/:id/messages", verifyToken, getTaskMessages);
```

---

## Database Schema

```sql
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
```

---

## Frontend Integration Example

```jsx
import { useState, useEffect } from 'react';
import api from '../api/api';
import { toast } from 'react-toastify';

export function TaskMessages({ taskId }) {
  const [messages, setMessages] = useState([]);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  // Load messages
  useEffect(() => {
    if (!taskId) return;
    
    const loadMessages = async () => {
      try {
        const res = await api.get(`/tasks/${taskId}/messages`);
        if (res.data.success) {
          setMessages(res.data.messages);
        }
      } catch (error) {
        toast.error('Failed to load messages');
      }
    };
    
    loadMessages();
  }, [taskId]);

  // Send message
  const handleSend = async () => {
    if (!message.trim()) {
      toast.error('Message cannot be empty');
      return;
    }

    try {
      setLoading(true);
      const res = await api.post(`/tasks/${taskId}/messages`, { message });
      
      if (res.data.success) {
        setMessages([...messages, res.data.data]);
        setMessage('');
        toast.success('Message sent');
      }
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Failed to send message');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="task-messages">
      <div className="messages-container">
        {messages.map(msg => (
          <div key={msg.id} className="message-item">
            <div className="message-header">
              <strong>{msg.user_name}</strong>
              <span className="role">{msg.user_role}</span>
              <span className="time">{new Date(msg.created_at).toLocaleString()}</span>
            </div>
            <div className="message-text">{msg.message}</div>
          </div>
        ))}
      </div>

      <div className="message-input-area">
        <textarea
          value={message}
          onChange={e => setMessage(e.target.value)}
          placeholder="Add a reply..."
          rows="3"
          disabled={loading}
        />
        <button
          onClick={handleSend}
          disabled={loading || !message.trim()}
        >
          {loading ? 'Sending...' : 'Send'}
        </button>
      </div>
    </div>
  );
}
```

---

## Key Features

✅ **Role-Based Access** - Admin can access all, staff only assigned  
✅ **Thread View** - All messages in one place, chronological order  
✅ **User Context** - See who wrote each message  
✅ **Secure** - Permissions checked on both POST and GET  
✅ **Scalable** - Indexed for performance  
✅ **Cascading** - Messages deleted when task deleted  
✅ **No Conflicts** - Completely independent from existing task features  

---

## What's NOT Modified

✅ Existing task creation - No changes  
✅ Existing task updates - No changes  
✅ Existing task status change - No changes  
✅ Existing task attachments - No changes  
✅ Dashboard - No changes  
✅ Task filtering - No changes  
✅ Any other APIs - No changes  

---

## Deployment Steps

1. **Run Migration:**
   ```sql
   -- File: TASK_MESSAGES_MIGRATION.sql
   ```

2. **Verify Table:**
   ```sql
   SHOW TABLES LIKE 'task_messages';
   DESCRIBE task_messages;
   ```

3. **Test Endpoints:**
   - POST `/api/tasks/1/messages` with admin token
   - GET `/api/tasks/1/messages` with admin token
   - POST `/api/tasks/1/messages` with staff token (assigned)
   - Verify 403 error with unassigned staff

4. **Deploy to Production**

---

**✅ Complete & Ready for Use**
