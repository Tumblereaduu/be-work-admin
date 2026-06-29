import http from "http";
import { Server } from "socket.io";
import dotenv from "dotenv";
import app from "./app.js";
import setupChatSocket from "./socket/chatSocket.js";

dotenv.config();

/*
  CREATE HTTP SERVER
*/
const server = http.createServer(app);

/*
  SOCKET SERVER
*/
export const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST"],
    credentials: true,
  },
});

/*
  SET IO ON APP FOR ACCESS IN CONTROLLERS
*/
app.set("io", io);

/*
  SOCKET CONNECTION
*/
io.on("connection", (socket) => {
  console.log("Global Socket Connected:", socket.id);

  socket.on("disconnect", () => {
    console.log("Global Socket Disconnected:", socket.id);
  });
});

/*
  ATTACH CHAT SOCKET MODULE
*/
setupChatSocket(io);

/*
  IMPORTANT:
  USE server.listen
  NOT app.listen
*/
const PORT = process.env.PORT || 5001;

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});