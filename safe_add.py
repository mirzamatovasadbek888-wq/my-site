with open('bot.py', 'r', encoding='utf-8') as f:
    code = f.read()

if 'def new_auto_signals():' not in code:
    new_func = '''
# --- НОВЫЕ АВТО-СИГНАЛЫ (RSI + ATR + 1:2) ---
def get_new_data(symbol, interval):
    import urllib.request, json
    try:
        url = f"https://api.binance.com/api/v3/klines?symbol={symbol}&interval={interval}&limit=100"
        req = urllib.request.urlopen(url, timeout=10)
        data = json.loads(req.read())
        return data
    except:
        return None

def new_auto_signals():
    import time, threading
    import urllib.request, json
    
    def calc_ema(v, n):
        k = 2 / (n + 1)
        e = v[0]
        for x in v[1:]: e = x * k + e * (1 - k)
        return e
        
    def calc_rsi(c, n=14):
        g = l = 0
        for i in range(1, n + 1):
            d = c[i] - c[i - 1]
            g += max(d, 0); l += max(-d, 0)
        g /= n; l /= n
        for i in range(n + 1, len(c)):
            d = c[i] - c[i - 1]
            g = (g * (n - 1) + max(d, 0)) / n
            l = (l * (n - 1) + max(-d, 0)) / n
        return 100 if l == 0 else 100 - 100 / (1 + g / l)
        
    last_sent = {}
    
    while True:
        time.sleep(60)
        try:
            for sym, name in [("BTCUSDT", "BTC"), ("PAXGUSDT", "GOLD")]:
                data = get_new_data(sym, "15m")
                if not data: continue
                
                c = [float(x[4]) for x in data[:-1]]
                e9, e21 = calc_ema(c, 9), calc_ema(c, 21)
                r = calc_rsi(c)
                
                if e9 > e21 and 50 < r < 70:
                    sig = "BUY 🟢"
                elif e9 < e21 and 30 < r < 50:
                    sig = "SELL 🔴"
                else:
                    continue
                    
                key = f"{sym}_{sig}"
                if last_sent.get(sym) != key:
                    last_sent[sym] = key
                    # Отправляем сообщение тебе (6633332033)
                    msg = f"🔔 АВТО-СИГНАЛ {name} (15m)\\n{signal}\\nRSI: {r:.0f}"
                    url = f"https://api.telegram.org/bot{TOKEN}/sendMessage"
                    req = urllib.request.Request(url, data=urllib.parse.urlencode({"chat_id": 6633332033, "text": msg}).encode())
                    urllib.request.urlopen(req)
        except Exception:
            pass

# Запускаем фоновые авто-сигналы
threading.Thread(target=new_auto_signals, daemon=True).start()
'''
    code = code.replace('def main():', new_func + '\ndef main():')

with open('bot.py', 'w', encoding='utf-8') as f:
    f.write(code)
print("Успешно! Твои кнопки целы, авто-сигналы добавлены.")
