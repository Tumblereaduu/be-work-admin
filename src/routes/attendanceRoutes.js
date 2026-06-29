import express from "express";

import authMiddleware from "../middleware/authMiddleware.js";
import adminMiddleware from "../middleware/adminMiddleware.js";
import superAdminMiddleware from "../middleware/superAdminMiddleware.js";

import {
  markLogin,
  markLogout,
  getMyAttendance,
  getAllAttendance,
  getAttendanceSummary,
  startBreak,
  endBreak,
  startLunch,
  endLunch,
  startPermission,
  endPermission,
  getActiveSessions,
  updateAttendance,
  getAttendanceReport,
  downloadAttendanceReport,
  getTodayAttendance,
  getLateAttendance,
} from "../controllers/attendance/attendanceController.js";

const router = express.Router();

// Core flow (unchanged paths)
router.post("/login", authMiddleware, markLogin);
router.post("/logout", authMiddleware, markLogout);
router.get("/my", authMiddleware, getMyAttendance);

// Sessions
router.get("/active", authMiddleware, getActiveSessions);
router.post("/break/start", authMiddleware, startBreak);
router.post("/break/end", authMiddleware, endBreak);
router.post("/lunch/start", authMiddleware, startLunch);
router.post("/lunch/end", authMiddleware, endLunch);
router.post("/permission/start", authMiddleware, startPermission);
router.post("/permission/end", authMiddleware, endPermission);

// Analytics & reports
router.get("/summary", authMiddleware, getAttendanceSummary);
router.get("/report", authMiddleware, getAttendanceReport);
router.get(
  "/report/download",
  authMiddleware,
  superAdminMiddleware,
  downloadAttendanceReport
);

// Super admin
router.get("/all", authMiddleware, superAdminMiddleware, getAllAttendance);
router.put("/:id", authMiddleware, superAdminMiddleware, updateAttendance);

// Legacy admin routes
router.get("/admin/all", authMiddleware, adminMiddleware, getAllAttendance);
router.get("/admin/today", authMiddleware, adminMiddleware, getTodayAttendance);
router.get("/admin/late", authMiddleware, adminMiddleware, getLateAttendance);

export default router;
