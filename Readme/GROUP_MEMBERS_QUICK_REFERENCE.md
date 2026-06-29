# Group Members API - Quick Reference

## 🚀 Quick Start

### Get Group Members
```bash
GET /api/chat/group-members/:groupId
Authorization: Bearer <TOKEN>
```

**Response:**
```json
{
  "success": true,
  "members": [
    {
      "id": 1,
      "name": "John Doe",
      "email": "john@gmail.com",
      "role": "admin",
      "joined_at": "2024-01-15T10:30:00.000Z"
    }
  ]
}
```

---

### Add Members
```bash
POST /api/chat/add-members
Authorization: Bearer <TOKEN>
Content-Type: application/json

{
  "group_id": 1,
  "members": [2, 3, 4]
}
```

**Response:**
```json
{
  "success": true,
  "message": "Members added successfully"
}
```

---

### Remove Member
```bash
DELETE /api/chat/remove-member
Authorization: Bearer <TOKEN>
Content-Type: application/json

{
  "group_id": 1,
  "user_id": 3
}
```

**Response:**
```json
{
  "success": true,
  "message": "Member removed successfully"
}
```

---

## 📋 Validation Rules

| Field | Rule | Example |
|-------|------|---------|
| groupId (GET) | Required, positive integer | 1 |
| group_id (POST/DELETE) | Required, positive integer | 1 |
| members (POST) | Required, non-empty array | [2, 3, 4] |
| user_id (DELETE) | Required, positive integer | 3 |

---

## 🛡️ Error Responses

### Missing Parameters
```json
{
  "success": false,
  "message": "Group ID is required"
}
```

### Invalid Members Array
```json
{
  "success": false,
  "message": "Group ID and members array are required"
}
```

### Creator Cannot Be Removed
```json
{
  "success": false,
  "message": "Group creator cannot be removed"
}
```

### Group Not Found
```json
{
  "success": false,
  "message": "Group not found"
}
```

### Server Error
```json
{
  "success": false,
  "message": "Server error"
}
```

---

## 🔌 Socket Events

### Listen for Members Updated
```javascript
socket.on('membersUpdated', (data) => {
  console.log(`Members updated in group ${data.group_id}`);
  // Refresh members list
});
```

---

## 🧪 Testing with cURL

### Get Members
```bash
curl -X GET http://localhost:3000/api/chat/group-members/1 \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Add Members
```bash
curl -X POST http://localhost:3000/api/chat/add-members \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"group_id":1,"members":[2,3,4]}'
```

### Remove Member
```bash
curl -X DELETE http://localhost:3000/api/chat/remove-member \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"group_id":1,"user_id":3}'
```

---

## 📊 Response Status Codes

| Code | Meaning |
|------|---------|
| 200 | Success |
| 400 | Bad request (validation error) |
| 404 | Group not found |
| 500 | Server error |

---

## ✨ Key Features

✅ **Get Members**
- Returns all group members
- Includes user details (id, name, email, role)
- Sorted by join date

✅ **Add Members**
- Add multiple users at once
- Automatic duplicate removal
- Non-blocking (continues if user already member)
- Emits socket event

✅ **Remove Member**
- Remove single user from group
- Prevents creator removal
- Validates group existence
- Emits socket event

---

## 🔐 Security

- JWT authentication required
- Input validation on all parameters
- Creator protection
- Error message sanitization

---

## 💡 Common Use Cases

### Fetch Group Members
```javascript
const response = await fetch(
  'http://localhost:3000/api/chat/group-members/1',
  {
    headers: { 'Authorization': `Bearer ${token}` }
  }
);
const data = await response.json();
console.log(data.members);
```

### Add Multiple Users
```javascript
const response = await fetch(
  'http://localhost:3000/api/chat/add-members',
  {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      group_id: 1,
      members: [2, 3, 4]
    })
  }
);
```

### Remove User
```javascript
const response = await fetch(
  'http://localhost:3000/api/chat/remove-member',
  {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      group_id: 1,
      user_id: 3
    })
  }
);
```

---

## 🚨 Common Issues

**Issue:** "Group creator cannot be removed"
- **Solution:** Only remove non-creator members

**Issue:** "Group not found"
- **Solution:** Verify group ID is correct

**Issue:** Duplicate members not prevented
- **Solution:** API automatically handles duplicates with INSERT IGNORE

**Issue:** Socket event not received
- **Solution:** Ensure socket is connected and joined to group room

---

## 📞 Related APIs

- `POST /api/chat/create-group` - Create group
- `GET /api/chat/groups` - Get user's groups
- `GET /api/chat/users` - Get available users
- `GET /api/chat/messages/:groupId` - Get messages

---

## 📝 Notes

- All timestamps in UTC
- Members sorted by join date (oldest first)
- Duplicates automatically removed
- Creator cannot be removed
- Socket events emitted to group room
- Frontend should listen for `membersUpdated` event
