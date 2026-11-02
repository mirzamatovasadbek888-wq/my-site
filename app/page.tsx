'use client';

import { useEffect, useState } from 'react';

const COINS = [
  { id: 'bitcoin', symbol: 'BTC' },
  { id: 'ethereum', symbol: 'ETH' },
  { id: 'solana', symbol: 'SOL' },
  { id: 'binancecoin', symbol: 'BNB' },
  { id: 'ripple', symbol: 'XRP' },
  { id: 'cardano', symbol: 'ADA' },
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
    <div style={{ padding: '20px', fontFamily: 'sans-serif', background: '#0f172a', minHeight: '100vh', color: 'white' }}>
      <h1 style={{ textAlign: 'center', marginBottom: '30px' }}>📊 Рынок</h1>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
        {COINS.map((coin) => {
          const price = prices[coin.id]?.usd;
          const change = prices[coin.id]?.usd_24h_change;
          return (
            <div key={coin.id} style={{ background: '#1e293b', padding: '15px', borderRadius: '12px', textAlign: 'center' }}>
              <h2 style={{ margin: 0, fontSize: '18px' }}>{coin.symbol}</h2>
              <p style={{ fontSize: '22px', fontWeight: 'bold', margin: '10px 0' }}>
                ${price ? price.toLocaleString() : '...'}
              </p>
              {change && (
                <p style={{ color: change >= 0 ? '#4ade80' : '#f87171', margin: 0 }}>
                  {change >= 0 ? '▲' : '▼'} {Math.abs(change).toFixed(2)}%
                </p>
              )}
            </div>
          );
        })}
      </div>
      <p style={{ textAlign: 'center', marginTop: '40px', color: '#94a3b8', fontSize: '14px' }}>
        Данные обновляются каждые 30 секунд
      </p>
    </div>
  );
}
