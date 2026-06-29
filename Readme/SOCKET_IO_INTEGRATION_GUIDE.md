# Socket.io Integration Guide - Real-Time Chat

**Purpose:** Enable real-time messaging in chat groups using Socket.io  
**Backend:** Already configured in `src/server.js` and `src/socket/chatSocket.js`  
**Frontend:** Needs integration

---

## Backend Configuration (Already Complete ✅)

### Server Setup (`src/server.js`)

```javascript
import http from "http";
import { Server } from "socket.io";
import app from "./app.js";

const PORT = process.env.PORT || 5001;
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "http://localhost:3000", // Frontend URL
    methods: ["GET", "POST"],
    credentials: true,
  },
});

// Set io instance on app for use in controllers
app.set("io", io);

// Socket connection handling
io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  // User joins a group
  socket.on("joinGroup", (data) => {
    const roomName = `group_${data.group_id}`;
    socket.join(roomName);
    console.log(`User ${data.user_id} joined room ${roomName}`);
  });

  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
  });
});

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
```

### Socket Controller (`src/socket/chatSocket.js`)

Messages are emitted from controllers using the io instance.

---

## Frontend Integration Guide

### 1. Install Socket.io Client

```bash
npm install socket.io-client
```

### 2. Create Socket Context (Recommended)

**File:** `src/context/SocketContext.jsx`

```jsx
import React, { createContext, useContext, useEffect, useState } from "react";
import io from "socket.io-client";

const SocketContext = createContext();

export const useSocket = () => {
  return useContext(SocketContext);
};

export function SocketProvider({ children }) {
  const [socket, setSocket] = useState(null);
  const token = localStorage.getItem("authToken");

  useEffect(() => {
    if (!token) return;

    // Connect to Socket.io server
    const newSocket = io("http://localhost:5001", {
      auth: {
        token: token,
      },
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5,
    });

    newSocket.on("connect", () => {
      console.log("Connected to server");
    });

    newSocket.on("disconnect", () => {
      console.log("Disconnected from server");
    });

    setSocket(newSocket);

    // Cleanup on unmount
    return () => {
      newSocket.close();
    };
  }, [token]);

  return (
    <SocketContext.Provider value={socket}>{children}</SocketContext.Provider>
  );
}
```

### 3. Setup Socket Provider in App.jsx

```jsx
import { SocketProvider } from "./context/SocketContext";

function App() {
  return (
    <SocketProvider>
      {/* Your routes */}
    </SocketProvider>
  );
}
```

---

## Socket Events

### Event 1: Join Group

**When:** User opens a group chat

**Frontend Code:**
```javascript
import { useSocket } from "../context/SocketContext";

function ChatComponent({ selectedGroup }) {
  const socket = useSocket();

  useEffect(() => {
    if (socket && selectedGroup) {
      socket.emit("joinGroup", {
        group_id: selectedGroup.id,
        user_id: currentUser.id,
      });
    }
  }, [socket, selectedGroup]);
}
```

**Backend:**
```javascript
socket.on("joinGroup", (data) => {
  const roomName = `group_${data.group_id}`;
  socket.join(roomName);
});
```

---

### Event 2: Receive Message (Real-Time)

**When:** Any user sends a message to the group

**Backend Emits:**
```javascript
// In send-attachment, send-voice, or send-message controller
const io = req.app.get("io");
io.to(`group_${group_id}`).emit("receiveMessage", messageObject);
```

**Frontend Listens:**
```javascript
import { useSocket } from "../context/SocketContext";
import { useEffect, useState } from "react";

function ChatMessages({ groupId }) {
  const socket = useSocket();
  const [messages, setMessages] = useState([]);

  useEffect(() => {
    if (!socket) return;

    // Listen for incoming messages
    socket.on("receiveMessage", (newMessage) => {
      setMessages((prev) => [...prev, newMessage]);
    });

    // Cleanup listener
    return () => {
      socket.off("receiveMessage");
    };
  }, [socket]);

  return (
    <div className="messages-container">
      {messages.map((msg) => (
        <div key={msg.id} className="message">
          {/* Render message based on type */}
          {msg.message_type === "text" && <p>{msg.message}</p>}
          
          {msg.message_type === "image" && (
            <img src={`http://localhost:5001${msg.file_url}`} />
          )}
          
          {msg.message_type === "document" && (
            <a href={`http://localhost:5001${msg.file_url}`} target="_blank">
              {msg.file_name}
            </a>
          )}
          
          {msg.message_type === "voice" && (
            <audio controls src={`http://localhost:5001${msg.file_url}`} />
          )}
        </div>
      ))}
    </div>
  );
}

