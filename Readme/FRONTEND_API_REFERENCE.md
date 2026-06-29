# Frontend API Reference - Complete Endpoint Guide

**Base URL:** `http://localhost:5001/api`  
**Authentication:** All endpoints require JWT token in header: `Authorization: Bearer {token}`

---

## Chat Endpoints

### 1. Create Group

**Endpoint:** `POST /chat/create-group`

**Headers:**
```
Authorization: Bearer {token}
Content-Type: application/json
```

**Request Body:**
```json
{
  "group_name": "Project Team",
  "group_description": "Team collaboration group",
  "members": [2, 3, 4]  // Array of user IDs
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Group created successfully",
  "group": {
    "id": 1,
    "group_name": "Project Team",
    "group_description": "Team collaboration group",
    "created_by": 1,
    "created_at": "2026-06-03T10:30:00.000Z"
  }
}
```

**Error Response (400/500):**
```json
{
  "success": false,
  "message": "Error message"
}
```

---

### 2. Get Users for Group Selection

**Endpoint:** `GET /chat/users`

**Headers:**
```
Authorization: Bearer {token}
```

**Query Parameters:** None

**Success Response (200):**
```json
{
  "success": true,
  "users": [
    {
      "id": 2,
      "name": "John Doe",
      "email": "john@example.com"
    },
    {
      "id": 3,
      "name": "Jane Smith",
      "email": "jane@example.com"
    }
  ]
}
```

---

### 3. Get User's Groups

**Endpoint:** `GET /chat/groups`

**Headers:**
```
Authorization: Bearer {token}
```

**Query Parameters:** None

**Success Response (200):**
```json
{
  "success": true,
  "groups": [
    {
      "id": 1,
      "group_name": "Project Team",
      "group_description": "Team collaboration",
      "created_by": 1,
      "created_at": "2026-06-03T10:30:00.000Z",
      "member_count": 4,
      "last_message": "See you tomorrow",
      "last_message_time": "2026-06-03T15:45:00.000Z"
    }
  ]
}
```

---

### 4. Get Group Messages

**Endpoint:** `GET /chat/messages/:groupId`

**Headers:**
```
Authorization: Bearer {token}
```

**URL Parameters:**
```
groupId: 1  // Group ID
```

**Query Parameters:**
```
limit: 50     // Optional, default 50
offset: 0     // Optional, default 0
```

**Success Response (200):**
```json
{
  "success": true,
  "messages": [
    {
      "id": 101,
      "group_id": 1,
      "user_id": 2,
      "user_name": "John Doe",
      "message": "Hello everyone",
      "message_type": "text",
      "file_url": null,
      "file_name": null,
      "file_mime": null,
      "file_size": null,
      "created_at": "2026-06-03T10:35:00.000Z"
    },
    {
      "id": 102,
      "group_id": 1,
      "user_id": 3,
      "user_name": "Jane Smith",
      "message": "Project logo",
      "message_type": "image",
      "file_url": "/uploads/chat/logo-1779257010743-61318763.png",
      "file_name": "logo.png",
      "file_mime": "image/png",
      "file_size": 245000,
      "created_at": "2026-06-03T11:00:00.000Z"
    },
    {
      "id": 103,
      "group_id": 1,
      "user_id": 2,
      "user_name": "John Doe",
      "message": "",
      "message_type": "voice",
      "file_url": "/uploads/chat/voice-1779257020443-78543210.webm",
      "file_name": "voice-note.webm",
      "file_mime": "audio/webm",
      "file_size": 125000,
      "created_at": "2026-06-03T11:15:00.000Z"
    }
  ]
}
```

---

### 5. Get Group Members

**Endpoint:** `GET /chat/group-members/:groupId`

**Headers:**
```
Authorization: Bearer {token}
```

**URL Parameters:**
```
groupId: 1  // Group ID
```

**Success Response (200):**
```json
{
  "success": true,
  "members": [
    {
      "id": 1,
      "name": "Admin User",
      "email": "admin@example.com",
      "role": "admin",
      "is_creator": true
    },
    {
      "id": 2,
      "name": "John Doe",
      "email": "john@example.com",
      "role": "user",
      "is_creator": false
    },
    {
      "id": 3,
      "name": "Jane Smith",
      "email": "jane@example.com",
      "role": "user",
      "is_creator": false
    }
  ]
}
```

---

### 6. Add Members to Group

