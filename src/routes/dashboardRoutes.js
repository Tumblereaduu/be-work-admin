import express from "express";

import authMiddleware from "../middleware/authMiddleware.js";

import {
  getDashboardStats,
  getTaskStats,
  getDashboardTasks,
} from "../controllers/dashboard/dashboardController.js";

const router = express.Router();


// DASHBOARD STATS
router.get("/stats", authMiddleware, getDashboardStats);

// TASK ANALYTICS
router.get("/task-stats", authMiddleware, getTaskStats);
router.get("/tasks", authMiddleware, getDashboardTasks);

export default router;