export default ChatMessages;
```

---

### Event 3: Members Updated

**When:** Members are added or removed from group

**Backend Emits:**
```javascript
// In add-members or remove-member controller
const io = req.app.get("io");
io.to(`group_${group_id}`).emit("membersUpdated", {
  group_id: group_id,
  members: updatedMembersList,
  action: "added" || "removed",
});
```

**Frontend Listens:**
```javascript
function GroupMembers({ groupId }) {
  const socket = useSocket();
  const [members, setMembers] = useState([]);

  useEffect(() => {
    if (!socket) return;

    // Listen for member updates
    socket.on("membersUpdated", (data) => {
      if (data.group_id === groupId) {
        setMembers(data.members);
        
        if (data.action === "added") {
          toast.info("New member added to group");
        } else if (data.action === "removed") {
          toast.info("Member removed from group");
        }
      }
    });

    // Cleanup
    return () => {
      socket.off("membersUpdated");
    };
  }, [socket, groupId]);

  return (
    <div>
      {members.map((member) => (
        <div key={member.id}>{member.name}</div>
      ))}
    </div>
  );
}
```

---

## Complete Chat Component Example

```jsx
import { useEffect, useState, useRef } from "react";
import { useSocket } from "../context/SocketContext";
import { toast } from "react-toastify";
import api from "../api/api";

