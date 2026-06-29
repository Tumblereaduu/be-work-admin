# Frontend Update Guide - React Toastify & Auth Handling

## Overview
This guide provides step-by-step instructions to update the frontend with react-toastify for better UX, password visibility toggle, proper token handling, and confirmation modals.

---

## Step 1: Install React Toastify

```bash
npm install react-toastify
```

---

## Step 2: Update App.jsx

**Add these imports at the top:**
```jsx
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
```

**Add ToastContainer in your JSX return (after main layout):**
```jsx
function App() {
  return (
    <>
      {/* Your existing routes/layout */}
      <ToastContainer
        position="top-right"
        autoClose={2500}
        hideProgressBar={false}
        newestOnTop={true}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="dark"
      />
    </>
  );
}

export default App;
```

---

## Step 3: Setup Axios Interceptor for Token Invalid

**In your API file (e.g., `src/api/api.js` or `src/services/api.js`):**

```jsx
import axios from "axios";
import { toast } from "react-toastify";

const api = axios.create({
  baseURL: "http://localhost:5001/api",
});

// Response interceptor - handle 401 and invalid token
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Check for 401 or invalid token
    if (
      error.response?.status === 401 ||
      error.response?.data?.message?.toLowerCase().includes("invalid token")
    ) {
      // Clear auth data
      localStorage.removeItem("token");
      localStorage.removeItem("authToken");
      localStorage.removeItem("user");

      // Show notification
      toast.error("Session expired. Please login again.");

      // Redirect to login
      window.location.href = "/login";
    }

    return Promise.reject(error);
  }
);

export default api;
```

---

## Step 4: Update Login Page (login.jsx)

### Import React-Toastify and Icons
```jsx
import { useState } from "react";
import { toast } from "react-toastify";
import { FiEye, FiEyeOff } from "react-icons/fi";
```

### Add Password Visibility State
```jsx
const [showPassword, setShowPassword] = useState(false);
```

### Update Password Input
```jsx
<div className="relative">
  <input
    type={showPassword ? "text" : "password"}
    placeholder="Password"
    value={password}
    onChange={(e) => setPassword(e.target.value)}
    className="w-full px-4 py-3 rounded-lg bg-gray-700 text-white border border-gray-600 focus:outline-none focus:border-blue-500"
  />
  <button
    type="button"
    onClick={() => setShowPassword(!showPassword)}
    className="absolute right-3 top-3 text-gray-400 hover:text-white cursor-pointer"
  >
    {showPassword ? <FiEyeOff size={20} /> : <FiEye size={20} />}
  </button>
</div>
```

### Replace Alert with Toast in Login Handler
```jsx
const handleLogin = async (e) => {
  e.preventDefault();

  if (!email || !password) {
    toast.error("Please fill in all fields");
    return;
  }

  try {
    setLoading(true);

    const response = await api.post("/auth/login", {
      email,
      password,
    });

    if (response.data.success) {
      localStorage.setItem("token", response.data.token);
      localStorage.setItem("authToken", response.data.token);
      localStorage.setItem("user", JSON.stringify(response.data.user));

      toast.success("Login successful");

      setTimeout(() => {
        navigate("/dashboard");
      }, 1000);
    }
  } catch (error) {
    const errorMessage =
      error?.response?.data?.message || "Login failed. Please try again.";
    toast.error(errorMessage);
  } finally {
    setLoading(false);
  }
};
```

---

## Step 5: Create ConfirmationModal Component

**File: `src/components/ConfirmationModal.jsx`**

