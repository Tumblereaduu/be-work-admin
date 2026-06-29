import express from "express";

import verifyToken from "../middleware/verifyToken.js";

import {
  createUser,
  getUsers,
  deleteUser,
} from "../controllers/admin/adminController.js";

const router = express.Router();

router.post(
  "/create-user",
  verifyToken,
  createUser
);

router.get(
  "/users",
  verifyToken,
  getUsers
);

router.delete(
  "/delete-user/:id",
  verifyToken,
  deleteUser
);

export default router;