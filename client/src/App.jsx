import { useEffect, useState, useRef } from 'react';
import { io } from 'socket.io-client';
import './App.css';

const socket = io('https://chat-app-xyz.vercel.app', {
  path: '/api/socket/socket.io',
  transports: ['websocket']
});

function App() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [username, setUsername] = useState('');
  const [nameInput, setNameInput] = useState('');
  const [joined, setJoined] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [room, setRoom] = useState('general');
  const [typingUsers, setTypingUsers] = useState([]);
  const messagesEndRef = useRef(null);

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

  const sendMessage = () => {
    if (input.trim() === '') return;
    const data = { room, sender: username, text: input, timestamp: new Date() };
    socket.emit('send_message', data);
    socket.emit('typing', { room, username, isTyping: false });
    setInput('');
  };

  if (!joined) {
    return (
      <div className="join-screen">
        <h2>Join Live Chat</h2>
        <input
          value={nameInput}
          onChange={(e) => setNameInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
          placeholder="Your name..."
        />
        <select value={room} onChange={(e) => setRoom(e.target.value)}>
          <option value="general">General</option>
          <option value="random">Random</option>
          <option value="tech">Tech Talk</option>
        </select>
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
          placeholder="Type a message..."
        />
        <button onClick={sendMessage}>Send</button>
      </div>
    </div>
  );
}

export default App;