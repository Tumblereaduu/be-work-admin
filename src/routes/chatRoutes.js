import express from "express";

import verifyToken from "../middleware/verifyToken.js";
import { uploadChatFile, uploadVoiceFile } from "../middleware/uploadChatFile.js";

import {
  createGroup,
  getMyGroups,
  getGroupMessages,
  getUsersForGroup,
  getGroupMembers,
  addGroupMembers,
  removeGroupMember,
  sendAttachmentMessage,
  sendVoiceMessage,
} from "../controllers/chat/chatController.js";

const router = express.Router();

// CREATE GROUP
router.post("/create-group", verifyToken, createGroup);

// GET USERS FOR GROUP SELECTION
router.get("/users", verifyToken, getUsersForGroup);

// GET MY GROUPS
router.get("/groups", verifyToken, getMyGroups);

// GET GROUP MESSAGES
router.get("/messages/:groupId", verifyToken, getGroupMessages);

// GET GROUP MEMBERS
router.get("/group-members/:groupId", verifyToken, getGroupMembers);

// ADD GROUP MEMBERS
router.post("/add-members", verifyToken, addGroupMembers);

// REMOVE GROUP MEMBER
router.delete("/remove-member", verifyToken, removeGroupMember);

// SEND ATTACHMENT MESSAGE (IMAGE OR DOCUMENT)
router.post(
  "/send-attachment",
  verifyToken,
  uploadChatFile.single("file"),
  sendAttachmentMessage
);

// SEND VOICE NOTE MESSAGE
router.post(
  "/send-voice",
  verifyToken,
  uploadVoiceFile.single("voice"),
  sendVoiceMessage
);

export default router;