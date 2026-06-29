# Chat Group API - Quick Reference

## 🚀 Quick Start

### 1. Create a Group
```bash
POST /api/chat/create-group
Authorization: Bearer <TOKEN>
Content-Type: application/json

{
  "group_name": "Frontend Team",
  "group_description": "Frontend developers discussion group",
  "members": [2, 3, 4]
}
```

**Response:**
```json
{
  "success": true,
  "message": "Group created successfully",
  "group": {
    "id": 1,
    "group_name": "Frontend Team",
    "group_description": "Frontend developers discussion group"
  }
}
```

---

### 2. Get Users for Selection
```bash
GET /api/chat/users
Authorization: Bearer <TOKEN>
```

**Response:**
```json
{
  "success": true,
  "users": [
    {
      "id": 2,
      "name": "Kishore",
      "email": "kishore@gmail.com",
      "role": "staff"
    }
  ]
}
```

---

### 3. Get My Groups
```bash
GET /api/chat/groups
Authorization: Bearer <TOKEN>
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "group_name": "Frontend Team",
      "group_description": "Frontend developers discussion group",
      "created_by": 1,
      "created_at": "2024-01-15T10:30:00.000Z"
    }
  ]
}
```

---

### 4. Get Group Messages
```bash
GET /api/chat/messages/1
Authorization: Bearer <TOKEN>
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "group_id": 1,
      "sender_id": 2,
      "message": "Hello everyone!",
      "created_at": "2024-01-15T10:35:00.000Z",
      "name": "Kishore"
    }
  ]
}
```

---

## 🔌 Socket Events

### Join Group
```javascript
socket.emit('joinGroup', 1);
```

### Send Message
```javascript
socket.emit('sendMessage', {
  group_id: 1,
  sender_id: 2,
  message: "Hello everyone!"
});
```

### Receive Message
```javascript
socket.on('receiveMessage', (messageData) => {
  console.log(messageData);
});
```

---

## ✅ Validation Rules

| Field | Rule | Example |
|-------|------|---------|
| `group_name` | Required, non-empty string | "Frontend Team" |
| `group_description` | Optional, can be null | "Discussion group" |
| `members` | Required array of user IDs | [2, 3, 4] |

---

## 🛡️ Error Responses

### Missing group_name
```json
{
  "success": false,
  "message": "group_name is required and must be a non-empty string"
}
```

### Invalid members array
```json
{
  "success": false,
  "message": "members must be an array"
}
```

### Server error
```json
{
  "success": false,
  "message": "Failed to create group"
}
```

---

## 📊 Database Tables

### chat_groups
- `id` - Group ID
- `group_name` - Group name
- `group_description` - Group description
- `created_by` - Creator user ID
- `created_at` - Creation timestamp

### group_members
- `id` - Member record ID
- `group_id` - Group ID
- `user_id` - User ID
- `joined_at` - Join timestamp

### messages
- `id` - Message ID
- `group_id` - Group ID
- `sender_id` - Sender user ID
- `message` - Message content
- `created_at` - Message timestamp

---

## 🔐 Authentication

All endpoints require JWT token in header:
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

## 💡 Key Features

✅ Automatic creator addition as member
✅ Duplicate member prevention
✅ MySQL transaction support
✅ Comprehensive input validation
✅ Real-time socket events
✅ Production-ready error handling
✅ Connection pooling
✅ Backward compatible

---

## 📝 Implementation Files

- `src/controllers/chat/chatController.js` - Controller logic
- `src/routes/chatRoutes.js` - API routes
- `src/config/quary.sql` - Database schema
- `src/socket/chatSocket.js` - Socket events (unchanged)

---

## 🧪 Testing with cURL

### Create Group
```bash
curl -X POST http://localhost:3000/api/chat/create-group \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"group_name":"Test","members":[2,3]}'
```

### Get Users
```bash
curl -X GET http://localhost:3000/api/chat/users \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Get Groups
```bash
curl -X GET http://localhost:3000/api/chat/groups \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Get Messages
```bash
curl -X GET http://localhost:3000/api/chat/messages/1 \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## 🚨 Common Issues

**Issue:** "group_name is required"
- **Solution:** Ensure group_name is provided and not empty

**Issue:** "members must be an array"
- **Solution:** Ensure members is an array, e.g., `[2, 3, 4]`

**Issue:** "Invalid token"
- **Solution:** Ensure valid JWT token is provided in Authorization header

**Issue:** Duplicate members in group
- **Solution:** Automatically handled - duplicates are removed

---

## 📞 Support

For issues or questions, refer to:
- `CHAT_API_DOCUMENTATION.md` - Full documentation
- `IMPLEMENTATION_SUMMARY.md` - Implementation details
- Controller code comments - Inline documentation
