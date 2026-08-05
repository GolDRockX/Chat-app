import { useEffect, useState, useRef } from 'react';
import { io } from 'socket.io-client';

const socket = io('https://chat-app-backend.bonto.run');

export default function Dashboard() {
  const [visitors, setVisitors] = useState([]);
  const [activeRoom, setActiveRoom] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const messagesEndRef = useRef(null);

  useEffect(() => {
    socket.emit('join_dashboard');
    socket.on('visitor_list', (list) => setVisitors(list));
    return () => socket.off('visitor_list');
  }, []);

  useEffect(() => {
    if (!activeRoom) return;
    socket.emit('join_room', { room: activeRoom, username: 'Agent' });
    socket.on('chat_history', (history) => setMessages(history));
    socket.on('receive_message', (data) => {
      setMessages(prev => data.room === activeRoom ? [...prev, data] : prev);
    });
    return () => {
      socket.off('chat_history');
      socket.off('receive_message');
    };
  }, [activeRoom]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendReply = () => {
    if (input.trim() === '' || !activeRoom) return;
    socket.emit('send_message', {
      room: activeRoom,
      sender: 'Agent',
      text: input,
      timestamp: new Date()
    });
    setInput('');
  };

  return (
    <div style={{ display: 'flex', height: '100vh', fontFamily: 'sans-serif' }}>
      <div style={{ width: 280, borderRight: '1px solid #eee', overflowY: 'auto' }}>
        <h3 style={{ padding: 16 }}>Active Conversations</h3>
        {visitors.length === 0 && <p style={{ padding: '0 16px', color: '#888' }}>No visitors yet</p>}
        {visitors.map(v => (
          <div
            key={v.room}
            onClick={() => setActiveRoom(v.room)}
            style={{
              padding: 12,
              borderBottom: '1px solid #f0f0f0',
              cursor: 'pointer',
              background: activeRoom === v.room ? '#f0f0ff' : 'white'
            }}
          >
            <strong>{v.visitorName || v.room}</strong>
            <div style={{ fontSize: 12, color: '#888', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {v.lastMessage}
            </div>
          </div>
        ))}
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {!activeRoom ? (
          <div style={{ margin: 'auto', color: '#888' }}>Select a conversation to reply</div>
        ) : (
          <>
            <div style={{ padding: 16, borderBottom: '1px solid #eee', fontWeight: 600 }}>{activeRoom}</div>
            <div style={{ flex: 1, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {messages.map((msg, i) => (
                <div key={i} style={{
                  alignSelf: msg.sender === 'Agent' ? 'flex-end' : 'flex-start',
                  background: msg.sender === 'Agent' ? '#4f46e5' : '#f0f0f0',
                  color: msg.sender === 'Agent' ? 'white' : '#1a1a1a',
                  padding: '8px 12px', borderRadius: 12, maxWidth: '70%'
                }}>
                  {msg.text}
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
            <div style={{ display: 'flex', padding: 12, borderTop: '1px solid #eee', gap: 8 }}>
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && sendReply()}
                placeholder="Reply..."
                style={{ flex: 1, padding: 10, borderRadius: 20, border: '1px solid #ddd' }}
              />
              <button onClick={sendReply} style={{ padding: '10px 20px', background: '#4f46e5', color: 'white', border: 'none', borderRadius: 20 }}>
                Send
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}