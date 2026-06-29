# Group Members Management API - Documentation

## Overview

This document describes the Group Members Management API endpoints for managing chat group membership.

---

## API Endpoints

### 1. Get Group Members
**Endpoint:** `GET /api/chat/group-members/:groupId`

**Authentication:** Required (Bearer Token)

**URL Parameters:**
- `groupId` (integer, required): ID of the group

**Response (Success - 200):**
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
    },
    {
      "id": 2,
      "name": "Jane Smith",
      "email": "jane@gmail.com",
      "role": "staff",
      "joined_at": "2024-01-15T10:35:00.000Z"
    }
  ]
}
```

**Response (Error - 400):**
```json
{
  "success": false,
  "message": "Group ID is required"
}
```

**Response (Error - 500):**
```json
{
  "success": false,
  "message": "Server error"
}
```

**Features:**
- Returns all members of a group
- Includes user details (id, name, email, role)
- Sorted by join date (oldest first)
- Includes join timestamp for each member

---

### 2. Add Group Members
**Endpoint:** `POST /api/chat/add-members`

**Authentication:** Required (Bearer Token)

**Request Body:**
```json
{
  "group_id": 1,
  "members": [2, 3, 4]
}
```

**Request Parameters:**
- `group_id` (integer, required): ID of the group
- `members` (array, required): Array of user IDs to add

**Response (Success - 200):**
```json
{
  "success": true,
  "message": "Members added successfully"
}
```

**Response (Error - 400):**
```json
{
  "success": false,
  "message": "Group ID and members array are required"
}
```

**Response (Error - 500):**
```json
{
  "success": false,
  "message": "Server error"
}
```

**Features:**
- Add multiple users to a group
- Automatically removes duplicate user IDs
- Uses INSERT IGNORE to prevent duplicate group memberships
- Emits `membersUpdated` socket event to notify group members
- Non-blocking: continues even if some users are already members

---

### 3. Remove Group Member
**Endpoint:** `DELETE /api/chat/remove-member`

**Authentication:** Required (Bearer Token)

**Request Body:**
```json
{
  "group_id": 1,
  "user_id": 3
}
```

**Request Parameters:**
- `group_id` (integer, required): ID of the group
- `user_id` (integer, required): ID of the user to remove

**Response (Success - 200):**
```json
{
  "success": true,
  "message": "Member removed successfully"
}
```

**Response (Error - 400):**
```json
{
  "success": false,
  "message": "Group ID and user ID are required"
}
```

**Response (Error - 400):**
```json
{
  "success": false,
  "message": "Group creator cannot be removed"
}
```

**Response (Error - 404):**
```json
{
  "success": false,
  "message": "Group not found"
}
```

**Response (Error - 500):**
```json
{
  "success": false,
  "message": "Server error"
}
```

**Features:**
- Remove a user from a group
- Prevents group creator from being removed
- Validates group existence
- Emits `membersUpdated` socket event to notify group members
- Proper error handling for edge cases

---

## Socket Events

### Members Updated Event
**Event:** `membersUpdated`

**Emitted by:** Server (after adding or removing members)

**Data:**
```javascript
{
  group_id: 1
}
```

**Usage:**
```javascript
socket.on('membersUpdated', (data) => {
  console.log(`Members updated in group ${data.group_id}`);
  // Refresh group members list
  fetchGroupMembers(data.group_id);
});
```

**Description:** Notifies all members in a group that the member list has changed. Frontend should refresh the members list when this event is received.

---

## Implementation Details

### Database Operations

#### Get Group Members
- Joins `group_members` and `users` tables
- Filters by group_id
- Returns user details and join timestamp
- Ordered by join date (ascending)

#### Add Group Members
- Uses `INSERT IGNORE` to prevent duplicate memberships
- Removes duplicate user IDs from input array
- Iterates through unique members and inserts each
- Non-blocking: continues even if user is already a member

#### Remove Group Member
- Validates group exists
- Checks if user is group creator
- Prevents creator removal
- Deletes member record from group_members table

### Error Handling

- Comprehensive validation for all inputs
- Proper HTTP status codes (200, 400, 404, 500)
- Detailed error messages for debugging
- Try-catch blocks with error logging

### Socket Integration

- Uses `req.app.get("io")` to access socket instance
- Emits `membersUpdated` event to group room
- Allows frontend to refresh members in real-time
- Gracefully handles missing io instance

---

## Usage Examples

### Get Group Members (cURL)
```bash
curl -X GET http://localhost:3000/api/chat/group-members/1 \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Add Members (cURL)
```bash
curl -X POST http://localhost:3000/api/chat/add-members \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "group_id": 1,
    "members": [2, 3, 4]
  }'
```

