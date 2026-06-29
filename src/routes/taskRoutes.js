import express from "express";

import {
  createTask,
  getTasks,
  getTaskById,
  updateTask,
  updateTaskStatus,
  addTaskMessage,
  getTaskMessages,
} from "../controllers/task/taskController.js";

import verifyToken from "../middleware/verifyToken.js";
import uploadTask from "../middleware/taskUpload.js";

const router = express.Router();


const taskUploadFields = uploadTask.fields([
  { name: "attachments", maxCount: 10 },
  { name: "attachment", maxCount: 1 },
]);

// CREATE TASK
router.post("/create", verifyToken, taskUploadFields, createTask);


// GET TASKS
router.get("/", verifyToken, getTasks);

// GET TASK BY ID
router.get("/:id", verifyToken, getTaskById);

// UPDATE TASK (status + attachments)
router.put("/update/:id", verifyToken, taskUploadFields, updateTask);

// UPDATE STATUS (legacy)
router.put("/update-status/:id", verifyToken, updateTaskStatus);

// ADD TASK MESSAGE/REPLY
router.post("/:id/messages", verifyToken, addTaskMessage);

// GET TASK MESSAGES/REPLIES
router.get("/:id/messages", verifyToken, getTaskMessages);


export default router;