**Endpoint:** `POST /chat/add-members`

**Headers:**
```
Authorization: Bearer {token}
Content-Type: application/json
```

**Request Body:**
```json
{
  "group_id": 1,
  "user_ids": [4, 5, 6]  // Array of user IDs to add
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Members added successfully",
  "members": [
    {
      "id": 4,
      "name": "New User",
      "email": "new@example.com"
    }
  ]
}
```

**Error Responses:**
```json
// 400 - Duplicate member
{
  "success": false,
  "message": "User 4 is already a member of this group"
}

// 403 - Permission denied
{
  "success": false,
  "message": "Only group creator can add members"
}

// 401 - Invalid token
{
  "success": false,
  "message": "Invalid token"
}
```

---

### 7. Remove Member from Group

**Endpoint:** `DELETE /chat/remove-member`

**Headers:**
```
Authorization: Bearer {token}
Content-Type: application/json
```

**Request Body:**
```json
{
  "group_id": 1,
  "user_id": 3  // User ID to remove
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Member removed successfully"
}
```

**Error Responses:**
```json
// 403 - Permission denied
{
  "success": false,
  "message": "Only creator, admin, or super_admin can remove members"
}

// 400 - Cannot remove creator
{
  "success": false,
  "message": "Group creator cannot be removed"
}

// 400 - User not member
{
  "success": false,
  "message": "User is not a member of this group"
}

// 401 - Invalid token
{
  "success": false,
  "message": "Invalid token"
}
```

---

### 8. Send Text Message

**Endpoint:** `POST /chat/send-message`

**Headers:**
```
Authorization: Bearer {token}
Content-Type: application/json
```

**Request Body:**
```json
{
  "group_id": 1,
  "message": "Hello team!"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Message sent successfully",
  "data": {
    "id": 104,
    "group_id": 1,
    "user_id": 1,
    "user_name": "Current User",
    "message": "Hello team!",
    "message_type": "text",
    "file_url": null,
    "file_name": null,
    "file_mime": null,
    "file_size": null,
    "created_at": "2026-06-03T16:00:00.000Z"
  }
}
```

---

### 9. Send Attachment (Image or Document)

**Endpoint:** `POST /chat/send-attachment`

**Headers:**
```
Authorization: Bearer {token}
Content-Type: multipart/form-data
```

**Form Data:**
```
group_id: 1                    // Required: Group ID
message: "Check this file"     // Optional: Caption
message_type: "image"          // Required: "image" or "document"
file: <File object>            // Required: The file
```

**Supported File Types:**
- **Images:** jpeg, png, webp (max 10MB)
- **Documents:** pdf, doc, docx (max 10MB)

**Success Response (200):**
```json
{
  "success": true,
  "message": "Attachment uploaded successfully",
  "data": {
    "id": 105,
    "group_id": 1,
    "user_id": 1,
    "user_name": "Current User",
    "message": "Check this file",
    "message_type": "image",
    "file_url": "/uploads/chat/logo-1779257010743-61318763.png",
    "file_name": "logo.png",
    "file_mime": "image/png",
    "file_size": 245000,
    "created_at": "2026-06-03T16:05:00.000Z"
  }
}
```

**Error Responses:**
```json
// 400 - File too large
{
  "success": false,
  "message": "File size must be less than 10MB"
}

// 400 - Invalid file type
{
  "success": false,
  "message": "Invalid file type"
}

// 403 - User not member
{
  "success": false,
  "message": "You are not a member of this group"
}

// 401 - Invalid token
{
  "success": false,
  "message": "Invalid token"
}
```

---

### 10. Send Voice Note

**Endpoint:** `POST /chat/send-voice`

**Headers:**
```
Authorization: Bearer {token}
Content-Type: multipart/form-data
```

**Form Data:**
```
group_id: 1          // Required: Group ID
voice: <File blob>   // Required: Voice file (WebM, MP3, WAV, M4A)
```

**Supported File Types:**
- webm, mp3, wav, m4a (max 10MB)

**Success Response (200):**
```json
{
  "success": true,
  "message": "Voice note sent successfully",
  "data": {
    "id": 106,
    "group_id": 1,
    "user_id": 1,
    "user_name": "Current User",
    "message": "",
    "message_type": "voice",
    "file_url": "/uploads/chat/voice-1779257020443-78543210.webm",
    "file_name": "voice-note.webm",
    "file_mime": "audio/webm",
    "file_size": 125000,
    "created_at": "2026-06-03T16:10:00.000Z"
  }
}
```

