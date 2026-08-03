import { useEffect, useState, useRef } from 'react';
import { BrowserRouter, Routes, Route, useParams } from 'react-router-dom';
import { io } from 'socket.io-client';
import './App.css';

const socket = io('https://chat-app-backend.bonto.run');

function ChatApp({ directRoom }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [username, setUsername] = useState('');
  const [nameInput, setNameInput] = useState('');
  const [joined, setJoined] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [room, setRoom] = useState(directRoom || 'general');
  const [typingUsers, setTypingUsers] = useState([]);
  const messagesEndRef = useRef(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (!joined) return;

    socket.emit('join_room', { room, username });
    socket.on('user_list', (users) => setOnlineUsers(users));
    socket.on('chat_history', (history) => setMessages(history));
    socket.on('receive_message', (data) => setMessages(prev => [...prev, data]));
    socket.on('display_typing', ({ username: typer, isTyping }) => {
      setTypingUsers((prev) => {
        if (isTyping) {
          return prev.includes(typer) ? prev : [...prev, typer];
        } else {
          return prev.filter((u) => u !== typer);
        }
      });
    });

    return () => {
      socket.off('chat_history');
      socket.off('receive_message');
      socket.off('user_list');
      socket.off('display_typing');
    };
  }, [joined]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleJoin = () => {
    if (nameInput.trim() === '') return;
    setUsername(nameInput.trim());
    setJoined(true);
  };

  const sendMessage = async () => {
    if (input.trim() === '' && !selectedFile) return;

    let fileData = {};

    if (selectedFile) {
      const formData = new FormData();
      formData.append('file', selectedFile);

      const res = await fetch('https://chat-app-backend.bonto.run/upload', {
        method: 'POST',
        body: formData
      });
      const result = await res.json();
      fileData = {
        fileUrl: `https://chat-app-backend.bonto.run${result.fileUrl}`,
        fileType: result.fileType,
        fileName: result.fileName
      };
    }

    const data = {
      room,
      sender: username,
      text: input,
      timestamp: new Date(),
      ...fileData
    };

    socket.emit('send_message', data);
    socket.emit('typing', { room, username, isTyping: false });
    setInput('');
    setSelectedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  if (!joined) {
    return (
      <div className="join-screen">
        <h2>{directRoom ? `Direct Chat: ${directRoom}` : 'Join Live Chat'}</h2>
        <input
          value={nameInput}
          onChange={(e) => setNameInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
          placeholder="Your name..."
        />
        {!directRoom && (
          <select value={room} onChange={(e) => setRoom(e.target.value)}>
            <option value="general">General</option>
            <option value="random">Random</option>
            <option value="tech">Tech Talk</option>
          </select>
        )}
        <button onClick={handleJoin}>Join Chat</button>
      </div>
    );
  }

  return (
    <div className="chat-container">
      <div className="chat-header">
        <h2>Live Chat</h2>
        <div className="room-tag">Signed in as {username} · Room: {room}</div>
      </div>

      <div className="online-bar">
        <span className="online-dot"></span>
        {onlineUsers.length} online — {onlineUsers.join(', ')}
      </div>

      <div className="messages">
        {messages.map((msg, i) => (
          <div key={i} className={`message-bubble ${msg.sender === username ? 'own' : 'other'}`}>
            {msg.sender !== username && <div className="message-sender">{msg.sender}</div>}

            {msg.fileUrl && msg.fileType === 'image' && (
              <img src={msg.fileUrl} alt={msg.fileName} style={{ maxWidth: '100%', borderRadius: 8, marginBottom: 4 }} />
            )}
            {msg.fileUrl && msg.fileType === 'video' && (
              <video src={msg.fileUrl} controls style={{ maxWidth: '100%', borderRadius: 8, marginBottom: 4 }} />
            )}
            {msg.fileUrl && msg.fileType === 'audio' && (
              <audio src={msg.fileUrl} controls style={{ marginBottom: 4 }} />
            )}
            {msg.fileUrl && msg.fileType === 'file' && (
              <a href={msg.fileUrl} target="_blank" rel="noopener noreferrer" style={{ display: 'block', marginBottom: 4 }}>
                📄 {msg.fileName}
              </a>
            )}

            {msg.text}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <div className="typing-indicator">
        {typingUsers.length > 0 &&
          `${typingUsers.join(', ')} ${typingUsers.length === 1 ? 'is' : 'are'} typing...`}
      </div>

      <div className="input-bar">
        <input
          type="file"
          ref={fileInputRef}
          style={{ display: 'none' }}
          onChange={(e) => setSelectedFile(e.target.files[0])}
          accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.zip"
        />
        <button
          type="button"
          onClick={() => fileInputRef.current.click()}
          style={{ background: '#888', padding: '10px 14px' }}
        >
          📎
        </button>
        <input
          value={input}
          onChange={(e) => {
            setInput(e.target.value);
            socket.emit('typing', { room, username, isTyping: true });
            clearTimeout(window.typingTimeout);
            window.typingTimeout = setTimeout(() => {
              socket.emit('typing', { room, username, isTyping: false });
            }, 1500);
          }}
          onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
          placeholder={selectedFile ? selectedFile.name : "Type a message..."}
        />
        <button onClick={sendMessage}>Send</button>
      </div>
    </div>
  );
}

function DirectChatWrapper() {
  const { roomId } = useParams();
  return <ChatApp directRoom={roomId} />;
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<ChatApp />} />
        <Route path="/:roomId" element={<DirectChatWrapper />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;