import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema({
  room: { type: String, default: 'general' },
  sender: { type: String, required: true },
  text: { type: String, required: true },
  timestamp: { type: Date, default: Date.now }
});

export default mongoose.model('Message', messageSchema);