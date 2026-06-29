import bcrypt from "bcryptjs";

import pool from "../../config/db.js";


// CREATE USER
export const createUser = async (
  req,
  res
) => {

  try {

    const currentUser = req.user;

    const {
      name,
      email,
      password,
      role,
    } = req.body;

    // CHECK EMPTY
    if (
      !name ||
      !email ||
      !password ||
      !role
    ) {

      return res.status(400).json({
        success: false,
        message: "All fields required",
      });
    }

    // STAFF CANNOT CREATE
    if (
      currentUser.role === "staff"
    ) {

      return res.status(403).json({
        success: false,
        message: "Access denied",
      });
    }

    // ADMIN CANNOT CREATE ADMIN
    if (
      currentUser.role === "admin" &&
      role !== "staff"
    ) {

      return res.status(403).json({
        success: false,
        message:
          "Admin can create staff only",
      });
    }

    // CHECK EMAIL
    const checkSql = `
      SELECT *
      FROM users
      WHERE email = ?
    `;

    const [existingUser] =
      await pool.query(checkSql, [
        email,
      ]);

    if (existingUser.length > 0) {

      return res.status(400).json({
        success: false,
        message:
          "Email already exists",
      });
    }

    // HASH PASSWORD
    const hashedPassword =
      await bcrypt.hash(password, 10);

    // INSERT USER
    const insertSql = `
      INSERT INTO users
      (
        name,
        email,
        password,
        role,
        created_by
      )
      VALUES (?, ?, ?, ?, ?)
    `;

    await pool.query(insertSql, [
      name,
      email,
      hashedPassword,
      role,
      currentUser.id,
    ]);

    return res.status(201).json({
      success: true,
      message:
        "User created successfully",
    });

  } catch (error) {

    console.log("CREATE USER ERROR:", error);

    return res.status(500).json({
      success: false,
      message: error.message,
      sqlMessage: error.sqlMessage,
    });
  }
};


// GET USERS
export const getUsers = async (
  req,
  res
) => {

  try {

    const sql = `
      SELECT
        id,
        name,
        email,
        role,
        status,
        created_at
      FROM users
      ORDER BY id DESC
    `;

    const [users] =
      await pool.query(sql);

    return res.status(200).json({
      success: true,
      data: users,
    });

  } catch (error) {

    console.log(error);

    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};


// DELETE USER
export const deleteUser = async (
  req,
  res
) => {

  try {

    const currentUser = req.user;

    const { id } = req.params;

    // ONLY SUPER ADMIN
    if (
      currentUser.role !==
      "super_admin"
    ) {

      return res.status(403).json({
        success: false,
        message: "Access denied",
      });
    }

    // DELETE
    const sql = `
      DELETE FROM users
      WHERE id = ?
    `;

    await pool.query(sql, [id]);

    return res.status(200).json({
      success: true,
      message:
        "User deleted successfully",
    });

  } catch (error) {

    console.log(error);

    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};