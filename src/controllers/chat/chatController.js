import pool from "../../config/db.js";

// CREATE GROUP
export const createGroup = async (req, res) => {
  const connection = await pool.getConnection();

  try {
    const { group_name, group_description, members } = req.body;
    const createdBy = req.user.id;

    // VALIDATION
    if (!group_name || typeof group_name !== "string" || group_name.trim() === "") {
      return res.status(400).json({
        success: false,
        message: "group_name is required and must be a non-empty string",
      });
    }

    if (!Array.isArray(members)) {
      return res.status(400).json({
        success: false,
        message: "members must be an array",
      });
    }

    // START TRANSACTION
    await connection.beginTransaction();

    // INSERT GROUP
    const [groupResult] = await connection.query(
      `INSERT INTO chat_groups (group_name, group_description, created_by)
       VALUES (?, ?, ?)`,
      [group_name.trim(), group_description || null, createdBy]
    );

    const groupId = groupResult.insertId;

    // PREPARE MEMBERS ARRAY - Remove duplicates and add creator
    const uniqueMembers = new Set([createdBy, ...members]);
    const membersList = Array.from(uniqueMembers).map((userId) => [groupId, userId]);

    // INSERT MEMBERS USING INSERT IGNORE TO PREVENT DUPLICATES
    if (membersList.length > 0) {
      await connection.query(
        `INSERT IGNORE INTO group_members (group_id, user_id) VALUES ?`,
        [membersList]
      );
    }

    // COMMIT TRANSACTION
    await connection.commit();

    res.status(201).json({
      success: true,
      message: "Group created successfully",
      group: {
        id: groupId,
        group_name: group_name.trim(),
        group_description: group_description || null,
      },
    });
  } catch (error) {
    // ROLLBACK ON ERROR
    await connection.rollback();
    console.error("Create Group Error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to create group",
    });
  } finally {
    connection.release();
  }
};

// GET USERS FOR GROUP SELECTION
export const getUsersForGroup = async (req, res) => {
  try {
    const [users] = await pool.query(
      `SELECT id, name, email, role FROM users WHERE status = 'active' ORDER BY name ASC`
    );

    res.json({
      success: true,
      users,
    });
  } catch (error) {
    console.error("Get Users Error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch users",
    });
  }
};


