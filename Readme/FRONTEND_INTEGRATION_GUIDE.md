# Chat Group API - Frontend Integration Guide

## 🎯 Overview

This guide provides frontend developers with examples of how to integrate with the Chat Group API.

---

## 📦 Prerequisites

- Valid JWT token from authentication
- Socket.io client library
- Axios or Fetch API for HTTP requests

---

## 🔐 Authentication Setup

```javascript
// Store token from login response
const token = localStorage.getItem('authToken');

// Create axios instance with default headers
import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:3000/api',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
});
```

---

## 📝 API Integration Examples

### 1. Create a Chat Group

```javascript
// Function to create group
async function createChatGroup(groupName, description, memberIds) {
  try {
    const response = await api.post('/chat/create-group', {
      group_name: groupName,
      group_description: description,
      members: memberIds
    });

    if (response.data.success) {
      console.log('Group created:', response.data.group);
      return response.data.group;
    }
  } catch (error) {
    console.error('Error creating group:', error.response?.data?.message);
    throw error;
  }
}

// Usage
const newGroup = await createChatGroup(
  'Frontend Team',
  'Frontend developers discussion group',
  [2, 3, 4]
);
```

### 2. Get Users for Group Selection

```javascript
// Function to fetch users
async function fetchUsersForGroupSelection() {
  try {
    const response = await api.get('/chat/users');

    if (response.data.success) {
      console.log('Users:', response.data.users);
      return response.data.users;
    }
  } catch (error) {
    console.error('Error fetching users:', error.response?.data?.message);
    throw error;
  }
}

// Usage in React component
import { useState, useEffect } from 'react';

function CreateGroupForm() {
  const [users, setUsers] = useState([]);
  const [selectedMembers, setSelectedMembers] = useState([]);

  useEffect(() => {
    fetchUsersForGroupSelection().then(setUsers);
  }, []);

  return (
    <div>
      <h2>Create Group</h2>
      <select 
        multiple 
        onChange={(e) => setSelectedMembers(
          Array.from(e.target.selectedOptions, option => parseInt(option.value))
        )}
      >
        {users.map(user => (
          <option key={user.id} value={user.id}>
            {user.name} ({user.email})
          </option>
        ))}
      </select>
    </div>
  );
}
```

### 3. Get My Groups

```javascript
// Function to fetch user's groups
async function fetchMyGroups() {
  try {
    const response = await api.get('/chat/groups');

    if (response.data.success) {
      console.log('My groups:', response.data.data);
      return response.data.data;
    }
  } catch (error) {
    console.error('Error fetching groups:', error.response?.data?.message);
    throw error;
  }
}

// Usage in React component
function GroupsList() {
  const [groups, setGroups] = useState([]);

  useEffect(() => {
    fetchMyGroups().then(setGroups);
  }, []);

  return (
    <div>
      <h2>My Groups</h2>
      <ul>
        {groups.map(group => (
          <li key={group.id}>
            <h3>{group.group_name}</h3>
            <p>{group.group_description}</p>
            <small>Created: {new Date(group.created_at).toLocaleDateString()}</small>
          </li>
        ))}
      </ul>
    </div>
  );
}
```

### 4. Get Group Messages

```javascript
// Function to fetch group messages
async function fetchGroupMessages(groupId) {
  try {
    const response = await api.get(`/chat/messages/${groupId}`);

    if (response.data.success) {
      console.log('Messages:', response.data.data);
      return response.data.data;
    }
  } catch (error) {
    console.error('Error fetching messages:', error.response?.data?.message);
    throw error;
  }
}

// Usage in React component
function GroupMessages({ groupId }) {
  const [messages, setMessages] = useState([]);

  useEffect(() => {
    fetchGroupMessages(groupId).then(setMessages);
  }, [groupId]);

  return (
    <div>
      <h2>Messages</h2>
      <div className="messages-list">
        {messages.map(msg => (
          <div key={msg.id} className="message">
            <strong>{msg.name}</strong>
            <p>{msg.message}</p>
            <small>{new Date(msg.created_at).toLocaleTimeString()}</small>
          </div>
        ))}
      </div>
    </div>
  );
}
```

---

## 🔌 Socket.io Integration

### 1. Setup Socket Connection

```javascript
import io from 'socket.io-client';

// Create socket connection
const socket = io('http://localhost:3000', {
  auth: {
    token: localStorage.getItem('authToken')
  }
});

socket.on('connect', () => {
  console.log('Connected to socket server');
});

socket.on('disconnect', () => {
  console.log('Disconnected from socket server');
});
```

### 2. Join a Group

```javascript
// Join group room
function joinGroup(groupId) {
  socket.emit('joinGroup', groupId);
  console.log(`Joined group ${groupId}`);
}

// Usage
joinGroup(1);
```

### 3. Send Message

```javascript
// Send message to group
function sendMessage(groupId, senderId, message) {
  socket.emit('sendMessage', {
    group_id: groupId,
    sender_id: senderId,
    message: message
  });
}

// Usage
sendMessage(1, 2, 'Hello everyone!');
```

