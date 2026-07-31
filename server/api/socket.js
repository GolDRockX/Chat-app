import http from 'http';
import { Server } from 'socket.io';
import mongoose from 'mongoose';
import Message from '../models/Message.js';

if (mongoose.connection.readyState === 0) {
  mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('MongoDB connected'))
    .catch(err => console.error(err));
}

const server = http.createServer();
const io = new Server(server, {
  path: '/api/socket/socket.io',
  cors: { origin: '*', methods: ['GET', 'POST'] }
});

const roomUsers = {};
function getUserList(room) {
  return roomUsers[room] ? Object.values(roomUsers[room]) : [];
}

io.on('connection', (socket) => {
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
  });
});

export default server;