function Chat({ selectedGroup, currentUser }) {
  const socket = useSocket();
  const [messages, setMessages] = useState([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [members, setMembers] = useState([]);
  const messagesEndRef = useRef(null);

  // Join group on select
  useEffect(() => {
    if (socket && selectedGroup) {
      socket.emit("joinGroup", {
        group_id: selectedGroup.id,
        user_id: currentUser.id,
      });
    }
  }, [socket, selectedGroup]);

  // Load initial messages
  useEffect(() => {
    if (!selectedGroup) return;

    const loadMessages = async () => {
      try {
        const response = await api.get(
          `/chat/messages/${selectedGroup.id}`
        );
        if (response.data.success) {
          setMessages(response.data.messages);
        }
      } catch (error) {
        console.log("Error loading messages:", error);
      }
    };

    loadMessages();
  }, [selectedGroup]);

  // Load group members
  useEffect(() => {
    if (!selectedGroup) return;

    const loadMembers = async () => {
      try {
        const response = await api.get(
          `/chat/group-members/${selectedGroup.id}`
        );
        if (response.data.success) {
          setMembers(response.data.members);
        }
      } catch (error) {
        console.log("Error loading members:", error);
      }
    };

    loadMembers();
  }, [selectedGroup]);

  // Listen for new messages
  useEffect(() => {
    if (!socket) return;

    socket.on("receiveMessage", (newMessage) => {
      setMessages((prev) => [...prev, newMessage]);
      scrollToBottom();
    });

    return () => {
      socket.off("receiveMessage");
    };
  }, [socket]);

  // Listen for member updates
  useEffect(() => {
    if (!socket) return;

    socket.on("membersUpdated", (data) => {
      if (data.group_id === selectedGroup?.id) {
        setMembers(data.members);
      }
    });

    return () => {
      socket.off("membersUpdated");
    };
  }, [socket, selectedGroup]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleSendMessage = async () => {
    if (!message.trim() || !selectedGroup) return;

    try {
      setLoading(true);

      const response = await api.post("/chat/send-message", {
        group_id: selectedGroup.id,
        message: message.trim(),
      });

      if (response.data.success) {
        // Backend will emit via socket
        setMessage("");
        toast.success("Message sent");
      }
    } catch (error) {
      toast.error(
        error?.response?.data?.message || "Failed to send message"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-full flex-col">
      {/* Messages Container */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${
              msg.user_id === currentUser.id ? "justify-end" : "justify-start"
            }`}
          >
            <div
              className={`max-w-xs px-4 py-2 rounded-lg ${
                msg.user_id === currentUser.id
                  ? "bg-blue-600 text-white"
                  : "bg-gray-700 text-gray-100"
              }`}
            >
              <p className="text-xs opacity-70 mb-1">{msg.user_name}</p>

              {msg.message_type === "text" && <p>{msg.message}</p>}

              {msg.message_type === "image" && (
                <img
                  src={`http://localhost:5001${msg.file_url}`}
                  alt="attachment"
                  className="max-w-xs rounded"
                />
              )}

              {msg.message_type === "document" && (
                <a
                  href={`http://localhost:5001${msg.file_url}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-blue-300 underline"
                >
                  {msg.file_name}
                </a>
              )}

              {msg.message_type === "voice" && (
                <audio
                  controls
                  src={`http://localhost:5001${msg.file_url}`}
                  className="w-full"
                />
              )}

              <p className="text-xs opacity-50 mt-1">
                {new Date(msg.created_at).toLocaleTimeString()}
              </p>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="border-t border-gray-700 p-4">
        <div className="flex gap-2">
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
            placeholder="Type a message..."
            disabled={loading}
            className="flex-1 px-4 py-2 rounded-lg bg-gray-700 text-white"
          />
          <button
            onClick={handleSendMessage}
            disabled={loading || !message.trim()}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg disabled:opacity-50"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}

export default Chat;
```

---

## Troubleshooting

### Issue: Socket not connecting
**Solution:** 
- Check frontend URL in backend CORS config
- Verify token is in localStorage
- Check browser console for errors

### Issue: receiveMessage not firing
**Solution:**
- Verify user has joined group with `joinGroup` event
- Check backend logs for emit calls
- Verify group_id is correct

### Issue: Multiple connections
**Solution:**
- Use useEffect cleanup to avoid duplicate listeners
- Check that Socket context is not recreating socket

### Issue: Disconnect on token refresh
**Solution:**
- Store new token in localStorage
- Socket will auto-reconnect with new token

---

## Best Practices

### 1. Always Clean Up Listeners
```javascript
useEffect(() => {
  socket.on("eventName", handler);
  
  return () => {
    socket.off("eventName"); // Important!
  };
}, [socket]);
```

### 2. Use Custom Hook for Socket
```javascript
export function useChatMessages(groupId) {
  const socket = useSocket();
  const [messages, setMessages] = useState([]);

  useEffect(() => {
    if (!socket) return;

    socket.on("receiveMessage", (msg) => {
      if (msg.group_id === groupId) {
        setMessages((prev) => [...prev, msg]);
      }
    });

    return () => socket.off("receiveMessage");
  }, [socket, groupId]);

  return messages;
}

// Usage in component
const messages = useChatMessages(selectedGroup?.id);
```

### 3. Handle Reconnection
```javascript
useEffect(() => {
  if (!socket) return;

  socket.on("connect", () => {
    console.log("Reconnected");
    // Rejoin group if needed
    socket.emit("joinGroup", { group_id, user_id });
  });

  return () => socket.off("connect");
}, [socket]);
```

### 4. Debounce Frequent Events
```javascript
import { debounce } from "lodash";

const handleMembersUpdate = debounce((data) => {
  setMembers(data.members);
}, 300);

useEffect(() => {
  if (!socket) return;
  socket.on("membersUpdated", handleMembersUpdate);
  return () => socket.off("membersUpdated");
}, [socket]);
```

---

## Testing Socket Connections

### Browser DevTools

1. Open Chrome DevTools (F12)
2. Network tab → WS (WebSocket) filter
3. Look for connection to `localhost:5001`

### Logs
```javascript
// In SocketProvider
newSocket.on("connect", () => console.log("✅ Connected"));
newSocket.on("disconnect", () => console.log("❌ Disconnected"));
newSocket.on("connect_error", (err) => console.log("⚠️ Error:", err));
```

---

## Complete Integration Checklist

- [ ] Install socket.io-client
- [ ] Create SocketContext.jsx with provider
- [ ] Wrap App with SocketProvider
- [ ] Create custom hook for socket (useSocket)
- [ ] Implement joinGroup on group select
- [ ] Setup receiveMessage listener
- [ ] Setup membersUpdated listener
- [ ] Test real-time messages
- [ ] Test member updates
- [ ] Test disconnect/reconnect
- [ ] Verify socket auto-closes on logout

---

**Socket.io Integration Complete ✅**
