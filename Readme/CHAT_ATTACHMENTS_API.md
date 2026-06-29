# Chat Attachments & Voice Notes API - Complete Documentation

## Overview

This document describes the enhanced Chat API with support for attachments (images, documents) and voice notes, along with improved security for group member removal.

---

## Database Schema Updates

### Messages Table Enhancement

```sql
ALTER TABLE messages 
ADD COLUMN message_type ENUM('text','image','document','voice') DEFAULT 'text',
ADD COLUMN file_url TEXT NULL,
ADD COLUMN file_name VARCHAR(255) NULL,
ADD COLUMN file_mime VARCHAR(100) NULL,
ADD COLUMN file_size INT NULL;
```

**New Columns:**
- `message_type` - Type of message (text, image, document, voice)
- `file_url` - URL/path to uploaded file
- `file_name` - Original filename
- `file_mime` - MIME type of file
- `file_size` - File size in bytes

---

## File Upload Configuration

### Supported File Types

**Images:**
- JPEG (.jpg, .jpeg)
- PNG (.png)
- WebP (.webp)

**Documents:**
- PDF (.pdf)
- Word (.doc, .docx)

**Voice Notes:**
- WebM (.webm)
- MP3 (.mp3)
- WAV (.wav)
- M4A (.m4a)

### File Size Limits
- **Images & Documents:** 10MB max
- **Voice Notes:** 10MB max

### Upload Directories
- **Images & Documents:** `uploads/chat/`
- **Voice Notes:** `uploads/chat/voice/`

---

## API Endpoints

### 1. Send Attachment Message
**Endpoint:** `POST /api/chat/send-attachment`

**Authentication:** Required (Bearer Token)

**Middleware:**
- `verifyToken` - JWT authentication
- `uploadChatFile.single("file")` - File upload (images/documents)

**Request:**
- **Form Data:**
  - `file` (required) - Image or document file
  - `group_id` (required) - Group ID
  - `message` (optional) - Caption or message text
  - `message_type` (required) - "image" or "document"

**Example Request:**
```bash
curl -X POST http://localhost:3000/api/chat/send-attachment \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "file=@image.png" \
  -F "group_id=1" \
  -F "message=Check this out!" \
  -F "message_type=image"
```

**Response (Success - 201):**
```json
{
  "success": true,
  "message": "Attachment sent successfully",
  "data": {
    "id": 10,
    "group_id": 1,
    "sender_id": 2,
    "sender_name": "John Doe",
    "message": "Check this out!",
    "message_type": "image",
    "file_url": "/uploads/chat/image-1234567890.png",
    "file_name": "image.png",
    "file_mime": "image/png",
    "file_size": 245678,
    "created_at": "2026-05-20T10:30:00.000Z"
  }
}
```

**Response (Error - 400):**
```json
{
  "success": false,
  "message": "Group ID is required"
}
```

**Response (Error - 403):**
```json
{
  "success": false,
  "message": "You are not a member of this group"
}
```

**Response (Error - 500):**
```json
{
  "success": false,
  "message": "Failed to send attachment"
}
```

**Features:**
- Validates group membership
- Supports optional caption/message
- Stores file metadata in database
- Emits real-time socket event
- Returns complete message data

---

### 2. Send Voice Note Message
**Endpoint:** `POST /api/chat/send-voice`

**Authentication:** Required (Bearer Token)

**Middleware:**
- `verifyToken` - JWT authentication
- `uploadVoiceFile.single("voice")` - Voice file upload

**Request:**
- **Form Data:**
  - `voice` (required) - Audio file (WebM, MP3, WAV, M4A)
  - `group_id` (required) - Group ID

**Example Request:**
```bash
curl -X POST http://localhost:3000/api/chat/send-voice \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "voice=@voice-note.mp3" \
  -F "group_id=1"
```

**Response (Success - 201):**
```json
{
  "success": true,
  "message": "Voice note sent successfully",
  "data": {
    "id": 11,
    "group_id": 1,
    "sender_id": 2,
    "sender_name": "John Doe",
    "message": null,
    "message_type": "voice",
    "file_url": "/uploads/chat/voice/voice-note-1234567890.mp3",
    "file_name": "voice-note.mp3",
    "file_mime": "audio/mpeg",
    "file_size": 512345,
    "created_at": "2026-05-20T10:35:00.000Z"
  }
}
```

**Response (Error - 400):**
```json
{
  "success": false,
  "message": "Voice file is required"
}
```

**Response (Error - 403):**
```json
{
  "success": false,
  "message": "You are not a member of this group"
}
```

**Response (Error - 500):**
```json
{
  "success": false,
  "message": "Failed to send voice note"
}
```

**Features:**
- Validates group membership
- Stores voice file with metadata
- Emits real-time socket event
- Returns complete message data