### 4. Receive Messages

```javascript
// Listen for incoming messages
socket.on('receiveMessage', (messageData) => {
  console.log('New message:', messageData);
  // Update UI with new message
  setMessages(prev => [...prev, messageData]);
});
```

---

## 🎨 Complete React Component Example

```javascript
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import io from 'socket.io-client';

const ChatGroupComponent = () => {
  const [groups, setGroups] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [users, setUsers] = useState([]);
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [groupName, setGroupName] = useState('');
  const [groupDescription, setGroupDescription] = useState('');
  const [socket, setSocket] = useState(null);

  const token = localStorage.getItem('authToken');
  const userId = localStorage.getItem('userId');

  const api = axios.create({
    baseURL: 'http://localhost:3000/api',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });

  // Initialize socket
  useEffect(() => {
    const newSocket = io('http://localhost:3000', {
      auth: { token }
    });

    newSocket.on('receiveMessage', (messageData) => {
      setMessages(prev => [...prev, messageData]);
    });

    setSocket(newSocket);

    return () => newSocket.close();
  }, [token]);

  // Fetch groups on mount
  useEffect(() => {
    fetchGroups();
    fetchUsers();
  }, []);

  // Fetch messages when group changes
  useEffect(() => {
    if (selectedGroup) {
      fetchMessages(selectedGroup.id);
      socket?.emit('joinGroup', selectedGroup.id);
    }
  }, [selectedGroup, socket]);

  const fetchGroups = async () => {
    try {
      const response = await api.get('/chat/groups');
      setGroups(response.data.data);
    } catch (error) {
      console.error('Error fetching groups:', error);
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await api.get('/chat/users');
      setUsers(response.data.users);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const fetchMessages = async (groupId) => {
    try {
      const response = await api.get(`/chat/messages/${groupId}`);
      setMessages(response.data.data);
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  };

  const handleCreateGroup = async (e) => {
    e.preventDefault();
    try {
      const response = await api.post('/chat/create-group', {
        group_name: groupName,
        group_description: groupDescription,
        members: selectedMembers
      });

      if (response.data.success) {
        setGroupName('');
        setGroupDescription('');
        setSelectedMembers([]);
        fetchGroups();
        alert('Group created successfully!');
      }
    } catch (error) {
      alert('Error creating group: ' + error.response?.data?.message);
    }
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (newMessage.trim() && selectedGroup) {
      socket?.emit('sendMessage', {
        group_id: selectedGroup.id,
        sender_id: parseInt(userId),
        message: newMessage
      });
      setNewMessage('');
    }
  };

  return (
    <div className="chat-container">
      <div className="sidebar">
        <h2>Groups</h2>
        <div className="groups-list">
          {groups.map(group => (
            <div
              key={group.id}
              className={`group-item ${selectedGroup?.id === group.id ? 'active' : ''}`}
              onClick={() => setSelectedGroup(group)}
            >
              {group.group_name}
            </div>
          ))}
        </div>

        <h3>Create New Group</h3>
        <form onSubmit={handleCreateGroup}>
          <input
            type="text"
            placeholder="Group Name"
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
            required
          />
          <textarea
            placeholder="Group Description"
            value={groupDescription}
            onChange={(e) => setGroupDescription(e.target.value)}
          />
          <select
            multiple
            value={selectedMembers.map(String)}
            onChange={(e) => setSelectedMembers(
              Array.from(e.target.selectedOptions, option => parseInt(option.value))
            )}
          >
            {users.map(user => (
              <option key={user.id} value={user.id}>
                {user.name}
              </option>
            ))}
          </select>
          <button type="submit">Create Group</button>
        </form>
      </div>

      <div className="chat-area">
        {selectedGroup ? (
          <>
            <h2>{selectedGroup.group_name}</h2>
            <div className="messages">
              {messages.map(msg => (
                <div key={msg.id} className="message">
                  <strong>{msg.name}</strong>
                  <p>{msg.message}</p>
                  <small>{new Date(msg.created_at).toLocaleTimeString()}</small>
                </div>
              ))}
            </div>
            <form onSubmit={handleSendMessage}>
              <input
                type="text"
                placeholder="Type a message..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
              />
              <button type="submit">Send</button>
            </form>
          </>
        ) : (
          <p>Select a group to start chatting</p>
        )}
      </div>
    </div>
  );
};

export default ChatGroupComponent;
```

---

## 🛠️ Vue.js Integration Example

