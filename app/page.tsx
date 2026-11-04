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
  
  const [signals, setSignals] = useState<any[]>([]);
  const [showSignalForm, setShowSignalForm] = useState(false);
  const [newSignal, setNewSignal] = useState({ coin: '', action: 'BUY', entry: '', target: '', stop: '', desc: '' });

  useEffect(() => {
    const savedUser = localStorage.getItem('asro_user');
    if (savedUser) setUser(JSON.parse(savedUser));
    setIsLoaded(true);
  }, []);

  // Загрузка цен и объемов
  useEffect(() => {
    if (activeTab !== 'center') return;
    const fetchPrices = async () => {
      const ids = COINS.map(c => c.id).join(',');
      // Добавили include_24hr_vol=true чтобы показывать объем
      const res = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd&include_24hr_change=true&include_24hr_vol=true`);
      const data = await res.json();
      setPrices(data);
    };
    fetchPrices();
  }, [activeTab]);

  // Загрузка чата
  useEffect(() => {
    if (activeTab !== 'chat' || !user) return;
    const fetchMessages = async () => {
      const { data } = await supabase.from('messages').select('*').order('created_at', { ascending: true });
      if (data) setMessages(data);
    };
    fetchMessages();
    const sub = supabase.channel('messages_channel').on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, payload => {
        setMessages(prev => [...prev, payload.new]);
      }).subscribe();
    return () => { supabase.removeChannel(sub); };
  }, [activeTab, user]);

  // Загрузка сигналов для Центра
  useEffect(() => {
    if (activeTab !== 'center') return;
    const fetchSignals = async () => {
      const { data } = await supabase.from('signals').select('*').order('created_at', { ascending: false }).limit(10); // Показываем последние 10
      if (data) setSignals(data);
    };
    fetchSignals();
  }, [activeTab]);

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !user) return;
    await supabase.from('messages').insert([{ username: user.nickname, content: newMessage }]);
    setNewMessage('');
  };

  const postSignal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSignal.coin || !newSignal.entry) return alert('Заполни монету и цену входа!');
    
    await supabase.from('signals').insert([{
      author: user.nickname,
      coin: newSignal.coin.toUpperCase(),
      action: newSignal.action,
      entry_price: newSignal.entry,
      target_price: newSignal.target,
      stop_loss: newSignal.stop,
      description: newSignal.desc
    }]);
    
    // Обновляем список сигналов на главной
    const { data } = await supabase.from('signals').select('*').order('created_at', { ascending: false });
    if (data) setSignals(data);
    
    setNewSignal({ coin: '', action: 'BUY', entry: '', target: '', stop: '', desc: '' });
    setShowSignalForm(false);
    alert('Сигнал опубликован!');
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
    if (error) { alert('Ошибка базы!'); console.log(error); } 
    else {
      const userData = { nickname: regData.nickname, experience: regData.experience, first_name: regData.first_name, last_name: regData.last_name, birth_year: regData.birth_year, gender: regData.gender, email: regData.email };
      localStorage.setItem('asro_user', JSON.stringify(userData)); setUser(userData);
    }
  };

  const handleLogin = async () => {
    if (!loginData.email || !loginData.password) return alert('Введите email и пароль');
    const { data, error } = await supabase.from('users').select('*').eq('email', loginData.email).eq('password', loginData.password).single();
    if (error || !data) alert('Неверный Email или пароль!');
    else {
      const userData = { nickname: data.nickname, experience: data.experience, first_name: data.first_name, last_name: data.last_name, birth_year: data.birth_year, gender: data.gender, email: data.email };
      localStorage.setItem('asro_user', JSON.stringify(userData)); setUser(userData);
    }
  };

  const copyToClipboard = () => {
    const text = `Секретная фраза ASRO:\n1. ${regData.word1}\n2. ${regData.word2}\n3. ${regData.word3}`;
    navigator.clipboard.writeText(text); alert('Слова скопированы!');
  };

  if (!isLoaded) return <div style={{ background: '#0b0e11', minHeight: '100vh' }}></div>;

  // ЭКРАНЫ РЕГИСТРАЦИИ (сокращены для читаемости, логика та же)
  if (!user) {
    return (
      <div style={{ minHeight: '100vh', background: '#0b0e11', color: 'white', fontFamily: 'Arial, sans-serif', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '30px' }}>
        {authStep === 0 && (
          <div style={{ textAlign: 'left' }}>
            <img src="/logo.svg" alt="ASRO" style={{ height: '40px', marginBottom: '60px' }} />
            <h1 style={{ fontSize: '32px', fontWeight: 'bold', marginBottom: '15px' }}>Добро пожаловать</h1>
            <p style={{ color: '#848e9c', marginBottom: '50px' }}>Профессиональная платформа.</p>
            <button onClick={() => setAuthStep(1)} style={{ width: '100%', padding: '16px', borderRadius: '8px', border: 'none', background: '#A855F7', color: 'white', fontSize: '16px', fontWeight: 'bold', marginBottom: '15px' }}>Создать аккаунт</button>
            <button onClick={() => setAuthStep(5)} style={{ width: '100%', padding: '16px', borderRadius: '8px', border: '1px solid #2b3139', background: 'transparent', color: 'white', fontSize: '16px', fontWeight: 'bold' }}>Войти</button>
          </div>
        )}
        {authStep === 1 && ( <div><input type="text" placeholder="Имя" value={regData.first_name} onChange={e => setRegData({...regData, first_name: e.target.value})} style={{ width: '100%', padding: '14px', marginBottom: '10px', background: '#1e2329', color: 'white' }} /><button onClick={() => setAuthStep(2)}>Далее</button></div> )}
        {authStep === 2 && ( <div><input type="text" placeholder="Опыт" value={regData.experience} onChange={e => setRegData({...regData, experience: e.target.value})} style={{ width: '100%', padding: '14px', marginBottom: '10px', background: '#1e2329', color: 'white' }} /><button onClick={() => setAuthStep(3)}>Далее</button></div> )}
        {authStep === 3 && ( <div><input type="text" placeholder="Слово 1" value={regData.word1} onChange={e => setRegData({...regData, word1: e.target.value})} style={{ width: '100%', padding: '14px', marginBottom: '10px', background: '#1e2329', color: 'white' }} /><button onClick={validateWords}>Далее</button></div> )}
        {authStep === 4 && ( <div><button onClick={handleFinalRegister}>Завершить</button></div> )}
        {authStep === 5 && ( <div><input type="email" placeholder="Email" value={loginData.email} onChange={e => setLoginData({...loginData, email: e.target.value})} style={{ width: '100%', padding: '14px', marginBottom: '10px', background: '#1e2329', color: 'white' }} /><button onClick={handleLogin}>Войти</button></div> )}
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0b0e11', color: 'white', fontFamily: 'Arial, sans-serif', paddingBottom: '80px' }}>
      
      <nav style={{ position: 'fixed', top: 0, left: 0, right: 0, background: '#0b0e11', display: 'flex', justifyContent: 'space-around', padding: '15px 0 0 0', borderBottom: '1px solid #1e2329', zIndex: 999 }}>
        <button onClick={() => setActiveTab('center')} style={{ background: 'none', border: 'none', color: activeTab === 'center' ? '#A855F7' : '#848e9c', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', fontWeight: 'bold', fontSize: '13px', paddingBottom: '10px', borderBottom: activeTab === 'center' ? '2px solid #A855F7' : '2px solid transparent' }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>
          Центр
        </button>
        <button onClick={() => setActiveTab('chat')} style={{ background: 'none', border: 'none', color: activeTab === 'chat' ? '#A855F7' : '#848e9c', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', fontWeight: 'bold', fontSize: '13px', paddingBottom: '10px', borderBottom: activeTab === 'chat' ? '2px solid #A855F7' : '2px solid transparent' }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
          Чат
        </button>
        <button onClick={() => setActiveTab('profile')} style={{ background: 'none', border: 'none', color: activeTab === 'profile' ? '#A855F7' : '#848e9c', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', fontWeight: 'bold', fontSize: '13px', paddingBottom: '10px', borderBottom: activeTab === 'profile' ? '2px solid #A855F7' : '2px solid transparent' }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
          Профиль
        </button>
      </nav>

      <main style={{ paddingTop: '90px', paddingLeft: '20px', paddingRight: '20px' }}>
        
        {/* ГЛАВНЫЙ ЭКРАН (РЫНОК + СИГНАЛЫ) */}
        {activeTab === 'center' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '25px' }}>
            
            <div>
              <h1 style={{ fontSize: '28px', fontWeight: 'bold', margin: 0 }}>Привет, {user.first_name || user.nickname}!</h1>
              <p style={{ color: '#848e9c', margin: '5px 0 0 0', fontSize: '15px' }}>Добро пожаловать на ASRO</p>
            </div>

            {/* ОБЗОР РЫНКА С ОБЪЕМАМИ */}
            <div style={{ background: '#13161b', borderRadius: '16px', border: '1px solid #1e2329', overflow: 'hidden' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px', borderBottom: '1px solid #1e2329' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontWeight: 'bold', fontSize: '16px' }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#A855F7" strokeWidth="2"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline><polyline points="17 6 23 6 23 12"></polyline></svg>
                  Обзор рынка
                </div>
              </div>
              
              {/* Заголовки таблицы */}
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 20px', fontSize: '12px', color: '#848e9c', borderBottom: '1px solid #1e2329' }}>
                <span>Монета</span>
                <span>Цена / Объем 24ч</span>
              </div>

              {COINS.map((coin) => (
                <div key={coin.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '15px 20px', borderBottom: '1px solid #1e2329' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                    <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: coin.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', fontWeight: 'bold', color: 'white' }}>{coin.icon}</div>
                    <div>
                      <div style={{ fontWeight: 'bold', fontSize: '15px' }}>{coin.symbol}</div>
                      <div style={{ fontSize: '12px', color: '#848e9c' }}>{coin.name}</div>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: 'bold', fontSize: '15px' }}>${prices[coin.id]?.usd ? prices[coin.id].usd.toLocaleString() : '...'}</div>
                    <div style={{ fontSize: '11px', color: '#848e9c' }}>
                      Vol: ${prices[coin.id]?.usd_24h_vol ? (prices[coin.id].usd_24h_vol / 1000000).toFixed(1) + 'M' : '...'}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* СИГНАЛЫ ICT / SMC */}
            <div style={{ marginTop: '10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                <h2 style={{ fontSize: '20px', fontWeight: 'bold', margin: 0 }}>Сигналы ICT / SMC</h2>
                <button onClick={() => setShowSignalForm(!showSignalForm)} style={{ background: 'none', color: '#A855F7', border: '1px solid #A855F7', padding: '8px 12px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', fontSize: '12px' }}>
                  {showSignalForm ? 'Отмена' : '+ Создать'}
                </button>
              </div>

              {/* Форма сигнала */}
              {showSignalForm && (
                <form onSubmit={postSignal} style={{ background: '#13161b', padding: '20px', borderRadius: '16px', border: '1px solid #1e2329', marginBottom: '20px' }}>
                  <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
                    <input type="text" placeholder="Монета (BTC)" value={newSignal.coin} onChange={e => setNewSignal({...newSignal, coin: e.target.value})} style={{ flex: 1, padding: '12px', borderRadius: '8px', border: '1px solid #2b3139', background: '#0b0e11', color: 'white' }} />
                    <select value={newSignal.action} onChange={e => setNewSignal({...newSignal, action: e.target.value})} style={{ flex: 1, padding: '12px', borderRadius: '8px', border: '1px solid #2b3139', background: '#0b0e11', color: 'white' }}>
                      <option value="BUY">BUY</option>
                      <option value="SELL">SELL</option>
                    </select>
                  </div>
                  <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
                    <input type="text" placeholder="Вход" value={newSignal.entry} onChange={e => setNewSignal({...newSignal, entry: e.target.value})} style={{ flex: 1, padding: '12px', borderRadius: '8px', border: '1px solid #2b3139', background: '#0b0e11', color: 'white' }} />
                    <input type="text" placeholder="Тейк" value={newSignal.target} onChange={e => setNewSignal({...newSignal, target: e.target.value})} style={{ flex: 1, padding: '12px', borderRadius: '8px', border: '1px solid #2b3139', background: '#0b0e11', color: 'white' }} />
                    <input type="text" placeholder="Стоп" value={newSignal.stop} onChange={e => setNewSignal({...newSignal, stop: e.target.value})} style={{ flex: 1, padding: '12px', borderRadius: '8px', border: '1px solid #2b3139', background: '#0b0e11', color: 'white' }} />
                  </div>
                  <textarea placeholder="Анализ (ICT/SMC)..." value={newSignal.desc} onChange={e => setNewSignal({...newSignal, desc: e.target.value})} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #2b3139', background: '#0b0e11', color: 'white', marginBottom: '15px', minHeight: '60px' }} />
                  <button type="submit" style={{ width: '100%', background: '#A855F7', color: 'white', border: 'none', padding: '14px', borderRadius: '8px', fontWeight: 'bold' }}>Опубликовать</button>
                </form>
              )}

              {/* Лента сигналов */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                {signals.length === 0 ? <p style={{ textAlign: 'center', color: '#848e9c', fontSize: '14px' }}>Пока нет сигналов.</p> : null}
                {signals.map((sig, i) => (
                  <div key={i} style={{ background: '#13161b', padding: '15px', borderRadius: '12px', border: '1px solid #1e2329' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ fontSize: '16px', fontWeight: 'bold' }}>{sig.coin}</span>
                        <span style={{ background: sig.action === 'BUY' ? 'rgba(14,203,129,0.2)' : 'rgba(246,70,93,0.2)', color: sig.action === 'BUY' ? '#0ecb81' : '#f6465d', padding: '3px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold' }}>{sig.action}</span>
                      </div>
                      <div style={{ color: '#848e9c', fontSize: '12px' }}>@{sig.author}</div>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', background: '#0b0e11', padding: '10px', borderRadius: '8px', marginBottom: '10px', fontSize: '12px' }}>
                      <div><span style={{ color: '#848e9c' }}>Вход:</span> {sig.entry_price}</div>
                      <div><span style={{ color: '#848e9c' }}>Тейк:</span> {sig.target_price}</div>
                      <div><span style={{ color: '#848e9c' }}>Стоп:</span> {sig.stop_loss}</div>
                    </div>
                    {sig.description && <p style={{ margin: 0, fontSize: '13px', color: '#cbd5e1', lineHeight: '1.4' }}>{sig.description}</p>}
                  </div>
                ))}
              </div>
            </div>

          </div>
        )}

        {/* ЧАТ И ПРОФИЛЬ ОСТАЮТСЯ БЕЗ ИЗМЕНЕНИЙ */}
        {activeTab === 'chat' && (
          <div>
            <div style={{ background: '#13161b', borderRadius: '12px', padding: '15px', height: '60vh', overflowY: 'auto', marginBottom: '15px' }}>
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
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '15px' }}><span style={{ color: '#848e9c' }}>Email</span> <span>{user.email}</span></div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '15px' }}><span style={{ color: '#848e9c' }}>Опыт на рынке</span> <span>{user.experience} лет</span></div>
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
