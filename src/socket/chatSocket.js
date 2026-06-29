import pool from "../config/db.js";

const setupChatSocket = (io) => {

  io.on("connection", (socket) => {

    console.log("User Connected");


    // JOIN GROUP
    socket.on("joinGroup", (groupId) => {
      socket.join(`group_${groupId}`);
    });


    // SEND MESSAGE
    socket.on("sendMessage", async (data) => {

  console.log("SEND MESSAGE EVENT HIT");

  try {

    console.log("DATA:", data);

    const {
      group_id,
      sender_id,
      message,
    } = data;

    console.log("BEFORE DB INSERT");

    const [result] = await pool.query(
      `
      INSERT INTO messages
      (group_id, sender_id, message)
      VALUES (?, ?, ?)
      `,
      [group_id, sender_id, message]
    );

    console.log("DB INSERT SUCCESS");

    const messageData = {
      id: result.insertId,
      group_id,
      sender_id,
      message,
      created_at: new Date(),
    };

    console.log("EMITTING MESSAGE");

    io.to(`group_${group_id}`).emit(
      "receiveMessage",
      messageData
    );

  } catch (error) {

    console.log("CHAT ERROR:", error);

  }

});


    socket.on("disconnect", () => {
      console.log("User Disconnected");
    });

  });

};

export default setupChatSocket;