```vue
<template>
  <div class="chat-container">
    <div class="sidebar">
      <h2>Groups</h2>
      <div class="groups-list">
        <div
          v-for="group in groups"
          :key="group.id"
          :class="['group-item', { active: selectedGroup?.id === group.id }]"
          @click="selectGroup(group)"
        >
          {{ group.group_name }}
        </div>
      </div>

      <h3>Create New Group</h3>
      <form @submit.prevent="createGroup">
        <input v-model="groupName" placeholder="Group Name" required />
        <textarea v-model="groupDescription" placeholder="Group Description" />
        <select v-model="selectedMembers" multiple>
          <option v-for="user in users" :key="user.id" :value="user.id">
            {{ user.name }}
          </option>
        </select>
        <button type="submit">Create Group</button>
      </form>
    </div>

    <div class="chat-area">
      <template v-if="selectedGroup">
        <h2>{{ selectedGroup.group_name }}</h2>
        <div class="messages">
          <div v-for="msg in messages" :key="msg.id" class="message">
            <strong>{{ msg.name }}</strong>
            <p>{{ msg.message }}</p>
            <small>{{ new Date(msg.created_at).toLocaleTimeString() }}</small>
          </div>
        </div>
        <form @submit.prevent="sendMessage">
          <input v-model="newMessage" placeholder="Type a message..." />
          <button type="submit">Send</button>
        </form>
      </template>
      <p v-else>Select a group to start chatting</p>
    </div>
  </div>
</template>

<script>
import axios from 'axios';
import io from 'socket.io-client';

export default {
  data() {
    return {
      groups: [],
      selectedGroup: null,
      messages: [],
      newMessage: '',
      users: [],
      selectedMembers: [],
      groupName: '',
      groupDescription: '',
      socket: null,
      token: localStorage.getItem('authToken'),
      userId: localStorage.getItem('userId')
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
  mounted() {
    this.initSocket();
    this.fetchGroups();
    this.fetchUsers();
  },
  methods: {
    initSocket() {
      this.socket = io('http://localhost:3000', {
        auth: { token: this.token }
      });

      this.socket.on('receiveMessage', (messageData) => {
        this.messages.push(messageData);
      });
    },
    async fetchGroups() {
      try {
        const response = await this.api.get('/chat/groups');
        this.groups = response.data.data;
      } catch (error) {
        console.error('Error fetching groups:', error);
      }
    },
    async fetchUsers() {
      try {
        const response = await this.api.get('/chat/users');
        this.users = response.data.users;
      } catch (error) {
        console.error('Error fetching users:', error);
      }
    },
    async fetchMessages(groupId) {
      try {
        const response = await this.api.get(`/chat/messages/${groupId}`);
        this.messages = response.data.data;
      } catch (error) {
        console.error('Error fetching messages:', error);
      }
    },
    selectGroup(group) {
      this.selectedGroup = group;
      this.fetchMessages(group.id);
      this.socket.emit('joinGroup', group.id);
    },
    async createGroup() {
      try {
        const response = await this.api.post('/chat/create-group', {
          group_name: this.groupName,
          group_description: this.groupDescription,
          members: this.selectedMembers
        });

        if (response.data.success) {
          this.groupName = '';
          this.groupDescription = '';
          this.selectedMembers = [];
          this.fetchGroups();
          alert('Group created successfully!');
        }
      } catch (error) {
        alert('Error creating group: ' + error.response?.data?.message);
      }
    },
    sendMessage() {
      if (this.newMessage.trim() && this.selectedGroup) {
        this.socket.emit('sendMessage', {
          group_id: this.selectedGroup.id,
          sender_id: parseInt(this.userId),
          message: this.newMessage
        });
        this.newMessage = '';
      }
    }
  },
  beforeUnmount() {
    this.socket?.close();
  }
};
</script>
```

---

## 🚨 Error Handling

```javascript
// Comprehensive error handling
async function handleApiCall(apiFunction) {
  try {
    return await apiFunction();
  } catch (error) {
    const errorMessage = error.response?.data?.message || 'An error occurred';
    
    if (error.response?.status === 400) {
      console.error('Validation error:', errorMessage);
      // Show validation error to user
    } else if (error.response?.status === 401) {
      console.error('Unauthorized - redirecting to login');
      // Redirect to login
    } else if (error.response?.status === 500) {
      console.error('Server error:', errorMessage);
      // Show server error message
    }
    
    throw error;
  }
}
```

---

## 📱 Mobile Considerations

- Use responsive design for group list and chat area
- Implement virtual scrolling for large message lists
- Handle connection loss gracefully
- Implement message queue for offline support
- Use local storage for draft messages

---

## 🔒 Security Best Practices

- Always validate token before making requests
- Sanitize user input before sending
- Implement rate limiting on frontend
- Use HTTPS in production
- Implement CSRF protection
- Validate all responses from server

---

## 📊 Performance Tips

- Implement pagination for messages
- Use lazy loading for groups
- Cache user list
- Implement message virtualization
- Debounce socket events
- Use connection pooling

---

## 🐛 Debugging

```javascript
// Enable debug logging
localStorage.setItem('debug', 'socket.io-client:*');

// Log all API calls
api.interceptors.request.use(config => {
  console.log('API Request:', config);
  return config;
});

api.interceptors.response.use(response => {
  console.log('API Response:', response);
  return response;
});
```

---

## 📞 Support

For issues or questions, refer to:
- `CHAT_API_DOCUMENTATION.md` - API documentation
- `QUICK_REFERENCE.md` - Quick reference
- Backend code comments - Implementation details
