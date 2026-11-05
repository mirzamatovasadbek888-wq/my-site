import json
import time
import urllib.parse
import urllib.request
import threading

TOKEN = open("token.txt").read().strip()
ALLOWED = {6633332033}  # Твой ID
API = f"https://api.telegram.org/bot{TOKEN}/"
SYMBOLS = {"gold": "PAXGUSDT", "btc": "BTCUSDT"}
HOSTS = ["https://api.binance.com", "https://data-api.binance.vision"]
TFS = ("15m", "30m", "1h")

# --- Создаем клавиатуру (без stat и scalping) ---
KEYBOARD = json.dumps({
    "keyboard": [
        ["/gold", "/btc"],
        ["/analiz_gold", "/analiz_btc"],
        ["/asro"]
    ],
    "resize_keyboard": True
})

def get(url):
    with urllib.request.urlopen(url, timeout=20) as r:
        return json.loads(r.read())

def tg(method, **p):
    data = urllib.parse.urlencode(p).encode()
    with urllib.request.urlopen(API + method, data, timeout=45) as r:
        return json.loads(r.read())

def candles(sym, tf):
    for h in HOSTS:
        try:
            d = get(f"{h}/api/v3/klines?symbol={sym}&interval={tf}&limit=100")
            return [(float(k[2]), float(k[3]), float(k[4])) for k in d[:-1]]
        except Exception:
            pass
    return None

def live(sym):
    for h in HOSTS:
        try:
            return float(get(f"{h}/api/v3/ticker/price?symbol={sym}")["price"])
        except Exception:
            pass
    return None

def ema(v, n):
    k = 2 / (n + 1)
    e = v[0]
    for x in v[1:]:
        e = x * k + e * (1 - k)
    return e

def rsi(c, n=14):
    g = l = 0
    for i in range(1, n + 1):
        d = c[i] - c[i - 1]
        g += max(d, 0)
        l += max(-d, 0)
    g /= n
    l /= n
    for i in range(n + 1, len(c)):
        d = c[i] - c[i - 1]
        g = (g * (n - 1) + max(d, 0)) / n
        l = (l * (n - 1) + max(-d, 0)) / n
    return 100 if l == 0 else 100 - 100 / (1 + g / l)

def atr(cs, n=14):
    tr = []
    for i in range(1, len(cs)):
        h, l, _ = cs[i]
        pc = cs[i - 1][2]
        tr.append(max(h - l, abs(h - pc), abs(l - pc)))
    return sum(tr[-n:]) / n

def swing_target(cs, lp, side):
    lv = []
    for i in range(2, len(cs) - 2):
        h, l = cs[i][0], cs[i][1]
        if side == 1 and h > lp and h >= max(x[0] for x in cs[i-2:i+3]):
            lv.append(h)
        if side == -1 and l < lp and l <= min(x[1] for x in cs[i-2:i+3]):
            lv.append(l)
    if not lv:
        return None
    return min(lv) if side == 1 else max(lv)

def analyze(name, tf):
    sym = SYMBOLS[name]
    cs = candles(sym, tf)
    if not cs:
        return f"{tf}: нет данных"
    c = [x[2] for x in cs]
    e9, e21 = ema(c, 9), ema(c, 21)
    r, a, p = rsi(c), atr(cs), c[-1]
    
    # Фильтры тренда и RSI
    if e9 > e21 and p > e21 and 50 < r < 70:
        side = 1
    elif e9 < e21 and p < e21 and 30 < r < 50:
        side = -1
    else:
        return f"{tf}: ⚪ ждать (RSI {r:.0f})"
        
    lp = live(sym) or p
    nm = "🟢 BUY" if side == 1 else "🔴 SELL"
    
    # Фильтр устаревшего сигнала
    if abs(lp - p) > 0.5 * a:
        return f"{tf}: {nm} устарел ⚠️\nсигнал {p:.2f}, сейчас {lp:.2f}"
        
    risk = 1.5 * a
    lvl = swing_target(cs, lp, side)
    room = abs(lvl - lp) if lvl else None
    
    # Фильтр Risk/Reward (1:2 или 1:3)
    if room is None or room >= 3 * risk:
        rr = 3
    elif room >= 2 * risk:
        rr = 2
    else:
        return f"{tf}: {nm} пропуск ⚠️\nдо уровня {lvl:.2f} мало места (меньше 1:2)"
        
    sl = lp - side * risk
    tp = lp + side * rr * risk
    return f"{tf}: {nm} {lp:.2f}\nSL {sl:.2f} | TP {tp:.2f} (1:{rr})\nRSI {r:.0f}"

last = {}

def kind(t):
    if "SL " in t:
        return 1 if "BUY" in t else -1
    if "ждать" in t:
        return 0
    return None

# Фоновая проверка и авто-отправка
def watch():
    first = True
    while True:
        try:
            for n in ("gold", "btc"):
                for tf in TFS:
                    t = analyze(n, tf)
                    k = kind(t)
                    if k is None:
                        continue
                    key = (n, tf)
                    if k == 0:
                        last[key] = 0
                    elif last.get(key) != k:
                        last[key] = k
                        if not first:
                            for uid in ALLOWED:
                                tg("sendMessage", chat_id=uid, text=f"🔔 {n.upper()}\n\n{t}")
        except Exception as e:
            print("Ошибка наблюдения:", e)
        first = False
        time.sleep(60)

def main():
    off = None
    threading.Thread(target=watch, daemon=True).start()
    print("Scalp bot запущен (авто-сигналы включены)")
    while True:
        try:
            p = {"timeout": 30}
            if off:
                p["offset"] = off
            for u in tg("getUpdates", **p)["result"]:
                off = u["update_id"] + 1
                m = u.get("message")
                if not m or m["from"]["id"] not in ALLOWED:
                    continue
                t = m.get("text", "").split("@")[0].lower()
                chat_id = m["chat"]["id"]
                
                if t == "/start":
                    tg("sendMessage", chat_id=chat_id, text="Бот запущен! Выбери актив:", reply_markup=KEYBOARD)
                elif t in ("/gold", "/btc"):
                    n = t[1:]
                    out = "\n\n".join(analyze(n, tf) for tf in TFS)
                    tg("sendMessage", chat_id=chat_id, text=f"📊 {n.upper()}\n\n{out}")
                elif t in ("/analiz_gold", "/analiz_btc"):
                    n = "gold" if "gold" in t else "btc"
                    out = "\n\n".join(analyze(n, tf) for tf in TFS)
                    tg("sendMessage", chat_id=chat_id, text=f"🧠 Анализ {n.upper()}\n\n{out}")
                elif t == "/asro":
                    out_g = "\n".join(analyze("gold", tf) for tf in TFS)
                    out_b = "\n".join(analyze("btc", tf) for tf in TFS)
                    tg("sendMessage", chat_id=chat_id, text=f"🌐 ASRO ОБЗОР\n\nЗОЛОТО:\n{out_g}\n\nBTC:\n{out_b}")
                else:
                    tg("sendMessage", chat_id=chat_id, text="Неизвестная команда. Используй кнопки меню.")
        except Exception as e:
            print("Ошибка сети:", e)
            time.sleep(5)

main()
