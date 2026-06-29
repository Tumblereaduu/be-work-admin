# Chat Attachments & Voice Notes - Quick Reference

## 🚀 Quick Start

### Send Image
```bash
curl -X POST http://localhost:3000/api/chat/send-attachment \
  -H "Authorization: Bearer TOKEN" \
  -F "file=@image.png" \
  -F "group_id=1" \
  -F "message=Check this!" \
  -F "message_type=image"
```

### Send Document
```bash
curl -X POST http://localhost:3000/api/chat/send-attachment \
  -H "Authorization: Bearer TOKEN" \
  -F "file=@document.pdf" \
  -F "group_id=1" \
  -F "message=Important doc" \
  -F "message_type=document"
```

### Send Voice Note
```bash
curl -X POST http://localhost:3000/api/chat/send-voice \
  -H "Authorization: Bearer TOKEN" \
  -F "voice=@voice.mp3" \
  -F "group_id=1"
```

### Remove Member (Enhanced)
```bash
curl -X DELETE http://localhost:3000/api/chat/remove-member \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"group_id":1,"user_id":3}'
```

---

## 📋 API Endpoints

| Method | Endpoint | Purpose | Auth |
|--------|----------|---------|------|
| POST | `/api/chat/send-attachment` | Send image/document | ✅ |
| POST | `/api/chat/send-voice` | Send voice note | ✅ |
| DELETE | `/api/chat/remove-member` | Remove member (enhanced) | ✅ |

---

## 📁 Supported File Types

### Images
- JPEG (.jpg, .jpeg)
- PNG (.png)
- WebP (.webp)

### Documents
- PDF (.pdf)
- Word (.doc, .docx)

### Voice Notes
- WebM (.webm)
- MP3 (.mp3)
- WAV (.wav)
- M4A (.m4a)

### File Size Limits
- **All files:** 10MB max

---

## 📤 Upload Directories

- **Images & Documents:** `uploads/chat/`
- **Voice Notes:** `uploads/chat/voice/`

---

## 🔌 Socket Events

### Receive Message
```javascript
socket.on('receiveMessage', (data) => {
  // data.message_type: 'text', 'image', 'document', 'voice'
  // data.file_url: URL to file (if attachment/voice)
  // data.message: Text message (if text or caption)
});
```

### Members Updated
```javascript
socket.on('membersUpdated', (data) => {
  // data.group_id: Group ID
});
```

---

## 📊 Response Format

### Success Response
```json
{
  "success": true,
  "message": "Attachment sent successfully",
  "data": {
    "id": 10,
    "group_id": 1,
    "sender_id": 2,
    "sender_name": "John Doe",
    "message": "Caption",
    "message_type": "image",
    "file_url": "/uploads/chat/file.png",
    "file_name": "file.png",
    "file_mime": "image/png",
    "file_size": 245678,
    "created_at": "2026-05-20T10:30:00.000Z"
  }
}
```

### Error Response
```json
{
  "success": false,
  "message": "Error message"
}
```

---

## 🛡️ Security

✅ **Authentication**
- JWT token required

✅ **Authorization**
- Group membership verified
- Only creator/admin can remove members
- Creator cannot be removed

✅ **Validation**
- MIME type validation
- File size limits
- Filename sanitization

---

## 🧪 Testing Checklist

- [ ] Send image with caption
- [ ] Send image without caption
- [ ] Send document with caption
- [ ] Send voice note
- [ ] Receive message via socket
- [ ] Remove member (as creator)
- [ ] Try to remove creator (should fail)
- [ ] Try to remove without permission (should fail)
- [ ] Test file size limit
- [ ] Test invalid file type

---

## 💡 Common Use Cases

### Send Image
```javascript
const formData = new FormData();
formData.append('file', imageFile);
formData.append('group_id', 1);
formData.append('message', 'Check this photo!');
formData.append('message_type', 'image');

await fetch('http://localhost:3000/api/chat/send-attachment', {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${token}` },
  body: formData
});
```

### Send Document
```javascript
const formData = new FormData();
formData.append('file', docFile);
formData.append('group_id', 1);
formData.append('message', 'Project proposal');
formData.append('message_type', 'document');

await fetch('http://localhost:3000/api/chat/send-attachment', {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${token}` },
  body: formData
});
```

### Send Voice Note
```javascript
const formData = new FormData();
formData.append('voice', audioBlob);
formData.append('group_id', 1);

await fetch('http://localhost:3000/api/chat/send-voice', {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${token}` },
  body: formData
});
```

### Display Message
```javascript
function displayMessage(msg) {
  if (msg.message_type === 'image') {
    return `<img src="${msg.file_url}" alt="image" />`;
  } else if (msg.message_type === 'document') {
    return `<a href="${msg.file_url}" download>${msg.file_name}</a>`;
  } else if (msg.message_type === 'voice') {
    return `<audio controls src="${msg.file_url}" />`;
  } else {
    return `<p>${msg.message}</p>`;
  }
}
```

---

## 🚨 Common Issues

**Issue:** "File is required"
- **Solution:** Ensure file is attached in form data

**Issue:** "Invalid file type"
- **Solution:** Check file MIME type is supported

**Issue:** "File too large"
- **Solution:** File exceeds 10MB limit

**Issue:** "You are not a member of this group"
- **Solution:** User must be added to group first

**Issue:** "You don't have permission to remove members"
- **Solution:** Only creator/admin can remove members

**Issue:** "Group creator cannot be removed"
- **Solution:** Cannot remove group creator

---

## 📝 Database Schema

```sql
ALTER TABLE messages 
ADD COLUMN message_type ENUM('text','image','document','voice') DEFAULT 'text',
ADD COLUMN file_url TEXT NULL,
ADD COLUMN file_name VARCHAR(255) NULL,
ADD COLUMN file_mime VARCHAR(100) NULL,
ADD COLUMN file_size INT NULL;
```

---

## 🔐 Permission Matrix

| Action | Creator | Admin | Super Admin | Staff |
|--------|---------|-------|-------------|-------|
| Send attachment | ✅ | ✅ | ✅ | ✅ |
| Send voice note | ✅ | ✅ | ✅ | ✅ |
| Remove member | ✅ | ✅ | ✅ | ❌ |
| Remove creator | ❌ | ❌ | ❌ | ❌ |

---

## 📞 Related APIs

- `POST /api/chat/create-group` - Create group
- `GET /api/chat/groups` - Get groups
- `GET /api/chat/messages/:groupId` - Get messages
- `GET /api/chat/group-members/:groupId` - Get members
- `POST /api/chat/add-members` - Add members

---

## ✅ Status

- ✅ Attachment support implemented
- ✅ Voice note support implemented
- ✅ Enhanced security for member removal
- ✅ Socket integration complete
- ✅ File serving configured
- ✅ Production ready

---

**Status: Production Ready ✅**
