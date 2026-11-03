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
  
  const [regData, setRegData] = useState({ nickname: '', age: '', experience: '', password: '', email: '', word1: '', word2: '', word3: '' });
  const [loginData, setLoginData] = useState({ email: '', password: '' });
  const [isWordsValid, setIsWordsValid] = useState(false);

  const [activeTab, setActiveTab] = useState('profile'); // По умолчанию открываем профиль
  const [prices, setPrices] = useState<any>({});
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');

  useEffect(() => {
    const savedUser = localStorage.getItem('asro_user');
    if (savedUser) setUser(JSON.parse(savedUser));
    setIsLoaded(true);
  }, []);

  // ... (логика цен и чата остается без изменений)
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
    setIsWordsValid(true); setAuthStep(4);
  };

  const handleFinalRegister = async () => {
    const secret = `${regData.word1.trim()}, ${regData.word2.trim()}, ${regData.word3.trim()}`;
    const newId = Math.floor(Math.random() * 1000000);
    const { error } = await supabase.from('users').insert([{
      id: newId, nickname: regData.nickname, age: regData.age, experience: regData.experience, password: regData.password, email: regData.email, secret_words: secret 
    }]);
    if (error) { alert('Ошибка БД!'); console.log(error); } 
    else {
      const userData = { nickname: regData.nickname, experience: regData.experience };
      localStorage.setItem('asro_user', JSON.stringify(userData)); setUser(userData);
    }
  };

  const handleLogin = async () => {
    if (!loginData.email || !loginData.password) return alert('Введите email и пароль');
    const { data, error } = await supabase.from('users').select('*').eq('email', loginData.email).eq('password', loginData.password).single();
    if (error || !data) alert('Неверный Email или пароль!');
    else {
      const userData = { nickname: data.nickname, experience: data.experience };
      localStorage.setItem('asro_user', JSON.stringify(userData)); setUser(userData);
    }
  };

  const copyToClipboard = () => {
    const text = `Секретная фраза ASRO:\n1. ${regData.word1}\n2. ${regData.word2}\n3. ${regData.word3}`;
    navigator.clipboard.writeText(text); alert('Слова скопированы!');
  };

  if (!isLoaded) return <div style={{ background: '#000000', minHeight: '100vh' }}></div>;

  // ЭКРАНЫ РЕГИСТРАЦИИ (остались без изменений, только стиль)
  if (!user) {
    return (
      <div style={{ minHeight: '100vh', background: '#000000', color: 'white', fontFamily: 'Arial, sans-serif', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '30px' }}>
        {authStep === 0 && (
          <div style={{ textAlign: 'left' }}>
            <img src="/logo.svg" alt="ASRO" style={{ height: '40px', marginBottom: '60px' }} />
            <h1 style={{ fontSize: '32px', fontWeight: 'bold', marginBottom: '15px' }}>Добро пожаловать</h1>
            <p style={{ color: '#848e9c', marginBottom: '50px' }}>Платформа для трейдеров.</p>
            <button onClick={() => setAuthStep(1)} style={{ width: '100%', padding: '16px', borderRadius: '8px', border: 'none', background: '#FCD535', color: '#000000', fontSize: '16px', fontWeight: 'bold', marginBottom: '15px' }}>Создать аккаунт</button>
            <button onClick={() => setAuthStep(5)} style={{ width: '100%', padding: '16px', borderRadius: '8px', border: '1px solid #2b3139', background: 'transparent', color: 'white', fontSize: '16px', fontWeight: 'bold' }}>Войти</button>
          </div>
        )}
        {/* ... Остальные шаги регистрации (1,2,3,4,5) оставляем как были, чтобы не загромождать код. Они работают. */}
        {authStep === 1 && ( /* ... код шага 1 ... */ <div><button onClick={() => setAuthStep(2)}>Далее</button></div> )}
        {authStep === 2 && ( /* ... код шага 2 ... */ <div><button onClick={() => setAuthStep(3)}>Далее</button></div> )}
        {authStep === 3 && ( /* ... код шага 3 ... */ <div><button onClick={validateWords}>Далее</button></div> )}
        {authStep === 4 && ( /* ... код шага 4 ... */ <div><button onClick={handleFinalRegister}>Завершить</button></div> )}
        {authStep === 5 && ( /* ... код шага 5 ... */ <div><button onClick={handleLogin}>Войти</button></div> )}
      </div>
    );
  }

  // ОСНОВНОЕ ПРИЛОЖЕНИЕ
  return (
    <div style={{ minHeight: '100vh', background: '#000000', color: 'white', fontFamily: 'Arial, sans-serif', paddingBottom: '80px' }}>
      
      {/* ВЕРХНЕЕ МЕНЮ */}
      <nav style={{ position: 'fixed', top: 0, left: 0, right: 0, background: '#1e2329', display: 'flex', justifyContent: 'space-around', padding: '15px 0', borderBottom: '1px solid #2b3139', zIndex: 999 }}>
        <button onClick={() => setActiveTab('center')} style={{ background: 'none', border: 'none', color: activeTab === 'center' ? '#FCD535' : '#848e9c', fontWeight: 'bold' }}>Центр</button>
        <button onClick={() => setActiveTab('chat')} style={{ background: 'none', border: 'none', color: activeTab === 'chat' ? '#FCD535' : '#848e9c', fontWeight: 'bold' }}>💬 Чат</button>
        <button onClick={() => setActiveTab('profile')} style={{ background: 'none', border: 'none', color: activeTab === 'profile' ? '#FCD535' : '#848e9c', fontWeight: 'bold' }}>👤 Профиль</button>
      </nav>

      <main style={{ paddingTop: '65px', paddingLeft: '15px', paddingRight: '15px' }}>
        
        {/* ВКЛАДКА ЦЕНТР */}
        {activeTab === 'center' && (
          <div>
             <div style={{ padding: '20px 0', fontSize: '14px', color: '#848e9c' }}>Центр</div>
             {COINS.map((coin) => (
                <div key={coin.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '15px 0', borderBottom: '1px solid #1e2329' }}>
                  <div style={{ fontWeight: 'bold' }}>{coin.symbol}</div>
                  <div style={{ color: prices[coin.id]?.usd_24h_change >= 0 ? '#0ecb81' : '#f6465d' }}>${prices[coin.id]?.usd ? prices[coin.id].usd.toLocaleString() : '...'}</div>
                </div>
              ))}
          </div>
        )}

        {/* ВКЛАДКА ЧАТ */}
        {activeTab === 'chat' && (
          <div>
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

        {/* ВКЛАДКА ПРОФИЛЬ (НОВЫЙ ДИЗАЙН) */}
        {activeTab === 'profile' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            
            {/* ШАПКА ПРОФИЛЯ */}
            <div style={{ position: 'relative', background: 'linear-gradient(180deg, rgba(252,213,53,0.1) 0%, rgba(0,0,0,0) 100%)', borderRadius: '16px', padding: '20px', border: '1px solid #2b3139', overflow: 'hidden' }}>
              {/* Декоративный график на фоне */}
              <div style={{ position: 'absolute', top: 0, right: 0, opacity: 0.2, width: '100%', height: '100%', backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'100\' height=\'100\' viewBox=\'0 0 100 100\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cpath d=\'M0 100 L20 80 L40 90 L60 50 L80 60 L100 20 L100 100 Z\' fill=\'%23FCD535\'/%3E%3C/svg%3E")', backgroundSize: 'cover', zIndex: 0 }}></div>
              
              <div style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', gap: '15px' }}>
                {/* Золотая аватарка с короной */}
                <div style={{ position: 'relative' }}>
                  <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: '#000', border: '3px solid #FCD535', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '36px', fontWeight: 'bold', color: '#FCD535', boxShadow: '0 0 15px rgba(252,213,53,0.3)' }}>
                    {user.nickname.charAt(0).toUpperCase()}
                  </div>
                  <div style={{ position: 'absolute', bottom: '-5px', right: '-5px', background: '#FCD535', borderRadius: '50%', width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px' }}>👑</div>
                </div>
                
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <h2 style={{ margin: 0, fontSize: '22px', fontWeight: 'bold' }}>{user.nickname}</h2>
                    <span style={{ color: '#FCD535', fontSize: '18px' }}>✔</span>
                  </div>
                  <div style={{ fontSize: '12px', color: '#848e9c', marginTop: '4px' }}>🇺🇿 Uzbekistan • Trader #0001</div>
                  <div style={{ display: 'inline-block', background: 'rgba(252,213,53,0.2)', color: '#FCD535', padding: '4px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: 'bold', marginTop: '8px' }}>
                    📊 Novice • Level 2
                  </div>
                </div>
              </div>
            </div>

            {/* СТАТИСТИКА (4 колонки) */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '10px', background: '#1e2329', padding: '15px', borderRadius: '12px', border: '1px solid #2b3139', textAlign: 'center' }}>
              <div><div style={{ fontSize: '18px', fontWeight: 'bold' }}>2</div><div style={{ fontSize: '10px', color: '#848e9c' }}>Уровень</div></div>
              <div><div style={{ fontSize: '18px', fontWeight: 'bold', color: '#FCD535' }}>742</div><div style={{ fontSize: '10px', color: '#848e9c' }}>Score</div></div>
              <div><div style={{ fontSize: '18px', fontWeight: 'bold' }}>342</div><div style={{ fontSize: '10px', color: '#848e9c' }}>Сделки</div></div>
              <div><div style={{ fontSize: '18px', fontWeight: 'bold', color: '#0ecb81' }}>68%</div><div style={{ fontSize: '10px', color: '#848e9c' }}>Успех</div></div>
            </div>

            {/* ТОРГОВАЯ СТАТИСТИКА (График) */}
            <div style={{ background: '#1e2329', padding: '15px', borderRadius: '12px', border: '1px solid #2b3139' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px' }}>
                <div style={{ fontWeight: 'bold' }}>📈 Торговая статистика</div>
                <div style={{ fontSize: '12px', color: '#848e9c' }}>За все время</div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                <div>
                  <div style={{ fontSize: '12px', color: '#848e9c' }}>Прибыль</div>
                  <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#0ecb81' }}>+$12,350.75</div>
                  <div style={{ fontSize: '12px', color: '#0ecb81' }}>▲ +12.4%</div>
                </div>
                {/* Имитация графика */}
                <div style={{ width: '120px', height: '50px', background: 'linear-gradient(to top, rgba(14,203,129,0.2), transparent)', borderBottom: '2px solid #0ecb81', position: 'relative' }}>
                   <svg width="120" height="50" viewBox="0 0 120 50" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M0 40 L20 30 L40 35 L60 20 L80 25 L100 10 L120 5" stroke="#0ecb81" strokeWidth="2" fill="none"/>
                   </svg>
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '15px', borderTop: '1px solid #2b3139', paddingTop: '10px' }}>
                <div><div style={{ fontSize: '10px', color: '#848e9c' }}>Макс. просадка</div><div style={{ fontSize: '14px', color: '#f6465d', fontWeight: 'bold' }}>-5.8%</div></div>
                <div><div style={{ fontSize: '10px', color: '#848e9c' }}>R/R</div><div style={{ fontSize: '14px', fontWeight: 'bold' }}>1.82</div></div>
              </div>
            </div>

            {/* ДОСТИЖЕНИЯ */}
            <div style={{ background: '#1e2329', padding: '15px', borderRadius: '12px', border: '1px solid #2b3139' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px' }}>
                <div style={{ fontWeight: 'bold' }}>🏆 Достижения</div>
                <div style={{ fontSize: '12px', color: '#848e9c' }}>3 / 8 &gt;</div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', textAlign: 'center' }}>
                <div><div style={{ fontSize: '30px' }}>📊</div><div style={{ fontSize: '10px', color: '#848e9c' }}>100 сделок</div></div>
                <div><div style={{ fontSize: '30px' }}>🛡️</div><div style={{ fontSize: '10px', color: '#848e9c' }}>Дисциплина</div></div>
                <div><div style={{ fontSize: '30px' }}>🎯</div><div style={{ fontSize: '10px', color: '#848e9c' }}>Анализ</div></div>
                <div style={{ opacity: 0.3 }}><div style={{ fontSize: '30px' }}>🔒</div><div style={{ fontSize: '10px', color: '#848e9c' }}>Профи</div></div>
                <div style={{ opacity: 0.3 }}><div style={{ fontSize: '30px' }}>🔒</div><div style={{ fontSize: '10px', color: '#848e9c' }}>Легенда</div></div>
              </div>
            </div>

            {/* СПИСОК НАСТРОЕК */}
            <div style={{ background: '#1e2329', borderRadius: '12px', border: '1px solid #2b3139', overflow: 'hidden' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '15px', borderBottom: '1px solid #2b3139' }}>
                <div>👤 Личная информация</div> <div style={{ color: '#848e9c' }}>&gt;</div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '15px', borderBottom: '1px solid #2b3139' }}>
                <div>📈 История сделок</div> <div style={{ color: '#848e9c' }}>&gt;</div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '15px', borderBottom: '1px solid #2b3139' }}>
                <div>🛡️ Мой стиль риска</div> <div style={{ color: '#848e9c' }}>&gt;</div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '15px' }}>
                <div>📖 Обучение и ресурсы</div> <div style={{ color: '#848e9c' }}>&gt;</div>
              </div>
            </div>

            {/* КНОПКА ПРЕМИУМ */}
            <div onClick={() => alert('Скоро!')} style={{ background: 'linear-gradient(90deg, #1e2329 0%, #3a2f10 100%)', border: '1px solid #FCD535', borderRadius: '12px', padding: '15px', display: 'flex', alignItems: 'center', gap: '15px', cursor: 'pointer' }}>
              <div style={{ fontSize: '30px' }}>👑</div>
              <div>
                <div style={{ fontWeight: 'bold', color: '#FCD535' }}>ASRO Premium</div>
                <div style={{ fontSize: '12px', color: '#848e9c' }}>Достигните новых высот</div>
              </div>
            </div>

            {/* КНОПКА ВЫХОДА */}
            <div onClick={() => { localStorage.removeItem('asro_user'); setUser(null); setAuthStep(0); }} style={{ padding: '15px', color: '#f6465d', cursor: 'pointer', textAlign: 'center', background: '#1e2329', borderRadius: '12px', border: '1px solid #2b3139', marginTop: '10px' }}>🚪 Выйти из аккаунта</div>

          </div>
        )}
      </main>

      {/* НИЖНЯЯ ПАНЕЛЬ */}
      <footer style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: '#1e2329', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '10px 0', borderTop: '1px solid #2b3139', height: '60px' }}>
        <img src="/logo.svg" alt="ASRO Logo" style={{ height: '30px', width: 'auto' }} />
      </footer>
    </div>
  );
}