### Remove Member (cURL)
```bash
curl -X DELETE http://localhost:3000/api/chat/remove-member \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "group_id": 1,
    "user_id": 3
  }'
```

---

## Frontend Integration Examples

### React Component

```javascript
import { useState, useEffect } from 'react';
import axios from 'axios';

function GroupMembersManager({ groupId, socket }) {
  const [members, setMembers] = useState([]);
  const [availableUsers, setAvailableUsers] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState([]);

  const token = localStorage.getItem('authToken');
  const api = axios.create({
    baseURL: 'http://localhost:3000/api',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });

  // Fetch group members
  const fetchMembers = async () => {
    try {
      const response = await api.get(`/chat/group-members/${groupId}`);
      setMembers(response.data.members);
    } catch (error) {
      console.error('Error fetching members:', error);
    }
  };

  // Fetch available users
  const fetchAvailableUsers = async () => {
    try {
      const response = await api.get('/chat/users');
      setAvailableUsers(response.data.users);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  // Add members to group
  const handleAddMembers = async () => {
    try {
      await api.post('/chat/add-members', {
        group_id: groupId,
        members: selectedUsers
      });
      setSelectedUsers([]);
      fetchMembers();
    } catch (error) {
      console.error('Error adding members:', error);
    }
  };

  // Remove member from group
  const handleRemoveMember = async (userId) => {
    try {
      await api.delete('/chat/remove-member', {
        data: {
          group_id: groupId,
          user_id: userId
        }
      });
      fetchMembers();
    } catch (error) {
      console.error('Error removing member:', error);
    }
  };

  // Listen for members updated event
  useEffect(() => {
    socket?.on('membersUpdated', (data) => {
      if (data.group_id === groupId) {
        fetchMembers();
      }
    });

    return () => {
      socket?.off('membersUpdated');
    };
  }, [socket, groupId]);

  // Initial fetch
  useEffect(() => {
    fetchMembers();
    fetchAvailableUsers();
  }, [groupId]);

  return (
    <div className="members-manager">
      <h2>Group Members</h2>
      
      <div className="members-list">
        {members.map(member => (
          <div key={member.id} className="member-item">
            <span>{member.name} ({member.role})</span>
            <button 
              onClick={() => handleRemoveMember(member.id)}
              disabled={member.id === members[0].id} // Disable for creator
            >
              Remove
            </button>
          </div>
        ))}
      </div>

      <div className="add-members">
        <h3>Add Members</h3>
        <select 
          multiple 
          value={selectedUsers.map(String)}
          onChange={(e) => setSelectedUsers(
            Array.from(e.target.selectedOptions, option => parseInt(option.value))
          )}
        >
          {availableUsers.map(user => (
            <option key={user.id} value={user.id}>
              {user.name} ({user.email})
            </option>
          ))}
        </select>
        <button onClick={handleAddMembers}>Add Selected</button>
      </div>
    </div>
  );
}

export default GroupMembersManager;
```

### Vue.js Component