```jsx
import React from "react";
import { FiX, FiAlertCircle } from "react-icons/fi";

function ConfirmationModal({
  isOpen,
  title,
  message,
  confirmText = "Confirm",
  cancelText = "Cancel",
  onConfirm,
  onCancel,
  isLoading = false,
  isDangerous = false,
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-[#1e293b] rounded-xl p-6 max-w-sm w-full mx-4 border border-gray-700">
        <div className="flex items-center gap-3 mb-4">
          <FiAlertCircle className="text-2xl text-yellow-400" />
          <h2 className="text-xl font-bold text-white">{title}</h2>
        </div>

        <p className="text-gray-300 mb-6">{message}</p>

        <div className="flex gap-3">
          <button
            onClick={onCancel}
            disabled={isLoading}
            className="flex-1 px-4 py-2 rounded-lg bg-gray-700 text-white hover:bg-gray-600 disabled:opacity-50 transition"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            disabled={isLoading}
            className={`flex-1 px-4 py-2 rounded-lg text-white font-medium disabled:opacity-50 transition ${
              isDangerous
                ? "bg-red-600 hover:bg-red-700"
                : "bg-blue-600 hover:bg-blue-700"
            }`}
          >
            {isLoading ? "Processing..." : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

export default ConfirmationModal;
```

---

## Step 6: Update Chat Components

### In MessageInput.jsx
Replace all `alert()` with `toast`:

```jsx
import { toast } from "react-toastify";

// Old: alert("File size must be less than 10MB");
// New:
toast.error("File size must be less than 10MB");

// Old: alert("Message sent");
// New:
toast.success("Message sent");

// Old: alert("Failed to send message");
// New:
toast.error(error?.response?.data?.message || "Failed to send message");
```

### In CreateGroupModal.jsx
```jsx
import { toast } from "react-toastify";

if (response.data.success) {
  toast.success("Group created successfully");
  // Close modal, refresh
} else {
  toast.error(response.data.message || "Failed to create group");
}
```

### In AddMembersModal.jsx
```jsx
import { toast } from "react-toastify";

if (response.data.success) {
  toast.success("Members added successfully");
  // Refresh members list
} else {
  toast.error(error?.response?.data?.message || "Failed to add members");
}
```

---

## Step 7: Update Member Removal with Confirmation

### In RightSidebar.jsx or Member List

```jsx
import { useState } from "react";
import { toast } from "react-toastify";
import ConfirmationModal from "../../components/ConfirmationModal";

function RightSidebar() {
  const [confirmRemoveModal, setConfirmRemoveModal] = useState(false);
  const [memberToRemove, setMemberToRemove] = useState(null);
  const [removingMember, setRemovingMember] = useState(false);

  const handleRemoveMemberClick = (member) => {
    setMemberToRemove(member);
    setConfirmRemoveModal(true);
  };

  const handleConfirmRemove = async () => {
    if (!memberToRemove) return;

    try {
      setRemovingMember(true);

      const response = await api.delete("/chat/remove-member", {
        data: {
          group_id: selectedGroup.id,
          user_id: memberToRemove.id,
        },
      });

      if (response.data.success) {
        toast.success("Member removed successfully");
        // Refresh members list
        fetchGroupMembers();
      } else {
        toast.error(response.data.message);
      }
    } catch (error) {
      if (error.response?.status === 403) {
        toast.error("You don't have permission to remove members");
      } else if (error.response?.data?.message?.includes("creator")) {
        toast.error("Group creator cannot be removed");
      } else {
        toast.error(
          error?.response?.data?.message || "Failed to remove member"
        );
      }
    } finally {
      setRemovingMember(false);
      setConfirmRemoveModal(false);
      setMemberToRemove(null);
    }
  };

  return (
    <>
      {/* Your existing content */}

      {/* Remove member button in member list */}
      <button
        onClick={() => handleRemoveMemberClick(member)}
        className="text-red-400 hover:text-red-500"
      >
        Remove
      </button>

      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={confirmRemoveModal}
        title="Remove Member"
        message={`Are you sure you want to remove ${memberToRemove?.name} from this group?`}
        confirmText="Remove"
        cancelText="Cancel"
        onConfirm={handleConfirmRemove}
        onCancel={() => {
          setConfirmRemoveModal(false);
          setMemberToRemove(null);
        }}
        isLoading={removingMember}
        isDangerous={true}
      />
    </>
  );
}

export default RightSidebar;
```

---

## Step 8: Update Attendance.jsx