// GET MY GROUPS
export const getMyGroups = async (req, res) => {
  try {

    const userId = req.user.id;

    const [rows] = await pool.query(
      `
      SELECT 
        chat_groups.*
      FROM group_members
      JOIN chat_groups
      ON group_members.group_id = chat_groups.id
      WHERE group_members.user_id = ?
      `,
      [userId]
    );

    res.json({
      success: true,
      data: rows,
    });

  } catch (error) {
    console.log(error);

    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};


// GET GROUP MESSAGES
export const getGroupMessages = async (req, res) => {
  try {

    const { groupId } = req.params;

    const [rows] = await pool.query(
      `
      SELECT 
        messages.*,
        users.name
      FROM messages
      JOIN users
      ON messages.sender_id = users.id
      WHERE messages.group_id = ?
      ORDER BY messages.created_at ASC
      `,
      [groupId]
    );

    res.json({
      success: true,
      data: rows,
    });

  } catch (error) {
    console.log(error);

    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

// GET GROUP MEMBERS
export const getGroupMembers = async (req, res) => {
  try {
    const { groupId } = req.params;

    // VALIDATION
    if (!groupId) {
      return res.status(400).json({
        success: false,
        message: "Group ID is required",
      });
    }

    // FETCH GROUP MEMBERS
    const [members] = await pool.query(
      `
      SELECT 
        u.id,
        u.name,
        u.email,
        u.role,
        gm.joined_at
      FROM group_members gm
      JOIN users u ON u.id = gm.user_id
      WHERE gm.group_id = ?
      ORDER BY gm.joined_at ASC
      `,
      [groupId]
    );

    res.json({
      success: true,
      members,
    });
  } catch (error) {
    console.error("Get Group Members Error:", error);

    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

// ADD GROUP MEMBERS
export const addGroupMembers = async (req, res) => {
  try {
    const { group_id, members } = req.body;

    // VALIDATION
    if (!group_id || !Array.isArray(members) || members.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Group ID and members array are required",
      });
    }

    // REMOVE DUPLICATES
    const uniqueMembers = [...new Set(members)];

    // ADD EACH MEMBER (INSERT IGNORE prevents duplicates)
    for (const userId of uniqueMembers) {
      await pool.query(
        `
        INSERT IGNORE INTO group_members (group_id, user_id)
        VALUES (?, ?)
        `,
        [group_id, userId]
      );
    }

    // EMIT SOCKET EVENT TO NOTIFY MEMBERS
    const io = req.app.get("io");
    if (io) {
      io.to(`group_${group_id}`).emit("membersUpdated", {
        group_id,
      });
    }

    res.json({
      success: true,
      message: "Members added successfully",
    });
  } catch (error) {
    console.error("Add Group Members Error:", error);

    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

// REMOVE GROUP MEMBER
export const removeGroupMember = async (req, res) => {
  try {
    const { group_id, user_id } = req.body;
    const requestingUserId = req.user.id;
    const userRole = req.user.role;

    // VALIDATION
    if (!group_id || !user_id) {
      return res.status(400).json({
        success: false,
        message: "Group ID and user ID are required",
      });
    }

    // GET GROUP CREATOR AND VERIFY USER BELONGS TO GROUP
    const [groupRows] = await pool.query(
      `
      SELECT created_by
      FROM chat_groups
      WHERE id = ?
      `,
      [group_id]
    );

    // CHECK IF GROUP EXISTS
    if (groupRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Group not found",
      });
    }

    const groupCreator = groupRows[0].created_by;

    // PREVENT CREATOR FROM BEING REMOVED
    if (Number(groupCreator) === Number(user_id)) {
      return res.status(400).json({
        success: false,
        message: "Group creator cannot be removed",
      });
    }

    // SECURITY: Check if requesting user has permission to remove members
    // Only creator, admin, or super_admin can remove users
    const isCreator = Number(groupCreator) === Number(requestingUserId);
    const isAdmin = userRole === "admin" || userRole === "super_admin";

    if (!isCreator && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: "You don't have permission to remove members from this group",
      });
    }

    // REMOVE MEMBER
    await pool.query(
      `
      DELETE FROM group_members
      WHERE group_id = ?
      AND user_id = ?
      `,
      [group_id, user_id]
    );

    // EMIT SOCKET EVENT TO NOTIFY MEMBERS
    const io = req.app.get("io");
    if (io) {
      io.to(`group_${group_id}`).emit("membersUpdated", {
        group_id,
      });
    }

    res.json({
      success: true,
      message: "Member removed successfully",
    });
  } catch (error) {
    console.error("Remove Group Member Error:", error);

    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

// SEND ATTACHMENT MESSAGE
export const sendAttachmentMessage = async (req, res) => {
  try {
    const { group_id, message, message_type } = req.body;
    const senderId = req.user.id;

    // VALIDATION
    if (!group_id) {
      return res.status(400).json({
        success: false,
        message: "Group ID is required",
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "File is required",
      });
    }

    if (!message_type || !["image", "document"].includes(message_type)) {
      return res.status(400).json({
        success: false,
        message: "Valid message_type is required (image or document)",
      });
    }

    // VERIFY USER BELONGS TO GROUP
    const [memberCheck] = await pool.query(
      `
      SELECT id FROM group_members
      WHERE group_id = ? AND user_id = ?
      `,
      [group_id, senderId]
    );

    if (memberCheck.length === 0) {
      return res.status(403).json({
        success: false,
        message: "You are not a member of this group",
      });
    }

    // PREPARE FILE DATA
    const fileUrl = `/uploads/chat/${req.file.filename}`;
    const fileName = req.file.originalname;
    const fileMime = req.file.mimetype;
    const fileSize = req.file.size;

    // INSERT MESSAGE INTO DATABASE
    const [result] = await pool.query(
      `
      INSERT INTO messages 
      (group_id, sender_id, message, message_type, file_url, file_name, file_mime, file_size)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [group_id, senderId, message || null, message_type, fileUrl, fileName, fileMime, fileSize]
    );

    const messageId = result.insertId;

    // FETCH SENDER NAME
    const [senderData] = await pool.query(
      `SELECT name FROM users WHERE id = ?`,
      [senderId]
    );

    const senderName = senderData[0]?.name || "Unknown";

    // PREPARE RESPONSE DATA
    const messageData = {
      id: messageId,
      group_id,
      sender_id: senderId,
      sender_name: senderName,
      message: message || null,
      message_type,
      file_url: fileUrl,
      file_name: fileName,
      file_mime: fileMime,
      file_size: fileSize,
      created_at: new Date().toISOString(),
    };

    // EMIT SOCKET EVENT
    const io = req.app.get("io");
    if (io) {
      io.to(`group_${group_id}`).emit("receiveMessage", messageData);
    }

    res.status(201).json({
      success: true,
      message: "Attachment sent successfully",
      data: messageData,
    });
  } catch (error) {
    console.error("Send Attachment Message Error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to send attachment",
    });
  }
};

// SEND VOICE NOTE MESSAGE
export const sendVoiceMessage = async (req, res) => {
  try {
    const { group_id } = req.body;
    const senderId = req.user.id;

    // VALIDATION
    if (!group_id) {
      return res.status(400).json({
        success: false,
        message: "Group ID is required",
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Voice file is required",
      });
    }

    // VERIFY USER BELONGS TO GROUP
    const [memberCheck] = await pool.query(
      `
      SELECT id FROM group_members
      WHERE group_id = ? AND user_id = ?
      `,
      [group_id, senderId]
    );

    if (memberCheck.length === 0) {
      return res.status(403).json({
        success: false,
        message: "You are not a member of this group",
      });
    }

    // PREPARE FILE DATA
    const fileUrl = `/uploads/chat/voice/${req.file.filename}`;
    const fileName = req.file.originalname;
    const fileMime = req.file.mimetype;
    const fileSize = req.file.size;

    // INSERT MESSAGE INTO DATABASE
    const [result] = await pool.query(
      `
      INSERT INTO messages 
      (group_id, sender_id, message_type, file_url, file_name, file_mime, file_size)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      `,
      [group_id, senderId, "voice", fileUrl, fileName, fileMime, fileSize]
    );

    const messageId = result.insertId;

    // FETCH SENDER NAME
    const [senderData] = await pool.query(
      `SELECT name FROM users WHERE id = ?`,
      [senderId]
    );

    const senderName = senderData[0]?.name || "Unknown";

    // PREPARE RESPONSE DATA
    const messageData = {
      id: messageId,
      group_id,
      sender_id: senderId,
      sender_name: senderName,
      message: null,
      message_type: "voice",
      file_url: fileUrl,
      file_name: fileName,
      file_mime: fileMime,
      file_size: fileSize,
      created_at: new Date().toISOString(),
    };

    // EMIT SOCKET EVENT
    const io = req.app.get("io");
    if (io) {
      io.to(`group_${group_id}`).emit("receiveMessage", messageData);
    }

    res.status(201).json({
      success: true,
      message: "Voice note sent successfully",
      data: messageData,
    });
  } catch (error) {
    console.error("Send Voice Message Error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to send voice note",
    });
  }
};