import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import Message from './models/Message.js';

dotenv.config();

const app = express();
app.use(cors());
const server = http.createServer(app);

const io = new Server(server, {
  cors: { origin: 'http://localhost:5173', methods: ['GET', 'POST'] }
});

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error(err));

const roomUsers = {};

function getUserList(room) {
  return roomUsers[room] ? Object.values(roomUsers[room]) : [];
}

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('join_room', async ({ room, username }) => {
    socket.join(room);
    socket.data.room = room;
    socket.data.username = username;

    if (!roomUsers[room]) roomUsers[room] = {};
    roomUsers[room][socket.id] = username;

    const history = await Message.find({ room }).sort({ timestamp: 1 }).limit(50);
    socket.emit('chat_history', history);

    io.to(room).emit('user_list', getUserList(room));
  });

  socket.on('send_message', async (data) => {
    const message = new Message(data);
    await message.save();
    io.to(data.room).emit('receive_message', data);
  });

  socket.on('typing', ({ room, username, isTyping }) => {
    socket.to(room).emit('display_typing', { username, isTyping });
  });

  socket.on('disconnect', () => {
    const { room } = socket.data;
    if (room && roomUsers[room]) {
      delete roomUsers[room][socket.id];
      io.to(room).emit('user_list', getUserList(room));
    }
    console.log('User disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 5050;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));