```jsx
import { toast } from "react-toastify";

// When marking attendance
if (response.data.success) {
  toast.success("Attendance marked successfully");
  // Refresh data
} else {
  toast.error(error?.response?.data?.message || "Failed to mark attendance");
}

// When updating attendance
if (response.data.success) {
  toast.success("Attendance updated");
  // Refresh
} else {
  toast.error("Failed to update attendance");
}
```

---

## Step 9: Update Task Page with Confirmation

```jsx
import { useState } from "react";
import { toast } from "react-toastify";
import ConfirmationModal from "../components/ConfirmationModal";

function Tasks() {
  const [confirmModal, setConfirmModal] = useState(false);
  const [taskToUpdate, setTaskToUpdate] = useState(null);
  const [updatingTask, setUpdatingTask] = useState(false);

  const handleUpdateClick = (task) => {
    setTaskToUpdate(task);
    setConfirmModal(true);
  };

  const handleStatusChange = (task, newStatus) => {
    setTaskToUpdate({ ...task, newStatus });
    setConfirmModal(true);
  };

  const handleConfirmUpdate = async () => {
    try {
      setUpdatingTask(true);

      const response = await api.put(`/tasks/${taskToUpdate.id}`, {
        status: taskToUpdate.newStatus || taskToUpdate.status,
        // other fields as needed
      });

      if (response.data.success) {
        toast.success("Task updated successfully");
        fetchTasks();
      }
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to update task");
    } finally {
      setUpdatingTask(false);
      setConfirmModal(false);
      setTaskToUpdate(null);
    }
  };

  return (
    <>
      {/* Your existing UI */}

      {/* Status change button */}
      <button onClick={() => handleStatusChange(task, "completed")}>
        Mark Complete
      </button>

      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={confirmModal}
        title="Confirm Task Update"
        message="Are you sure you want to update this task?"
        confirmText="Update"
        cancelText="Cancel"
        onConfirm={handleConfirmUpdate}
        onCancel={() => {
          setConfirmModal(false);
          setTaskToUpdate(null);
        }}
        isLoading={updatingTask}
      />
    </>
  );
}

export default Tasks;
```

---

## Step 10: Update Dashboard

```jsx
import { toast } from "react-toastify";

// In any dashboard action
if (response.data.success) {
  toast.success("Action completed successfully");
} else {
  toast.error("Action failed");
}
```

---

## Global Replacements

### Find and Replace in All Files:
- `alert("` → `toast.success("` or `toast.error("`
- Update success alerts: `toast.success("message")`
- Update error alerts: `toast.error(error?.response?.data?.message || "message")`

---

## Testing Checklist

- [ ] npm install react-toastify
- [ ] Add ToastContainer to App.jsx
- [ ] Test login success - shows green toast
- [ ] Test login failure - shows red toast
- [ ] Test password visibility toggle
- [ ] Test invalid token - redirects to login with toast
- [ ] Test group creation - shows toast
- [ ] Test add members - shows toast
- [ ] Test remove member - shows confirmation modal then toast
- [ ] Test message send - shows toast
- [ ] Test attachment upload - shows toast
- [ ] Test voice note - shows toast
- [ ] Test attendance - shows toast
- [ ] Test task update - shows confirmation modal then toast

---

## File Structure

```
frontend/src/
├── App.jsx (✓ updated)
├── api/
│   └── api.js (✓ add interceptor)
├── components/
│   ├── ConfirmationModal.jsx (✓ new)
│   ├── chat/
│   │   ├── RightSidebar.jsx (✓ add confirmation)
│   │   ├── MessageInput.jsx (✓ replace alerts)
│   │   ├── CreateGroupModal.jsx (✓ replace alerts)
│   │   └── AddMembersModal.jsx (✓ replace alerts)
│   └── ...
├── pages/
│   ├── login.jsx (✓ add password toggle)
│   ├── Attendance.jsx (✓ replace alerts)
│   ├── Tasks.jsx (✓ add confirmation)
│   └── ...
└── ...
```

---

**Status: Complete Implementation Guide ✅**
