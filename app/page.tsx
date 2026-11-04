'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

const COINS = [
  { id: 'bitcoin', symbol: 'BTC', name: 'Bitcoin', color: '#F7931A', icon: '₿' },
  { id: 'ethereum', symbol: 'ETH', name: 'Ethereum', color: '#627EEA', icon: 'Ξ' },
  { id: 'binancecoin', symbol: 'BNB', name: 'BNB', color: '#F3BA2F', icon: 'B' },
  { id: 'solana', symbol: 'SOL', name: 'Solana', color: '#14F195', icon: 'S' },
  { id: 'ripple', symbol: 'XRP', name: 'XRP', color: '#23292F', icon: 'X' },
];

export default function Home() {
  const [isLoaded, setIsLoaded] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [authStep, setAuthStep] = useState(0); 
  
  const [regData, setRegData] = useState({ 
    nickname: '', first_name: '', last_name: '', birth_year: '', gender: 'Мужской', 
    age: '', experience: '', password: '', email: '', word1: '', word2: '', word3: '' 
  });
  const [loginData, setLoginData] = useState({ email: '', password: '' });

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
    const subscription = supabase.channel('messages_channel').on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, payload => {
        setMessages(prev => [...prev, payload.new]);
      }).subscribe();
    return () => { supabase.removeChannel(subscription); };
  }, [activeTab, user]);

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !user) return;
    await supabase.from('messages').insert([{ username: user.nickname, content: newMessage }]);
    setNewMessage('');
  };

  const validateWords = () => {
    const w1 = regData.word1.trim(); const w2 = regData.word2.trim(); const w3 = regData.word3.trim();
    if (w1.length <= 5 || w2.length <= 5 || w3.length <= 5) return alert('Слова > 5 букв!');
    if (w1 === w2 || w2 === w3 || w1 === w3) return alert('Слова должны быть разными!');
    setAuthStep(4);
  };

  const handleFinalRegister = async () => {
    const secret = `${regData.word1.trim()}, ${regData.word2.trim()}, ${regData.word3.trim()}`;
    const newId = Math.floor(Math.random() * 1000000);
    const { error } = await supabase.from('users').insert([{
      id: newId, nickname: regData.nickname, first_name: regData.first_name, 
      last_name: regData.last_name, birth_year: regData.birth_year, gender: regData.gender,
      age: regData.age, experience: regData.experience, password: regData.password, email: regData.email, secret_words: secret 
    }]);
    if (error) { alert('Ошибка базы данных!'); console.log(error); } 
    else {
      const userData = { 
        nickname: regData.nickname, experience: regData.experience,
        first_name: regData.first_name, last_name: regData.last_name, 
        birth_year: regData.birth_year, gender: regData.gender, email: regData.email 
      };
      localStorage.setItem('asro_user', JSON.stringify(userData)); 
      setUser(userData);
    }
  };

  const handleLogin = async () => {
    if (!loginData.email || !loginData.password) return alert('Введите email и пароль');
    const { data, error } = await supabase.from('users').select('*').eq('email', loginData.email).eq('password', loginData.password).single();
    if (error || !data) alert('Неверный Email или пароль!');
    else {
      const userData = { 
        nickname: data.nickname, experience: data.experience,
        first_name: data.first_name, last_name: data.last_name, 
        birth_year: data.birth_year, gender: data.gender, email: data.email 
      };
      localStorage.setItem('asro_user', JSON.stringify(userData)); 
      setUser(userData);
    }
  };

  const copyToClipboard = () => {
    const text = `Секретная фраза ASRO:\n1. ${regData.word1}\n2. ${regData.word2}\n3. ${regData.word3}`;
    navigator.clipboard.writeText(text); alert('Слова скопированы!');
  };

  if (!isLoaded) return <div style={{ background: '#000000', minHeight: '100vh' }}></div>;

  if (!user) {
    return (
      <div style={{ minHeight: '100vh', background: '#000000', color: 'white', fontFamily: 'Arial, sans-serif', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '30px' }}>
        {authStep === 0 && (
          <div style={{ textAlign: 'left' }}>
            <img src="/logo.svg" alt="ASRO" style={{ height: '40px', marginBottom: '60px' }} />
            <h1 style={{ fontSize: '32px', fontWeight: 'bold', marginBottom: '15px' }}>Добро пожаловать в ASRO</h1>
            <p style={{ color: '#848e9c', marginBottom: '50px' }}>Профессиональная платформа.</p>
            <button onClick={() => setAuthStep(1)} style={{ width: '100%', padding: '16px', borderRadius: '8px', border: 'none', background: '#A855F7', color: 'white', fontSize: '16px', fontWeight: 'bold', marginBottom: '15px' }}>Создать аккаунт</button>
            <button onClick={() => setAuthStep(5)} style={{ width: '100%', padding: '16px', borderRadius: '8px', border: '1px solid #2b3139', background: 'transparent', color: 'white', fontSize: '16px', fontWeight: 'bold' }}>Войти</button>
          </div>
        )}
        {authStep === 1 && (
          <div>
            <h2 style={{ fontSize: '24px', marginBottom: '20px', fontWeight: 'bold' }}>Личные данные</h2>
            <input type="text" placeholder="Имя" value={regData.first_name} onChange={e => setRegData({...regData, first_name: e.target.value})} style={{ width: '100%', padding: '14px', marginBottom: '10px', borderRadius: '8px', border: '1px solid #2b3139', background: '#1e2329', color: 'white' }} />
            <input type="text" placeholder="Фамилия" value={regData.last_name} onChange={e => setRegData({...regData, last_name: e.target.value})} style={{ width: '100%', padding: '14px', marginBottom: '10px', borderRadius: '8px', border: '1px solid #2b3139', background: '#1e2329', color: 'white' }} />
            <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
              <input type="number" placeholder="Год рождения" value={regData.birth_year} onChange={e => setRegData({...regData, birth_year: e.target.value})} style={{ flex: 1, padding: '14px', borderRadius: '8px', border: '1px solid #2b3139', background: '#1e2329', color: 'white' }} />
              <select value={regData.gender} onChange={e => setRegData({...regData, gender: e.target.value})} style={{ flex: 1, padding: '14px', borderRadius: '8px', border: '1px solid #2b3139', background: '#1e2329', color: 'white' }}>
                <option>Мужской</option>
                <option>Женский</option>
              </select>
            </div>
            <input type="text" placeholder="Никнейм" value={regData.nickname} onChange={e => setRegData({...regData, nickname: e.target.value})} style={{ width: '100%', padding: '14px', marginBottom: '20px', borderRadius: '8px', border: '1px solid #2b3139', background: '#1e2329', color: 'white' }} />
            <button onClick={() => setAuthStep(2)} style={{ width: '100%', padding: '16px', borderRadius: '8px', border: 'none', background: '#A855F7', color: 'white', fontSize: '16px', fontWeight: 'bold' }}>Продолжить</button>
            <button onClick={() => setAuthStep(0)} style={{ width: '100%', padding: '16px', marginTop: '10px', borderRadius: '8px', border: '1px solid #2b3139', background: 'transparent', color: 'white' }}>Назад</button>
          </div>
        )}
        {authStep === 2 && (
          <div>
            <h2 style={{ fontSize: '24px', marginBottom: '20px', fontWeight: 'bold' }}>Безопасность</h2>
            <input type="text" placeholder="Опыт на рынке (лет)" value={regData.experience} onChange={e => setRegData({...regData, experience: e.target.value})} style={{ width: '100%', padding: '14px', marginBottom: '10px', borderRadius: '8px', border: '1px solid #2b3139', background: '#1e2329', color: 'white' }} />
            <input type="email" placeholder="Email" value={regData.email} onChange={e => setRegData({...regData, email: e.target.value})} style={{ width: '100%', padding: '14px', marginBottom: '10px', borderRadius: '8px', border: '1px solid #2b3139', background: '#1e2329', color: 'white' }} />
            <input type="password" placeholder="Пароль" value={regData.password} onChange={e => setRegData({...regData, password: e.target.value})} style={{ width: '100%', padding: '14px', marginBottom: '20px', borderRadius: '8px', border: '1px solid #2b3139', background: '#1e2329', color: 'white' }} />
            <button onClick={() => setAuthStep(3)} style={{ width: '100%', padding: '16px', borderRadius: '8px', border: 'none', background: '#A855F7', color: 'white', fontSize: '16px', fontWeight: 'bold' }}>Далее</button>
            <button onClick={() => setAuthStep(1)} style={{ width: '100%', padding: '16px', marginTop: '10px', borderRadius: '8px', border: '1px solid #2b3139', background: 'transparent', color: 'white' }}>Назад</button>
          </div>
        )}
        {authStep === 3 && (
          <div>
            <h2 style={{ fontSize: '24px', marginBottom: '10px', fontWeight: 'bold' }}>Секретная фраза</h2>
            <input type="text" placeholder="Слово 1" value={regData.word1} onChange={e => setRegData({...regData, word1: e.target.value})} style={{ width: '100%', padding: '14px', marginBottom: '10px', borderRadius: '8px', border: '1px solid #2b3139', background: '#1e2329', color: 'white' }} />
            <input type="text" placeholder="Слово 2" value={regData.word2} onChange={e => setRegData({...regData, word2: e.target.value})} style={{ width: '100%', padding: '14px', marginBottom: '10px', borderRadius: '8px', border: '1px solid #2b3139', background: '#1e2329', color: 'white' }} />
            <input type="text" placeholder="Слово 3" value={regData.word3} onChange={e => setRegData({...regData, word3: e.target.value})} style={{ width: '100%', padding: '14px', marginBottom: '20px', borderRadius: '8px', border: '1px solid #2b3139', background: '#1e2329', color: 'white' }} />
            <button onClick={validateWords} style={{ width: '100%', padding: '16px', borderRadius: '8px', border: 'none', background: '#A855F7', color: 'white', fontSize: '16px', fontWeight: 'bold' }}>Продолжить</button>
            <button onClick={() => setAuthStep(2)} style={{ width: '100%', padding: '16px', marginTop: '10px', borderRadius: '8px', border: '1px solid #2b3139', background: 'transparent', color: 'white' }}>Назад</button>
          </div>
        )}
        {authStep === 4 && (
          <div>
            <h2 style={{ fontSize: '24px', marginBottom: '10px', fontWeight: 'bold' }}>Сохраните фразу</h2>
            <div style={{ background: '#1e2329', border: '1px solid #A855F7', borderRadius: '12px', padding: '20px', marginBottom: '20px' }}>
              <div style={{ marginBottom: '10px', fontSize: '18px' }}>1. {regData.word1}</div>
              <div style={{ marginBottom: '10px', fontSize: '18px' }}>2. {regData.word2}</div>
              <div style={{ fontSize: '18px' }}>3. {regData.word3}</div>
            </div>
            <button onClick={copyToClipboard} style={{ width: '100%', padding: '16px', borderRadius: '8px', border: '1px solid #A855F7', background: 'transparent', color: '#A855F7', marginBottom: '10px' }}>📋 Скопировать</button>
            <button onClick={handleFinalRegister} style={{ width: '100%', padding: '16px', borderRadius: '8px', border: 'none', background: '#A855F7', color: 'white', fontWeight: 'bold' }}>Завершить</button>
          </div>
        )}
        {authStep === 5 && (
          <div>
            <h2 style={{ fontSize: '24px', marginBottom: '20px', fontWeight: 'bold' }}>Вход</h2>
            <input type="email" placeholder="Email" value={loginData.email} onChange={e => setLoginData({...loginData, email: e.target.value})} style={{ width: '100%', padding: '14px', marginBottom: '10px', borderRadius: '8px', border: '1px solid #2b3139', background: '#1e2329', color: 'white' }} />
            <input type="password" placeholder="Пароль" value={loginData.password} onChange={e => setLoginData({...loginData, password: e.target.value})} style={{ width: '100%', padding: '14px', marginBottom: '20px', borderRadius: '8px', border: '1px solid #2b3139', background: '#1e2329', color: 'white' }} />
            <button onClick={handleLogin} style={{ width: '100%', padding: '16px', borderRadius: '8px', border: 'none', background: '#A855F7', color: 'white', fontWeight: 'bold' }}>Войти</button>
            <button onClick={() => setAuthStep(0)} style={{ width: '100%', padding: '16px', marginTop: '10px', borderRadius: '8px', border: '1px solid #2b3139', background: 'transparent', color: 'white' }}>Назад</button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0b0e11', color: 'white', fontFamily: 'Arial, sans-serif', paddingBottom: '80px' }}>
      
      {/* ВЕРХНЕЕ МЕНЮ С ФИОЛЕТОВЫМ АКЦЕНТОМ */}
      <nav style={{ position: 'fixed', top: 0, left: 0, right: 0, background: '#0b0e11', display: 'flex', justifyContent: 'space-around', padding: '15px 0 0 0', borderBottom: '1px solid #1e2329', zIndex: 999 }}>
        
        <button onClick={() => setActiveTab('center')} style={{ background: 'none', border: 'none', color: activeTab === 'center' ? '#A855F7' : '#848e9c', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', fontWeight: 'bold', fontSize: '13px', paddingBottom: '10px', borderBottom: activeTab === 'center' ? '2px solid #A855F7' : '2px solid transparent' }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>
          Центр
        </button>

        <button onClick={() => setActiveTab('chat')} style={{ background: 'none', border: 'none', color: activeTab === 'chat' ? '#A855F7' : '#848e9c', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', fontWeight: 'bold', fontSize: '13px', paddingBottom: '10px', borderBottom: activeTab === 'chat' ? '2px solid #A855F7' : '2px solid transparent' }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
          Чат
        </button>

        <button onClick={() => setActiveTab('profile')} style={{ background: 'none', border: 'none', color: activeTab === 'profile' ? '#A855F7' : '#848e9c', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', fontWeight: 'bold', fontSize: '13px', paddingBottom: '10px', borderBottom: activeTab === 'profile' ? '2px solid #A855F7' : '2px solid transparent' }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
          Профиль
        </button>

      </nav>

      <main style={{ paddingTop: '90px', paddingLeft: '20px', paddingRight: '20px' }}>
        
        {/* ЦЕНТР (КАК НА СКРИНШОТЕ) */}
        {activeTab === 'center' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            
            <div>
              <h1 style={{ fontSize: '28px', fontWeight: 'bold', margin: 0 }}>Привет, {user.first_name || user.nickname}!</h1>
              <p style={{ color: '#848e9c', margin: '5px 0 0 0', fontSize: '15px' }}>Добро пожаловать на ASRO</p>
            </div>

            {/* Сетка кнопок */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
              
              <div onClick={() => setActiveTab('chat')} style={{ background: '#13161b', padding: '20px 15px', borderRadius: '16px', border: '1px solid #1e2329', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '12px' }}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#A855F7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
                <div style={{ fontWeight: 'bold', fontSize: '15px', flex: 1 }}>Чат</div>
                <div style={{ color: '#848e9c', fontSize: '18px' }}>›</div>
              </div>
              
              <div onClick={() => alert('Обучение в разработке')} style={{ background: '#13161b', padding: '20px 15px', borderRadius: '16px', border: '1px solid #1e2329', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '12px' }}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#A855F7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path></svg>
                <div style={{ fontWeight: 'bold', fontSize: '15px', flex: 1 }}>Обучение</div>
                <div style={{ color: '#848e9c', fontSize: '18px' }}>›</div>
              </div>

              <div onClick={() => alert('Сигналы в разработке')} style={{ background: '#13161b', padding: '20px 15px', borderRadius: '16px', border: '1px solid #1e2329', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '12px' }}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#A855F7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20V10"></path><path d="M18 20V4"></path><path d="M6 20v-4"></path></svg>
                <div style={{ fontWeight: 'bold', fontSize: '15px', flex: 1 }}>Сигналы</div>
                <div style={{ color: '#848e9c', fontSize: '18px' }}>›</div>
              </div>

              <div onClick={() => setActiveTab('profile')} style={{ background: '#13161b', padding: '20px 15px', borderRadius: '16px', border: '1px solid #1e2329', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '12px' }}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#A855F7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                <div style={{ fontWeight: 'bold', fontSize: '15px', flex: 1 }}>Профиль</div>
                <div style={{ color: '#848e9c', fontSize: '18px' }}>›</div>
              </div>

            </div>

            {/* Обзор рынка */}
            <div style={{ background: '#13161b', borderRadius: '16px', border: '1px solid #1e2329', overflow: 'hidden', marginTop: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px', borderBottom: '1px solid #1e2329' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontWeight: 'bold', fontSize: '16px' }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#A855F7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline><polyline points="17 6 23 6 23 12"></polyline></svg>
                  Обзор рынка
                </div>
                <div style={{ color: '#848e9c' }}>^</div>
              </div>
              
              {COINS.map((coin) => (
                <div key={coin.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '18px 20px', borderBottom: '1px solid #1e2329' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                    <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: coin.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', fontWeight: 'bold', color: 'white' }}>
                      {coin.icon}
                    </div>
                    <div>
                      <div style={{ fontWeight: 'bold', fontSize: '16px' }}>{coin.symbol}</div>
                      <div style={{ fontSize: '13px', color: '#848e9c' }}>{coin.name}</div>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: 'bold', fontSize: '16px' }}>${prices[coin.id]?.usd ? prices[coin.id].usd.toLocaleString() : '...'}</div>
                    <div style={{ fontSize: '14px', color: prices[coin.id]?.usd_24h_change >= 0 ? '#0ecb81' : '#f6465d' }}>
                      {prices[coin.id]?.usd_24h_change >= 0 ? '+' : ''}{prices[coin.id]?.usd_24h_change ? prices[coin.id].usd_24h_change.toFixed(2) : '0.00'}%
                    </div>
                  </div>
                </div>
              ))}
            </div>

          </div>
        )}

        {activeTab === 'chat' && (
          <div>
            <div style={{ background: '#13161b', borderRadius: '12px', padding: '15px', height: '55vh', overflowY: 'auto', marginBottom: '15px' }}>
              {messages.map((msg, i) => (
                <div key={i} style={{ marginBottom: '10px', padding: '10px', background: '#1e2329', borderRadius: '8px' }}>
                  <span style={{ fontWeight: 'bold', color: '#A855F7' }}>{msg.username}</span>
                  <p style={{ margin: '5px 0 0 0' }}>{msg.content}</p>
                </div>
              ))}
            </div>
            <form onSubmit={sendMessage} style={{ display: 'flex', gap: '10px' }}>
              <input type="text" placeholder="Сообщение..." value={newMessage} onChange={e => setNewMessage(e.target.value)} style={{ flex: 1, padding: '12px', borderRadius: '8px', border: '1px solid #1e2329', background: '#13161b', color: 'white' }} />
              <button type="submit" style={{ padding: '10px 20px', borderRadius: '8px', border: 'none', background: '#A855F7', color: 'white', fontWeight: 'bold' }}>Ввод</button>
            </form>
          </div>
        )}

        {activeTab === 'profile' && (
          <div style={{ padding: '20px 0' }}>
            <div style={{ background: '#13161b', borderRadius: '16px', padding: '30px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '20px', border: '1px solid #1e2329' }}>
              <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: '#A855F7', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '32px', fontWeight: 'bold', marginBottom: '15px' }}>
                {user.nickname.charAt(0).toUpperCase()}
              </div>
              <h2 style={{ margin: '0 0 5px 0', fontSize: '24px' }}>{user.first_name} {user.last_name}</h2>
              <div style={{ fontSize: '14px', color: '#A855F7', marginBottom: '20px' }}>@{user.nickname}</div>
              
              <div style={{ width: '100%', borderTop: '1px solid #1e2329', paddingTop: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '15px' }}>
                  <span style={{ color: '#848e9c' }}>Email</span> <span>{user.email}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '15px' }}>
                  <span style={{ color: '#848e9c' }}>Год рождения</span> <span>{user.birth_year}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '15px' }}>
                  <span style={{ color: '#848e9c' }}>Пол</span> <span>{user.gender}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '15px' }}>
                  <span style={{ color: '#848e9c' }}>Опыт на рынке</span> <span>{user.experience} лет</span>
                </div>
              </div>
            </div>
            <div style={{ background: '#13161b', borderRadius: '12px', border: '1px solid #1e2329', overflow: 'hidden' }}>
              <div onClick={() => { localStorage.removeItem('asro_user'); setUser(null); setAuthStep(0); }} style={{ padding: '15px 20px', color: '#f6465d', cursor: 'pointer', textAlign: 'center' }}>🚪 Выйти</div>
            </div>
          </div>
        )}
      </main>

      <footer style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: '#0b0e11', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '10px 0', borderTop: '1px solid #1e2329', height: '60px' }}>
        <img src="/logo.svg" alt="ASRO Logo" style={{ height: '30px', width: 'auto' }} />
      </footer>
    </div>
  );
}
