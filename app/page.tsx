'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

const COINS = [
  { id: 'bitcoin', symbol: 'BTC', name: 'Bitcoin', color: '#F7931A' },
  { id: 'ethereum', symbol: 'ETH', name: 'Ethereum', color: '#627EEA' },
  { id: 'binancecoin', symbol: 'BNB', name: 'BNB', color: '#F3BA2F' },
  { id: 'solana', symbol: 'SOL', name: 'Solana', color: '#14F195' },
  { id: 'ripple', symbol: 'XRP', name: 'XRP', color: '#23292F' },
];

export default function Home() {
  const [isLoaded, setIsLoaded] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [authStep, setAuthStep] = useState(0); 
  const [regData, setRegData] = useState({ nickname: '', age: '', experience: '', password: '', email: '' });

  const [activeTab, setActiveTab] = useState('center'); 
  
  const [prices, setPrices] = useState<any>({});
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');

  useEffect(() => {
    const savedUser = localStorage.getItem('asro_user');
    if (savedUser) setUser(JSON.parse(savedUser));
    setIsLoaded(true);
  }, []);

  useEffect(() => {
    if (activeTab !== 'center') return;
    const fetchPrices = async () => {
      const ids = COINS.map(c => c.id).join(',');
      const res = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd&include_24hr_change=true`);
      const data = await res.json();
      setPrices(data);
    };
    fetchPrices();
  }, [activeTab]);

  useEffect(() => {
    if (activeTab !== 'chat' || !user) return;
    const fetchMessages = async () => {
      const { data } = await supabase.from('messages').select('*').order('created_at', { ascending: true });
      if (data) setMessages(data);
    };
    fetchMessages();
    const subscription = supabase
      .channel('messages_channel')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, payload => {
        setMessages(prev => [...prev, payload.new]);
      })
      .subscribe();
    return () => { supabase.removeChannel(subscription); };
  }, [activeTab, user]);

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !user) return;
    await supabase.from('messages').insert([{ username: user.nickname, content: newMessage }]);
    setNewMessage('');
  };

  const handleRegister = async () => {
    if (!regData.nickname || !regData.password) return alert('Заполни ник и пароль');
    const newId = Math.floor(Math.random() * 1000000);
    const { error } = await supabase.from('users').insert([{
      id: newId, nickname: regData.nickname, age: regData.age, experience: regData.experience, password: regData.password, email: regData.email
    }]);
    if (error) { alert('Ошибка базы данных!'); console.log(error); } 
    else {
      const userData = { nickname: regData.nickname, experience: regData.experience };
      localStorage.setItem('asro_user', JSON.stringify(userData));
      setUser(userData);
    }
  };

  if (!isLoaded) return <div style={{ background: '#0b0e11', minHeight: '100vh' }}></div>;

  if (!user) {
    return (
      <div style={{ minHeight: '100vh', background: '#0b0e11', color: 'white', fontFamily: 'Arial, sans-serif', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '20px' }}>
        {authStep === 0 && (
          <div style={{ textAlign: 'center' }}>
            <img src="/logo.svg" alt="ASRO" style={{ height: '60px', marginBottom: '40px' }} />
            <h1 style={{ fontSize: '28px', marginBottom: '10px' }}>Добро пожаловать</h1>
            <p style={{ color: '#848e9c', marginBottom: '40px' }}>Платформа для трейдеров</p>
            <button onClick={() => setAuthStep(1)} style={{ width: '100%', padding: '15px', borderRadius: '12px', border: 'none', background: '#0ecb81', color: 'white', fontSize: '18px', fontWeight: 'bold' }}>Регистрация</button>
          </div>
        )}
        {authStep === 1 && (
          <div>
            <h2 style={{ textAlign: 'center', marginBottom: '30px' }}>Шаг 1: О тебе</h2>
            <input type="text" placeholder="Твой ник" value={regData.nickname} onChange={e => setRegData({...regData, nickname: e.target.value})} style={{ width: '100%', padding: '15px', marginBottom: '15px', borderRadius: '8px', border: '1px solid #2b3139', background: '#1e2329', color: 'white' }} />
            <input type="number" placeholder="Сколько тебе лет?" value={regData.age} onChange={e => setRegData({...regData, age: e.target.value})} style={{ width: '100%', padding: '15px', marginBottom: '15px', borderRadius: '8px', border: '1px solid #2b3139', background: '#1e2329', color: 'white' }} />
            <input type="text" placeholder="Сколько лет на рынке?" value={regData.experience} onChange={e => setRegData({...regData, experience: e.target.value})} style={{ width: '100%', padding: '15px', marginBottom: '30px', borderRadius: '8px', border: '1px solid #2b3139', background: '#1e2329', color: 'white' }} />
            <button onClick={() => setAuthStep(2)} style={{ width: '100%', padding: '15px', borderRadius: '12px', border: 'none', background: '#0ecb81', color: 'white', fontSize: '18px', fontWeight: 'bold' }}>Далее</button>
          </div>
        )}
        {authStep === 2 && (
          <div>
            <h2 style={{ textAlign: 'center', marginBottom: '30px' }}>Шаг 2: Безопасность</h2>
            <input type="password" placeholder="Придумай пароль" value={regData.password} onChange={e => setRegData({...regData, password: e.target.value})} style={{ width: '100%', padding: '15px', marginBottom: '15px', borderRadius: '8px', border: '1px solid #2b3139', background: '#1e2329', color: 'white' }} />
            <input type="email" placeholder="Email (необязательно)" value={regData.email} onChange={e => setRegData({...regData, email: e.target.value})} style={{ width: '100%', padding: '15px', marginBottom: '30px', borderRadius: '8px', border: '1px solid #2b3139', background: '#1e2329', color: 'white' }} />
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => setAuthStep(1)} style={{ flex: 1, padding: '15px', borderRadius: '12px', border: '1px solid #848e9c', background: 'transparent', color: 'white' }}>Назад</button>
              <button onClick={handleRegister} style={{ flex: 2, padding: '15px', borderRadius: '12px', border: 'none', background: '#0ecb81', color: 'white', fontSize: '18px', fontWeight: 'bold' }}>Создать профиль</button>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0b0e11', color: 'white', fontFamily: 'Arial, sans-serif', paddingBottom: '80px' }}>
      
      {/* ВЕРХНЕЕ МЕНЮ (вместо шапки с логотипом) */}
      <nav style={{ position: 'fixed', top: 0, left: 0, right: 0, background: '#1e2329', display: 'flex', justifyContent: 'space-around', padding: '15px 0', borderBottom: '1px solid #2b3139', zIndex: 999 }}>
        <button onClick={() => setActiveTab('center')} style={{ background: 'none', border: 'none', color: activeTab === 'center' ? '#FCD535' : '#848e9c', fontWeight: 'bold', fontSize: '15px' }}>Центр</button>
        <button onClick={() => setActiveTab('chat')} style={{ background: 'none', border: 'none', color: activeTab === 'chat' ? '#FCD535' : '#848e9c', fontWeight: 'bold', fontSize: '15px' }}>💬 Чат</button>
        <button onClick={() => setActiveTab('profile')} style={{ background: 'none', border: 'none', color: activeTab === 'profile' ? '#FCD535' : '#848e9c', fontWeight: 'bold', fontSize: '15px' }}>👤 Профиль</button>
      </nav>

      {/* ОСНОВНОЙ КОНТЕНТ (с отступом сверху, чтобы не залезал под меню) */}
      <main style={{ paddingTop: '65px' }}>
        {activeTab === 'center' && (
          <div>
             <div style={{ padding: '20px', fontSize: '14px', color: '#848e9c' }}>Центр (Скоро здесь будет всё)</div>
             {COINS.map((coin) => (
                <div key={coin.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '15px 20px', borderBottom: '1px solid #1e2329' }}>
                  <div style={{ fontWeight: 'bold' }}>{coin.symbol}</div>
                  <div style={{ color: prices[coin.id]?.usd_24h_change >= 0 ? '#0ecb81' : '#f6465d' }}>${prices[coin.id]?.usd ? prices[coin.id].usd.toLocaleString() : '...'}</div>
                </div>
              ))}
          </div>
        )}
        {activeTab === 'chat' && (
          <div style={{ padding: '15px' }}>
            <div style={{ background: '#1e293b', borderRadius: '12px', padding: '15px', height: '55vh', overflowY: 'auto', marginBottom: '15px' }}>
              {messages.map((msg, i) => (
                <div key={i} style={{ marginBottom: '10px', padding: '10px', background: '#334155', borderRadius: '8px' }}>
                  <span style={{ fontWeight: 'bold', color: '#4ade80' }}>{msg.username}</span>
                  <p style={{ margin: '5px 0 0 0' }}>{msg.content}</p>
                </div>
              ))}
            </div>
            <form onSubmit={sendMessage} style={{ display: 'flex', gap: '10px' }}>
              <input type="text" placeholder="Сообщение..." value={newMessage} onChange={e => setNewMessage(e.target.value)} style={{ flex: 1, padding: '10px', borderRadius: '8px', border: 'none', background: '#1e293b', color: 'white' }} />
              <button type="submit" style={{ padding: '10px 20px', borderRadius: '8px', border: 'none', background: '#4ade80', color: '#0f172a', fontWeight: 'bold' }}>Ввод</button>
            </form>
          </div>
        )}
        {activeTab === 'profile' && (
          <div style={{ padding: '20px' }}>
            <div style={{ background: '#1e2329', borderRadius: '16px', padding: '30px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '20px', border: '1px solid #2b3139' }}>
              <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: '#FCD535', color: '#0b0e11', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '32px', fontWeight: 'bold', marginBottom: '15px' }}>
                {user.nickname.charAt(0).toUpperCase()}
              </div>
              <h2 style={{ margin: '0 0 5px 0', fontSize: '24px' }}>{user.nickname}</h2>
              <div style={{ fontSize: '14px', color: '#848e9c' }}>Опыт: {user.experience}</div>
            </div>
            <div style={{ background: '#1e2329', borderRadius: '12px', border: '1px solid #2b3139', overflow: 'hidden' }}>
              <div onClick={() => { localStorage.removeItem('asro_user'); setUser(null); setAuthStep(0); }} style={{ padding: '15px 20px', color: '#f6465d', cursor: 'pointer', textAlign: 'center' }}>🚪 Выйти</div>
            </div>
          </div>
        )}
      </main>

      {/* НИЖНЯЯ ПАНЕЛЬ С ЛОГОТИПОМ */}
      <footer style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: '#1e2329', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '10px 0', borderTop: '1px solid #2b3139', height: '60px' }}>
        <img src="/logo.svg" alt="ASRO Logo" style={{ height: '30px', width: 'auto' }} />
      </footer>
    </div>
  );
}
