'use client';

import { useEffect, useState } from 'react';

const COINS = [
  { id: 'bitcoin', symbol: 'BTC', name: 'Bitcoin', color: '#F7931A' },
  { id: 'ethereum', symbol: 'ETH', name: 'Ethereum', color: '#627EEA' },
  { id: 'binancecoin', symbol: 'BNB', name: 'BNB', color: '#F3BA2F' },
  { id: 'solana', symbol: 'SOL', name: 'Solana', color: '#14F195' },
  { id: 'ripple', symbol: 'XRP', name: 'XRP', color: '#23292F' },
];

export default function Home() {
  const [prices, setPrices] = useState<any>({});

  useEffect(() => {
    const fetchPrices = async () => {
      try {
        const ids = COINS.map(c => c.id).join(',');
        const res = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd&include_24hr_change=true`);
        const data = await res.json();
        setPrices(data);
      } catch (e) {
        console.error('Ошибка загрузки цен', e);
      }
    };

    fetchPrices();
    const interval = setInterval(fetchPrices, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div style={{ minHeight: '100vh', background: '#0b0e11', color: 'white', fontFamily: 'Arial, sans-serif' }}>
      
      {/* ШАПКА С ЛОГОТИПОМ-БАБОЧКОЙ */}
      <header style={{ 
        padding: '15px 20px', 
        background: '#1e2329', 
        display: 'flex', 
        alignItems: 'center', 
        gap: '10px', 
        borderBottom: '1px solid #2b3139'
      }}>
        <img src="/logo.svg" alt="ASRO-T Logo" style={{ width: '32px', height: '32px' }} />
        <h1 style={{ margin: 0, fontSize: '22px', fontWeight: '800', letterSpacing: '1px', color: '#FCD535' }}>
          ASRO-T
        </h1>
      </header>

      {/* СПИСОК МОНЕТ */}
      <main style={{ padding: '10px 0' }}>
        <div style={{ padding: '0 20px', marginBottom: '10px', fontSize: '14px', color: '#848e9c' }}>
          Популярные рынки
        </div>

        {COINS.map((coin) => {
          const price = prices[coin.id]?.usd;
          const change = prices[coin.id]?.usd_24h_change;
          const isPositive = change >= 0;

          return (
            <div key={coin.id} style={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'space-between', 
              padding: '15px 20px',
              borderBottom: '1px solid #1e2329'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ 
                  width: '32px', height: '32px', borderRadius: '50%', 
                  background: coin.color, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '14px', fontWeight: 'bold', color: 'white'
                }}>
                  {coin.symbol}
                </div>
                <div>
                  <div style={{ fontSize: '16px', fontWeight: 'bold' }}>{coin.symbol}</div>
                  <div style={{ fontSize: '12px', color: '#848e9c' }}>{coin.name}</div>
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '16px', fontWeight: 'bold' }}>
                  ${price ? price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '...'}
                </div>
                <div style={{ fontSize: '14px', color: isPositive ? '#0ecb81' : '#f6465d' }}>
                  {isPositive ? '+' : ''}{change ? change.toFixed(2) : '0.00'}%
                </div>
              </div>
            </div>
          );
        })}
      </main>
    </div>
  );
}