---

## Socket.io Events

### Connection & Joining

**Event:** `joinGroup`
```javascript
socket.emit('joinGroup', {
  group_id: 1,
  user_id: 1
});
```

---

### Message Events

**Event (Receive):** `receiveMessage`
```javascript
socket.on('receiveMessage', (message) => {
  // message object with all fields from send-message response
  console.log(message);
});
```

**Emitted when:**
- Any user sends a message to the group
- Broadcast to all users in group room: `group_${groupId}`

---

### Member Events

**Event (Receive):** `membersUpdated`
```javascript
socket.on('membersUpdated', (data) => {
  // {
  //   group_id: 1,
  //   members: [...], // Updated member list
  //   action: "added" | "removed"
  // }
});
```

**Emitted when:**
- Members added to group
- Members removed from group

---

## Authentication

### Login (Note: Separate from chat endpoints)

**Endpoint:** `POST /auth/login`

**Headers:**
```
Content-Type: application/json
```

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Login successful",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "name": "John Doe",
    "email": "john@example.com",
    "role": "admin"
  }
}
```

**Error Response (401):**
```json
{
  "success": false,
  "message": "Invalid token or expired token"
}
```

---

## Error Handling

### Common Error Status Codes

| Code | Meaning | Action |
|------|---------|--------|
| 200 | Success | Process response data |
| 400 | Bad Request | Show error message to user |
| 401 | Unauthorized | Clear localStorage, redirect to login |
| 403 | Forbidden | Show "Permission denied" toast |
| 500 | Server Error | Show "Server error" toast |

### Generic Error Response
```json
{
  "success": false,
  "message": "Error description here"
}
```

### Axios Interceptor for 401
```javascript
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 || 
        error.response?.data?.message?.toLowerCase().includes("invalid token")) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);
```

---

## File URL Format

All file URLs follow this format:
```
http://localhost:5001/uploads/chat/[filename-with-timestamp]
```

Example:
```
http://localhost:5001/uploads/chat/logo-1779257010743-61318763.png
http://localhost:5001/uploads/chat/voice-1779257020443-78543210.webm
http://localhost:5001/uploads/chat/document-1779257030543-98765432.pdf
```

---

## Testing Endpoints with cURL

### Create Group
```bash
curl -X POST http://localhost:5001/api/chat/create-group \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "group_name": "Test Group",
    "group_description": "For testing",
    "members": [2, 3]
  }'
```

### Get Groups
```bash
curl -X GET http://localhost:5001/api/chat/groups \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Send Attachment
```bash
curl -X POST http://localhost:5001/api/chat/send-attachment \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "group_id=1" \
  -F "message=Check this" \
  -F "message_type=image" \
  -F "file=@logo.png"
```

### Remove Member
```bash
curl -X DELETE http://localhost:5001/api/chat/remove-member \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "group_id": 1,
    "user_id": 3
  }'
```

---

## Response Examples for Frontend

### Handling Success
```javascript
try {
  const response = await api.post("/chat/create-group", {
    group_name: "Team",
    members: [2, 3]
  });
  
  if (response.data.success) {
    toast.success("Group created");
    // Use response.data.group
  }
} catch (error) {
  toast.error(error?.response?.data?.message);
}
```

### Handling Attachments
```javascript
const formData = new FormData();
formData.append("group_id", groupId);
formData.append("message", message);
formData.append("message_type", file.type.startsWith("image") ? "image" : "document");
formData.append("file", file);

const response = await api.post("/chat/send-attachment", formData, {
  headers: { "Content-Type": "multipart/form-data" }
});

if (response.data.success) {
  // response.data.data contains the message object
  // Use file_url, file_name, message_type to render
}
```

### Rendering Messages
```javascript
// Text message
{msg.message_type === "text" && <p>{msg.message}</p>}

// Image
{msg.message_type === "image" && (
  <img src={`http://localhost:5001${msg.file_url}`} />
)}

// Document
{msg.message_type === "document" && (
  <a href={`http://localhost:5001${msg.file_url}`} target="_blank">
    {msg.file_name}
  </a>
)}

// Voice
{msg.message_type === "voice" && (
  <audio controls src={`http://localhost:5001${msg.file_url}`} />
)}
```

---

**Complete API Reference for Frontend Developers ✅**
