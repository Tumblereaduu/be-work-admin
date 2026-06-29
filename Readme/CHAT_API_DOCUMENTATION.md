# Chat Group API Documentation

## Overview
This document describes the Chat Group API endpoints for creating and managing chat groups with selected users.

---

## Database Schema

### chat_groups Table
```sql
CREATE TABLE chat_groups (
    id INT AUTO_INCREMENT PRIMARY KEY,
    group_name VARCHAR(255) NOT NULL,
    group_description TEXT NULL,
    created_by INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
);
```

### group_members Table
```sql
CREATE TABLE group_members (
    id INT AUTO_INCREMENT PRIMARY KEY,
    group_id INT NOT NULL,
    user_id INT NOT NULL,
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY unique_group_user (group_id, user_id),
    FOREIGN KEY (group_id) REFERENCES chat_groups(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

### messages Table
```sql
CREATE TABLE messages (
    id INT AUTO_INCREMENT PRIMARY KEY,
    group_id INT NOT NULL,
    sender_id INT NOT NULL,
    message TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (group_id) REFERENCES chat_groups(id) ON DELETE CASCADE,
    FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE
);
```

---

## API Endpoints

### 1. Create Chat Group
**Endpoint:** `POST /api/chat/create-group`

**Authentication:** Required (Bearer Token)

**Request Body:**
```json
{
  "group_name": "Frontend Team",
  "group_description": "Frontend developers discussion group",
  "members": [2, 3, 4]
}
```

**Request Parameters:**
- `group_name` (string, required): Name of the group (non-empty)
- `group_description` (string, optional): Description of the group
- `members` (array, required): Array of user IDs to add as members

**Response (Success - 201):**
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

**Response (Error - 400):**
```json
{
  "success": false,
  "message": "group_name is required and must be a non-empty string"
}
```

**Response (Error - 400):**
```json
{
  "success": false,
  "message": "members must be an array"
}
```

**Response (Error - 500):**
```json
{
  "success": false,
  "message": "Failed to create group"
}
```

**Features:**
- Only logged-in users can create groups
- Creator is automatically added as a group member
- Duplicate members are automatically removed
- Uses MySQL transaction for data consistency
- Rollback on error to maintain data integrity

---

### 2. Get Users for Group Selection
**Endpoint:** `GET /api/chat/users`

**Authentication:** Required (Bearer Token)

**Response (Success - 200):**
```json
{
  "success": true,
  "users": [
    {
      "id": 2,
      "name": "Kishore",
      "email": "kishore@gmail.com",
      "role": "staff"
    },
    {
      "id": 3,
      "name": "John Doe",
      "email": "john@gmail.com",
      "role": "staff"
    }
  ]
}
```

**Response (Error - 500):**
```json
{
  "success": false,
  "message": "Failed to fetch users"
}
```

**Features:**
- Returns only active users
- Sorted by name in ascending order
- Includes user ID, name, email, and role

---

### 3. Get My Groups
**Endpoint:** `GET /api/chat/groups`

**Authentication:** Required (Bearer Token)

**Response (Success - 200):**
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

**Response (Error - 500):**
```json
{
  "success": false,
  "message": "Server Error"
}
```

---

### 4. Get Group Messages
**Endpoint:** `GET /api/chat/messages/:groupId`

**Authentication:** Required (Bearer Token)

**URL Parameters:**
- `groupId` (integer, required): ID of the group

**Response (Success - 200):**
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

**Response (Error - 500):**
```json
{
  "success": false,
  "message": "Server Error"
}
```

---

## Socket Events

### Join Group
**Event:** `joinGroup`

**Data:**
```javascript
socket.emit('joinGroup', groupId);
```

**Description:** User joins a group room to receive real-time messages

---

### Send Message
**Event:** `sendMessage`

**Data:**
```javascript
socket.emit('sendMessage', {
  group_id: 1,
  sender_id: 2,
  message: "Hello everyone!"
});
```

**Description:** Send a message to a group

---

### Receive Message
**Event:** `receiveMessage`

**Data:**
```javascript
socket.on('receiveMessage', (messageData) => {
  console.log(messageData);
  // {
  //   id: 1,
  //   group_id: 1,
  //   sender_id: 2,
  //   message: "Hello everyone!",
  //   created_at: "2024-01-15T10:35:00.000Z"
  // }
});
```

**Description:** Receive real-time messages from group members

---

## Implementation Details

### Transaction Handling
- All group creation operations use MySQL transactions
- Ensures data consistency when inserting group and members
- Automatic rollback on any error

### Duplicate Prevention
- Uses `INSERT IGNORE` to prevent duplicate group members
- Automatically removes duplicate member IDs from the input array
- Creator is automatically added and deduplicated

### Error Handling
- Comprehensive validation for all inputs
- Proper HTTP status codes (201 for creation, 400 for validation errors, 500 for server errors)
- Detailed error messages for debugging

### Database Connection
- Uses shared connection pool from `src/config/db.js`
- No duplicate connections created
- Proper connection release in finally block

---

## Authentication

All endpoints require a valid JWT token in the Authorization header:

```
Authorization: Bearer <JWT_TOKEN>
```

The token is verified using the `verifyToken` middleware which extracts the user ID and attaches it to the request object.

---

## Error Codes

| Status Code | Meaning |
|-------------|---------|
| 201 | Group created successfully |
| 200 | Request successful |
| 400 | Bad request (validation error) |
| 401 | Unauthorized (invalid/missing token) |
| 500 | Server error |

---

## Usage Examples

### Create a Group (cURL)
```bash
curl -X POST http://localhost:3000/api/chat/create-group \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "group_name": "Frontend Team",
    "group_description": "Frontend developers discussion group",
    "members": [2, 3, 4]
  }'
```

### Get Users (cURL)
```bash
curl -X GET http://localhost:3000/api/chat/users \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Get My Groups (cURL)
```bash
curl -X GET http://localhost:3000/api/chat/groups \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Get Group Messages (cURL)
```bash
curl -X GET http://localhost:3000/api/chat/messages/1 \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

## Notes

- All timestamps are in UTC format
- Group names are trimmed of whitespace
- Only active users are returned in the users list
- Creator is automatically added as the first member
- Members array can be empty (only creator will be added)
- Group descriptions are optional (can be null)
