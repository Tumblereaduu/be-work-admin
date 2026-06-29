// ============================================
// REACT TOASTIFY - FRONTEND UPDATE CODE SNIPPETS
// ============================================

// ============================================
// 1. APP.JSX - Add ToastContainer
// ============================================

import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

function App() {
  return (
    <>
      {/* Your existing layout/routes */}
      
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

// ============================================
// 2. API/AXIOS INTERCEPTOR - Token Invalid Handling
// ============================================

import axios from "axios";
import { toast } from "react-toastify";

const api = axios.create({
  baseURL: "http://localhost:5001/api",
});

// Add response interceptor
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Check for 401 status or invalid token message
    if (
      error.response?.status === 401 ||
      error.response?.data?.message?.toLowerCase().includes("invalid token")
    ) {
      // Clear all stored auth data
      localStorage.removeItem("token");
      localStorage.removeItem("authToken");
      localStorage.removeItem("user");

      // Show notification to user
      toast.error("Session expired. Please login again.");

      // Redirect to login page
      window.location.href = "/login";
    }

    return Promise.reject(error);
  }
);

export default api;

// ============================================
// 3. LOGIN.JSX - Password Visibility & Toast
// ============================================

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { FiEye, FiEyeOff } from "react-icons/fi";
import api from "../api/api"; // Or your api path

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false); // NEW
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

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
        // Store authentication data
        localStorage.setItem("token", response.data.token);
        localStorage.setItem("authToken", response.data.token);
        localStorage.setItem("user", JSON.stringify(response.data.user));

        // Show success message
        toast.success("Login successful");

        // Redirect to dashboard
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 flex items-center justify-center p-4">
      <div className="bg-[#1e293b] rounded-2xl p-8 w-full max-w-md border border-gray-700">
        <h1 className="text-3xl font-bold text-white mb-8 text-center">Login</h1>

        <form onSubmit={handleLogin} className="space-y-6">
          {/* Email Input */}
          <div>
            <label className="block text-gray-400 text-sm mb-2">Email</label>
            <input
              type="email"
              placeholder="your@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 rounded-lg bg-gray-700 text-white border border-gray-600 focus:outline-none focus:border-blue-500"
              disabled={loading}
            />
          </div>

          {/* Password Input with Eye Icon */}
          <div>
            <label className="block text-gray-400 text-sm mb-2">Password</label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 rounded-lg bg-gray-700 text-white border border-gray-600 focus:outline-none focus:border-blue-500"
                disabled={loading}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                disabled={loading}
                className="absolute right-3 top-3 text-gray-400 hover:text-white cursor-pointer disabled:opacity-50"
              >
                {showPassword ? <FiEyeOff size={20} /> : <FiEye size={20} />}
              </button>
            </div>
          </div>

          {/* Login Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            {loading ? "Logging in..." : "Login"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default Login;

// ============================================
// 4. CONFIRMATION MODAL COMPONENT
// ============================================

import React from "react";
import { FiAlertCircle } from "react-icons/fi";

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
      <div className="bg-[#1e293b] rounded-xl p-6 max-w-sm w-full mx-4 border border-gray-700 shadow-2xl">
        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <FiAlertCircle className="text-2xl text-yellow-400" />
          <h2 className="text-xl font-bold text-white">{title}</h2>
        </div>

        {/* Message */}
        <p className="text-gray-300 mb-6">{message}</p>

        {/* Buttons */}
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            disabled={isLoading}
            className="flex-1 px-4 py-2 rounded-lg bg-gray-700 text-white hover:bg-gray-600 disabled:opacity-50 transition font-medium"
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

// ============================================
// 5. MESSAGE INPUT - Replace Alerts
// ============================================

import { useState } from "react";
import { toast } from "react-toastify";
import api from "../api/api";