---

### 3. Remove Group Member (Enhanced)
**Endpoint:** `DELETE /api/chat/remove-member`

**Authentication:** Required (Bearer Token)

**Request Body:**
```json
{
  "group_id": 1,
  "user_id": 3
}
```

**Response (Success - 200):**
```json
{
  "success": true,
  "message": "Member removed successfully"
}
```

**Response (Error - 400 - Creator):**
```json
{
  "success": false,
  "message": "Group creator cannot be removed"
}
```

**Response (Error - 403 - Permission):**
```json
{
  "success": false,
  "message": "You don't have permission to remove members from this group"
}
```

**Response (Error - 404):**
```json
{
  "success": false,
  "message": "Group not found"
}
```

**Security Features:**
- Only group creator, admin, or super_admin can remove members
- Prevents creator removal
- Validates group existence
- Emits socket event for real-time updates

---

## Socket Events

### Receive Message Event
**Event:** `receiveMessage`

**Emitted by:** Server (after sending attachment, voice, or text message)

**Data:**
```javascript
{
  id: 10,
  group_id: 1,
  sender_id: 2,
  sender_name: "John Doe",
  message: "Check this out!",
  message_type: "image",
  file_url: "/uploads/chat/image-1234567890.png",
  file_name: "image.png",
  file_mime: "image/png",
  file_size: 245678,
  created_at: "2026-05-20T10:30:00.000Z"
}
```

**Usage:**
```javascript
socket.on('receiveMessage', (messageData) => {
  console.log('New message:', messageData);
  
  if (messageData.message_type === 'image') {
    // Display image
    displayImage(messageData.file_url);
  } else if (messageData.message_type === 'document') {
    // Display document link
    displayDocument(messageData.file_url, messageData.file_name);
  } else if (messageData.message_type === 'voice') {
    // Display audio player
    displayAudioPlayer(messageData.file_url);
  } else {
    // Display text message
    displayText(messageData.message);
  }
});
```

### Members Updated Event
**Event:** `membersUpdated`

**Emitted by:** Server (after adding or removing members)

**Data:**
```javascript
{
  group_id: 1
}
```

---

## Frontend Integration Examples

### React Component - Send Attachment

```javascript
import { useState } from 'react';
import axios from 'axios';

function SendAttachment({ groupId, socket }) {
  const [file, setFile] = useState(null);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('image');
  const [loading, setLoading] = useState(false);

  const token = localStorage.getItem('authToken');
  const api = axios.create({
    baseURL: 'http://localhost:3000/api',
    headers: { 'Authorization': `Bearer ${token}` }
  });

  const handleSendAttachment = async (e) => {
    e.preventDefault();
    if (!file) return;

    setLoading(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('group_id', groupId);
    formData.append('message', message);
    formData.append('message_type', messageType);

    try {
      const response = await api.post('/chat/send-attachment', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      if (response.data.success) {
        setFile(null);
        setMessage('');
        console.log('Attachment sent:', response.data.data);
      }
    } catch (error) {
      console.error('Error sending attachment:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSendAttachment}>
      <select value={messageType} onChange={(e) => setMessageType(e.target.value)}>
        <option value="image">Image</option>
        <option value="document">Document</option>
      </select>
      
      <input
        type="file"
        onChange={(e) => setFile(e.target.files[0])}
        accept={messageType === 'image' ? 'image/*' : '.pdf,.doc,.docx'}
      />
      
      <input
        type="text"
        placeholder="Optional caption"
        value={message}
        onChange={(e) => setMessage(e.target.value)}
      />
      
      <button type="submit" disabled={!file || loading}>
        {loading ? 'Sending...' : 'Send'}
      </button>
    </form>
  );
}

export default SendAttachment;
```

### React Component - Send Voice Note

```javascript
import { useState, useRef } from 'react';
import axios from 'axios';

function SendVoiceNote({ groupId, socket }) {
  const [recording, setRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState(null);
  const mediaRecorderRef = useRef(null);

  const token = localStorage.getItem('authToken');
  const api = axios.create({
    baseURL: 'http://localhost:3000/api',
    headers: { 'Authorization': `Bearer ${token}` }
  });

  const startRecording = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const mediaRecorder = new MediaRecorder(stream);
    mediaRecorderRef.current = mediaRecorder;

    const chunks = [];
    mediaRecorder.ondataavailable = (e) => chunks.push(e.data);
    mediaRecorder.onstop = () => {
      const blob = new Blob(chunks, { type: 'audio/webm' });
      setAudioBlob(blob);
    };

    mediaRecorder.start();
    setRecording(true);
  };

  const stopRecording = () => {
    mediaRecorderRef.current.stop();
    setRecording(false);
  };

  const sendVoiceNote = async () => {
    if (!audioBlob) return;

    const formData = new FormData();
    formData.append('voice', audioBlob, 'voice-note.webm');
    formData.append('group_id', groupId);

    try {
      const response = await api.post('/chat/send-voice', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      if (response.data.success) {
        setAudioBlob(null);
        console.log('Voice note sent:', response.data.data);
      }
    } catch (error) {
      console.error('Error sending voice note:', error);
    }
  };

  return (
    <div>
      {!recording ? (
        <button onClick={startRecording}>Start Recording</button>
      ) : (
        <button onClick={stopRecording}>Stop Recording</button>
      )}

      {audioBlob && (
        <>
          <audio controls src={URL.createObjectURL(audioBlob)} />
          <button onClick={sendVoiceNote}>Send Voice Note</button>
        </>
      )}
    </div>
  );
}

export default SendVoiceNote;
```

