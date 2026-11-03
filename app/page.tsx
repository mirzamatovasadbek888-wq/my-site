'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export default function Home() {
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [username, setUsername] = useState('');
  const [status, setStatus] = useState('Бронза');

  // Загрузка сообщений
  useEffect(() => {
    const fetchMessages = async () => {
      const { data } = await supabase.from('messages').select('*').order('created_at', { ascending: true });
      if (data) setMessages(data);
    };
    fetchMessages();

    // Подписка на новые сообщения в реальном времени
    const subscription = supabase
      .channel('messages_channel')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, payload => {
        setMessages(prev => [...prev, payload.new]);
      })
      .subscribe();

    return () => { supabase.removeChannel(subscription); };
  }, []);

  // Отправка сообщения
  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !username.trim()) return;

    await supabase.from('messages').insert([{ 
      username: username, 
      content: newMessage,
      status: status 
    }]);
    setNewMessage('');
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'sans-serif', background: '#0f172a', minHeight: '100vh', color: 'white' }}>
      <h1 style={{ textAlign: 'center', marginBottom: '20px' }}>💬 Чат Трейдеров</h1>
      
      <div style={{ background: '#1e293b', borderRadius: '12px', padding: '15px', height: '50vh', overflowY: 'auto', marginBottom: '20px' }}>
        {messages.length === 0 && <p style={{ textAlign: 'center', color: '#94a3b8' }}>Пока сообщений нет...</p>}
        {messages.map((msg, i) => (
          <div key={i} style={{ marginBottom: '10px', padding: '10px', background: '#334155', borderRadius: '8px' }}>
            <span style={{ fontWeight: 'bold', color: '#4ade80' }}>{msg.username}</span>
            <span style={{ fontSize: '12px', color: '#cbd5e1', marginLeft: '10px' }}>[{msg.status}]</span>
            <p style={{ margin: '5px 0 0 0' }}>{msg.content}</p>
          </div>
        ))}
      </div>

      <form onSubmit={sendMessage} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <div style={{ display: 'flex', gap: '10px' }}>
          <input 
            type="text" 
            placeholder="Твой ник" 
            value={username} 
            onChange={e => setUsername(e.target.value)}
            style={{ flex: 1, padding: '10px', borderRadius: '8px', border: 'none', background: '#1e293b', color: 'white' }}
          />
          <select 
            value={status} 
            onChange={e => setStatus(e.target.value)}
            style={{ padding: '10px', borderRadius: '8px', border: 'none', background: '#1e293b', color: 'white' }}
          >
            <option>Бронза</option>
            <option>Серебро</option>
            <option>Золото</option>
            <option>Алмаз</option>
          </select>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <input 
            type="text" 
            placeholder="Написать сообщение..." 
            value={newMessage} 
            onChange={e => setNewMessage(e.target.value)}
            style={{ flex: 1, padding: '10px', borderRadius: '8px', border: 'none', background: '#1e293b', color: 'white' }}
          />
          <button type="submit" style={{ padding: '10px 20px', borderRadius: '8px', border: 'none', background: '#4ade80', color: '#0f172a', fontWeight: 'bold' }}>
            Отправить
          </button>
        </div>
      </form>
    </div>
  );
}