```vue
<template>
  <div class="members-manager">
    <h2>Group Members</h2>
    
    <div class="members-list">
      <div v-for="member in members" :key="member.id" class="member-item">
        <span>{{ member.name }} ({{ member.role }})</span>
        <button 
          @click="removeMember(member.id)"
          :disabled="isCreator(member.id)"
        >
          Remove
        </button>
      </div>
    </div>

    <div class="add-members">
      <h3>Add Members</h3>
      <select v-model="selectedUsers" multiple>
        <option v-for="user in availableUsers" :key="user.id" :value="user.id">
          {{ user.name }} ({{ user.email }})
        </option>
      </select>
      <button @click="addMembers">Add Selected</button>
    </div>
  </div>
</template>

<script>
import axios from 'axios';

export default {
  props: {
    groupId: Number,
    socket: Object
  },
  data() {
    return {
      members: [],
      availableUsers: [],
      selectedUsers: [],
      token: localStorage.getItem('authToken')
    };
  },
  computed: {
    api() {
      return axios.create({
        baseURL: 'http://localhost:3000/api',
        headers: {
          'Authorization': `Bearer ${this.token}`,
          'Content-Type': 'application/json'
        }
      });
    }
  },
  methods: {
    async fetchMembers() {
      try {
        const response = await this.api.get(`/chat/group-members/${this.groupId}`);
        this.members = response.data.members;
      } catch (error) {
        console.error('Error fetching members:', error);
      }
    },
    async fetchAvailableUsers() {
      try {
        const response = await this.api.get('/chat/users');
        this.availableUsers = response.data.users;
      } catch (error) {
        console.error('Error fetching users:', error);
      }
    },
    async addMembers() {
      try {
        await this.api.post('/chat/add-members', {
          group_id: this.groupId,
          members: this.selectedUsers
        });
        this.selectedUsers = [];
        this.fetchMembers();
      } catch (error) {
        console.error('Error adding members:', error);
      }
    },
    async removeMember(userId) {
      try {
        await this.api.delete('/chat/remove-member', {
          data: {
            group_id: this.groupId,
            user_id: userId
          }
        });
        this.fetchMembers();
      } catch (error) {
        console.error('Error removing member:', error);
      }
    },
    isCreator(userId) {
      return this.members.length > 0 && this.members[0].id === userId;
    }
  },
  mounted() {
    this.fetchMembers();
    this.fetchAvailableUsers();

    this.socket?.on('membersUpdated', (data) => {
      if (data.group_id === this.groupId) {
        this.fetchMembers();
      }
    });
  },
  beforeUnmount() {
    this.socket?.off('membersUpdated');
  }
};
</script>
```

---

## Error Handling

### Common Errors

**Error:** "Group ID is required"
- **Cause:** groupId parameter missing or invalid
- **Solution:** Ensure groupId is provided in URL

**Error:** "Group ID and members array are required"
- **Cause:** Missing group_id or members in request body
- **Solution:** Provide both group_id and members array

**Error:** "Group creator cannot be removed"
- **Cause:** Attempting to remove the group creator
- **Solution:** Only remove non-creator members

**Error:** "Group not found"
- **Cause:** Group ID doesn't exist
- **Solution:** Verify group ID is correct

---

## Security Considerations

- JWT authentication required on all endpoints
- Input validation on all parameters
- Creator protection prevents accidental group deletion
- Duplicate prevention prevents data inconsistency
- Error messages don't expose sensitive information

---

## Performance Considerations

- Efficient database queries with proper joins
- INSERT IGNORE prevents unnecessary database operations
- Socket events enable real-time updates without polling
- Batch operations reduce database round trips

---

## Notes

- All timestamps are in UTC format
- Members are sorted by join date (oldest first)
- Duplicate user IDs are automatically removed
- Creator cannot be removed from group
- Socket events are emitted to group room only
- Frontend should listen for `membersUpdated` event to refresh members

---

## Related APIs

- `POST /api/chat/create-group` - Create a new group
- `GET /api/chat/groups` - Get user's groups
- `GET /api/chat/users` - Get available users
- `GET /api/chat/messages/:groupId` - Get group messages