### React Component - Display Messages

```javascript
function ChatMessages({ messages }) {
  return (
    <div className="messages">
      {messages.map((msg) => (
        <div key={msg.id} className="message">
          <strong>{msg.sender_name}</strong>

          {msg.message_type === 'text' && (
            <p>{msg.message}</p>
          )}

          {msg.message_type === 'image' && (
            <>
              {msg.message && <p>{msg.message}</p>}
              <img src={msg.file_url} alt="attachment" style={{ maxWidth: '300px' }} />
            </>
          )}

          {msg.message_type === 'document' && (
            <>
              {msg.message && <p>{msg.message}</p>}
              <a href={msg.file_url} download={msg.file_name}>
                📄 {msg.file_name}
              </a>
            </>
          )}

          {msg.message_type === 'voice' && (
            <audio controls src={msg.file_url} />
          )}

          <small>{new Date(msg.created_at).toLocaleTimeString()}</small>
        </div>
      ))}
    </div>
  );
}

export default ChatMessages;
```

---

## Security Features

### Authentication
- JWT token required on all endpoints
- User identity verified from token

### Authorization
- Group membership verified before sending attachments/voice
- Only creator, admin, or super_admin can remove members
- Creator cannot be removed from group

### File Validation
- MIME type validation for all uploads
- File size limits enforced (10MB max)
- Filename sanitization

### Data Protection
- Parameterized queries prevent SQL injection
- Error messages don't expose sensitive data
- Proper error handling

---

## Error Handling

### Common Errors

**Missing File:**
```json
{
  "success": false,
  "message": "File is required"
}
```

**Invalid File Type:**
```json
{
  "success": false,
  "message": "Invalid file type. Allowed types: JPEG, PNG, WebP, PDF, DOC, DOCX"
}
```

**File Too Large:**
```json
{
  "success": false,
  "message": "File too large"
}
```

**Not Group Member:**
```json
{
  "success": false,
  "message": "You are not a member of this group"
}
```

**Permission Denied:**
```json
{
  "success": false,
  "message": "You don't have permission to remove members from this group"
}
```

---

## Testing with cURL

### Send Image
```bash
curl -X POST http://localhost:3000/api/chat/send-attachment \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "file=@image.png" \
  -F "group_id=1" \
  -F "message=Check this!" \
  -F "message_type=image"
```

### Send Document
```bash
curl -X POST http://localhost:3000/api/chat/send-attachment \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "file=@document.pdf" \
  -F "group_id=1" \
  -F "message=Important document" \
  -F "message_type=document"
```

### Send Voice Note
```bash
curl -X POST http://localhost:3000/api/chat/send-voice \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "voice=@voice-note.mp3" \
  -F "group_id=1"
```

### Remove Member
```bash
curl -X DELETE http://localhost:3000/api/chat/remove-member \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"group_id":1,"user_id":3}'
```

---

## Performance Considerations

- Files served statically via Express
- Efficient database queries with proper indexing
- Socket events for real-time updates
- Connection pooling for database efficiency

---

## Backward Compatibility

✅ All existing chat features work unchanged:
- Create group
- Get groups
- Get messages
- Group members management
- Text messages
- Socket events

---

## Notes

- All timestamps in UTC format
- File URLs are relative paths (e.g., `/uploads/chat/file.png`)
- Message type defaults to 'text' for backward compatibility
- Voice notes don't have message text (message field is null)
- Attachments can have optional caption/message
- Files are stored with unique names to prevent conflicts

---

## Related APIs

- `POST /api/chat/create-group` - Create group
- `GET /api/chat/groups` - Get user's groups
- `GET /api/chat/messages/:groupId` - Get messages
- `GET /api/chat/group-members/:groupId` - Get members
- `POST /api/chat/add-members` - Add members
- `DELETE /api/chat/remove-member` - Remove member
