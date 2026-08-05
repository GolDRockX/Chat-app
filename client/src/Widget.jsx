import { useEffect, useState, useRef } from 'react';
import { io } from 'socket.io-client';

const socket = io('https://chat-app-backend.bonto.run');

const styles = `
.cw-bubble {
  position: fixed; bottom: 20px; right: 20px;
  width: 60px; height: 60px; border-radius: 50%;
  background: #4f46e5; color: white; border: none;
  font-size: 26px; cursor: pointer; z-index: 999999;
  box-shadow: 0 4px 16px rgba(0,0,0,0.25);
  display: flex; align-items: center; justify-content: center;
}
.cw-panel {
  position: fixed; bottom: 90px; right: 20px;
  width: 320px; height: 440px; background: white;
  border-radius: 12px; box-shadow: 0 8px 30px rgba(0,0,0,0.25);
  z-index: 999999; display: flex; flex-direction: column;
  overflow: hidden; font-family: 'Segoe UI', Roboto, sans-serif;
}
.cw-header { background: #4f46e5; color: white; padding: 14px; font-size: 15px; font-weight: 600; }
.cw-join { padding: 20px; text-align: center; }
.cw-join input { width: 100%; padding: 10px; margin-top: 10px; border: 1px solid #ddd; border-radius: 6px; box-sizing: border-box; }
.cw-join button { width: 100%; padding: 10px; margin-top: 10px; background: #4f46e5; color: white; border: none; border-radius: 6px; cursor: pointer; }
.cw-messages { flex: 1; overflow-y: auto; padding: 12px; display: flex; flex-direction: column; gap: 8px; }
.cw-msg { max-width: 80%; padding: 8px 12px; border-radius: 12px; font-size: 13px; }
.cw-msg.own { align-self: flex-end; background: #4f46e5; color: white; }
.cw-msg.other { align-self: flex-start; background: #f0f0f0; color: #1a1a1a; }
.cw-sender { font-size: 11px; font-weight: 600; margin-bottom: 2px; opacity: 0.7; }
.cw-input-bar { display: flex; padding: 10px; border-top: 1px solid #eee; gap: 6px; }
.cw-input-bar input { flex: 1; padding: 8px 10px; border: 1px solid #ddd; border-radius: 16px; font-size: 13px; outline: none; }
.cw-input-bar button { padding: 8px 14px; background: #4f46e5; color: white; border: none; border-radius: 16px; cursor: pointer; font-size: 13px; }
`;

function getVisitorId() {
  let id = localStorage.getItem('cw-visitor-id');
  if (!id) {
    id = Math.random().toString(36).substring(2, 10);
    localStorage.setItem('cw-visitor-id', id);
  }
  return id;
}

export default function Widget() {
  const visitorRoom = `visitor-${getVisitorId()}`;
  const [open, setOpen] = useState(false);
  const [joined, setJoined] = useState(false);
  const [nameInput, setNameInput] = useState('');
  const [username, setUsername] = useState('');
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (document.getElementById('cw-styles')) return;
    const styleTag = document.createElement('style');
    styleTag.id = 'cw-styles';
    styleTag.textContent = styles;
    document.head.appendChild(styleTag);
  }, []);

  useEffect(() => {
    if (!joined) return;
    socket.emit('join_room', { room: visitorRoom, username });
    socket.on('chat_history', (history) => setMessages(history));
    socket.on('receive_message', (data) => {
      if (data.room === visitorRoom) {
        setMessages(prev => [...prev, data]);
      }
    });
    return () => {
      socket.off('chat_history');
      socket.off('receive_message');
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
    socket.emit('send_message', {
      room: visitorRoom,
      sender: username,
      text: input,
      timestamp: new Date()
    });
    setInput('');
  };

  return (
    <>
      <button className="cw-bubble" onClick={() => setOpen(!open)}>
        {open ? '×' : '💬'}
      </button>

      {open && (
        <div className="cw-panel">
          <div className="cw-header">Chat with us</div>

          {!joined ? (
            <div className="cw-join">
              <p style={{ fontSize: 13, color: '#555' }}>Enter your name to start chatting</p>
              <input
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
                placeholder="Your name..."
              />
              <button onClick={handleJoin}>Start Chat</button>
            </div>
          ) : (
            <>
              <div className="cw-messages">
                {messages.map((msg, i) => (
                  <div key={i} className={`cw-msg ${msg.sender === username ? 'own' : 'other'}`}>
                    {msg.sender !== username && (
                      <div className="cw-sender">{msg.sender}</div>
                    )}
                    {msg.text}
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
              <div className="cw-input-bar">
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                  placeholder="Type a message..."
                />
                <button onClick={sendMessage}>Send</button>
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
}