function MessageInput({ selectedGroup, onMessageSent }) {
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  const handleSendMessage = async () => {
    if (!message.trim() || !selectedGroup) return;

    try {
      setSending(true);

      const response = await api.post("/chat/send-message", {
        group_id: selectedGroup.id,
        message: message.trim(),
      });

      if (response.data.success) {
        toast.success("Message sent");
        setMessage("");
        onMessageSent(response.data.data);
      }
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to send message");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="p-4 border-t border-gray-700">
      <div className="flex gap-2">
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Type a message..."
          className="flex-1 px-4 py-2 rounded-lg bg-gray-700 text-white focus:outline-none"
          disabled={sending}
          onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
        />
        <button
          onClick={handleSendMessage}
          disabled={sending || !message.trim()}
          className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50 transition"
        >
          {sending ? "..." : "Send"}
        </button>
      </div>
    </div>
  );
}

export default MessageInput;

// ============================================
// 6. REMOVE MEMBER WITH CONFIRMATION
// ============================================

import { useState } from "react";
import { toast } from "react-toastify";
import ConfirmationModal from "./ConfirmationModal";
import api from "../api/api";

function MemberList({ selectedGroup, members, onMemberRemoved }) {
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
        onMemberRemoved(memberToRemove.id);
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
      <div className="space-y-2">
        {members?.map((member) => (
          <div
            key={member.id}
            className="flex items-center justify-between p-3 bg-gray-700 rounded-lg"
          >
            <div>
              <p className="text-white font-medium">{member.name}</p>
              <p className="text-gray-400 text-sm">{member.email}</p>
            </div>
            <button
              onClick={() => handleRemoveMemberClick(member)}
              className="text-red-400 hover:text-red-500 text-sm font-medium"
            >
              Remove
            </button>
          </div>
        ))}
      </div>

      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={confirmRemoveModal}
        title="Remove Member"
        message={`Are you sure you want to remove ${memberToRemove?.name} from this group? This action cannot be undone.`}
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

export default MemberList;

// ============================================
// 7. CREATE GROUP MODAL - Replace Alerts
// ============================================

import { useState } from "react";
import { toast } from "react-toastify";
import api from "../api/api";

function CreateGroupModal({ isOpen, onClose, onGroupCreated }) {
  const [groupName, setGroupName] = useState("");
  const [groupDescription, setGroupDescription] = useState("");
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [loading, setLoading] = useState(false);

  const handleCreateGroup = async () => {
    if (!groupName.trim()) {
      toast.error("Group name is required");
      return;
    }

    try {
      setLoading(true);

      const response = await api.post("/chat/create-group", {
        group_name: groupName,
        group_description: groupDescription,
        members: selectedMembers,
      });

      if (response.data.success) {
        toast.success("Group created successfully");
        setGroupName("");
        setGroupDescription("");
        setSelectedMembers([]);
        onGroupCreated(response.data.group);
        onClose();
      }
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to create group");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-[#1e293b] rounded-xl p-6 w-full max-w-md border border-gray-700">
        <h2 className="text-2xl font-bold text-white mb-4">Create Group</h2>

        <div className="space-y-4">
          <div>
            <label className="block text-gray-400 text-sm mb-2">
              Group Name
            </label>
            <input
              type="text"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              placeholder="Enter group name"
              className="w-full px-4 py-2 rounded-lg bg-gray-700 text-white focus:outline-none"
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-gray-400 text-sm mb-2">
              Description (optional)
            </label>
            <textarea
              value={groupDescription}
              onChange={(e) => setGroupDescription(e.target.value)}
              placeholder="Enter group description"
              className="w-full px-4 py-2 rounded-lg bg-gray-700 text-white focus:outline-none"
              rows={3}
              disabled={loading}
            />
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            disabled={loading}
            className="flex-1 px-4 py-2 rounded-lg bg-gray-700 text-white hover:bg-gray-600 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleCreateGroup}
            disabled={loading}
            className="flex-1 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50"
          >
            {loading ? "Creating..." : "Create"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default CreateGroupModal;

// ============================================
// 8. ATTENDANCE - Replace Alerts
// ============================================

import { useState } from "react";
import { toast } from "react-toastify";
import api from "../api/api";

function Attendance() {
  const [marking, setMarking] = useState(false);

  const handleMarkAttendance = async (date) => {
    try {
      setMarking(true);

      const response = await api.post("/attendance/mark", {
        date,
      });

      if (response.data.success) {
        toast.success("Attendance marked successfully");
        // Refresh attendance list
      }
    } catch (error) {
      toast.error(
        error?.response?.data?.message || "Failed to mark attendance"
      );
    } finally {
      setMarking(false);
    }
  };

  return (
    <div>
      {/* Your attendance UI */}
      <button
        onClick={() => handleMarkAttendance(new Date())}
        disabled={marking}
        className="px-4 py-2 bg-blue-600 text-white rounded-lg disabled:opacity-50"
      >
        {marking ? "Marking..." : "Mark Present"}
      </button>
    </div>
  );
}

export default Attendance;

// ============================================
// 9. TASK UPDATE WITH CONFIRMATION
// ============================================

import { useState } from "react";
import { toast } from "react-toastify";
import ConfirmationModal from "./ConfirmationModal";
import api from "../api/api";

function TaskUpdate({ task, onUpdated }) {
  const [confirmModal, setConfirmModal] = useState(false);
  const [updating, setUpdating] = useState(false);

  const handleUpdateClick = () => {
    setConfirmModal(true);
  };

  const handleConfirmUpdate = async () => {
    try {
      setUpdating(true);

      const response = await api.put(`/tasks/${task.id}`, {
        status: "completed",
        // other fields as needed
      });

      if (response.data.success) {
        toast.success("Task updated successfully");
        onUpdated(response.data.data);
      }
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to update task");
    } finally {
      setUpdating(false);
      setConfirmModal(false);
    }
  };

  return (
    <>
      <button
        onClick={handleUpdateClick}
        className="px-4 py-2 bg-green-600 text-white rounded-lg"
      >
        Mark Complete
      </button>

      <ConfirmationModal
        isOpen={confirmModal}
        title="Confirm Task Update"
        message="Are you sure you want to mark this task as completed?"
        confirmText="Update"
        cancelText="Cancel"
        onConfirm={handleConfirmUpdate}
        onCancel={() => setConfirmModal(false)}
        isLoading={updating}
      />
    </>
  );
}

export default TaskUpdate;

// ============================================
// END OF CODE SNIPPETS
// ============================================
