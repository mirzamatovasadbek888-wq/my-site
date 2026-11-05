import json
import time
import urllib.parse
import urllib.request
from datetime import datetime, timezone

TOKEN = open("token.txt").read().strip()
API = f"https://api.telegram.org/bot{TOKEN}/"
SYM = {"gold": "ЗОЛОТО", "btc": "BTC"}
TFS = ["1h", "15m"]
HTF = {"1h": "1d", "15m": "1h"}
LIVE = {"1h": ("1mo", 500), "15m": ("5d", 500), "1d": ("1y", 365)}
BT = {"1h": ("3mo", 1000), "15m": ("30d", 1000)}
HOR = {"1h": (24 * 3600, 72 * 3600), "15m": (8 * 3600, 24 * 3600)}
SESSION = (7, 20)
JOURNAL = "signals.json"
NEWS_URL = "https://nfs.faireconomy.media/ff_calendar_thisweek.json"
SCAN_EVERY = 900

KEYBOARD = {"keyboard": [["/gold", "/btc"],
                         ["/analiz_gold", "/analiz_btc"],
                         ["/asro"],
                         ["/stat", "/backtest"]],
            "resize_keyboard": True}

MENU = [
    ("gold", "Цена золота"),
    ("btc", "Цена BTC"),
    ("analiz_gold", "Анализ золота ICT/SMC"),
    ("analiz_btc", "Анализ BTC ICT/SMC"),
    ("asro", "Вход, TP, SL (1h и 15m)"),
    ("stat", "Статистика журнала сигналов"),
    ("backtest", "Тест правил на истории"),
]

START_TEXT = (
    "Привет! Команды:\n"
    "/gold - цена золота\n"
    "/btc - цена BTC\n"
    "/analiz_gold - анализ золота ICT/SMC\n"
    "/analiz_btc - анализ BTC ICT/SMC\n"
    "/asro - вход, TP и SL (1h и 15m)\n"
    "/stat - статистика сигналов\n"
    "/backtest - тест правил на истории\n\n"
    "Это автоматическая разметка по правилам, не финансовый совет "
    "и не гарантия результата."
)


def get_json(url, data=None, timeout=60):
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    if data is not None:
        req.data = urllib.parse.urlencode(data).encode()
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return json.loads(r.read().decode())


def send(chat_id, text, keyboard=False):
    data = {"chat_id": chat_id, "text": text}
    if keyboard:
        data["reply_markup"] = json.dumps(KEYBOARD)
    get_json(API + "sendMessage", data)


def yahoo(sym, interval, rng):
    url = ("https://query1.finance.yahoo.com/v8/finance/chart/"
           f"{sym}?range={rng}&interval={interval}")
    r = get_json(url)["chart"]["result"][0]
    q = r["indicators"]["quote"][0]
    rows = [x for x in zip(r["timestamp"], q["open"], q["high"],
                           q["low"], q["close"]) if None not in x]
    t, o, h, l, c = map(list, zip(*rows))
    return dict(t=t, o=o, h=h, l=l, c=c)


def binance(interval, limit):
    k = get_json("https://api.binance.com/api/v3/klines?symbol=BTCUSDT"
                 f"&interval={interval}&limit={limit}")
    return dict(t=[x[0] // 1000 for x in k], o=[float(x[1]) for x in k],
                h=[float(x[2]) for x in k], l=[float(x[3]) for x in k],
                c=[float(x[4]) for x in k])


def fetch(key, interval, mode="live"):
    rng, limit = (BT if mode == "bt" else LIVE)[interval]
    if key == "btc":
        try:
            d = binance(interval, limit)
            d["src"] = "Binance"
            return d
        except Exception:
            d = yahoo("BTC-USD", interval, rng)
            d["src"] = "Yahoo"
            return d
    try:
        d = yahoo("XAUUSD=X", interval, rng)
        if len(d["c"]) >= 60:
            d["src"] = "XAUUSD"
            return d
    except Exception:
        pass
    d = yahoo("GC=F", interval, rng)
    d["src"] = "GC=F"
    return d


def swings(h, l, n=3):
    sh, sl = [], []
    for i in range(n, len(h) - n):
        if h[i] > max(h[i - n:i]) and h[i] >= max(h[i + 1:i + n + 1]):
            sh.append((i, h[i]))
        if l[i] < min(l[i - n:i]) and l[i] <= min(l[i + 1:i + n + 1]):
            sl.append((i, l[i]))
    return sh, sl


def trend_of(h, l, n=3):
    sh, sl = swings(h, l, n)
    if len(sh) < 2 or len(sl) < 2:
        return 0
    hh = sh[-1][1] > sh[-2][1]
    hl = sl[-1][1] > sl[-2][1]
    return 1 if (hh and hl) else (-1 if (not hh and not hl) else 0)


def equal_level(points, tol):
    prices = [p for _, p in points[-6:]]
    found = None
    for a in range(len(prices)):
        for b in range(a + 1, len(prices)):
            if abs(prices[a] - prices[b]) <= tol:
                found = (prices[a] + prices[b]) / 2
    return found


def analyze_data(o, h, l, c, live):
    n = len(c)
    if n < 60:
        raise ValueError("мало данных")
    price = live
    sh, sl = swings(h, l)
    if len(sh) < 2 or len(sl) < 2:
        raise ValueError("мало свингов")
    hh = sh[-1][1] > sh[-2][1]
    hl = sl[-1][1] > sl[-2][1]
    tr = 1 if (hh and hl) else (-1 if (not hh and not hl) else 0)
    last_h, last_l = sh[-1][1], sl[-1][1]

    if price > last_h:
        event = "BOS вверх" if tr == 1 else ("CHoCH вверх" if tr == -1 else "пробой вверх")
    elif price < last_l:
        event = "BOS вниз" if tr == -1 else ("CHoCH вниз" if tr == 1 else "пробой вниз")
    else:
        event = "цена внутри диапазона свингов"

    tol = price * 0.0003
    eqh, eql = equal_level(sh, tol), equal_level(sl, tol)

    sweeps = []
    for i in range(max(n - 10, 0), n):
        for j, p in sh[-5:]:
            if j < i and h[i] > p and c[i] < p:
                sweeps.append(f"снята ликвидность над {p:,.1f}")
        for j, p in sl[-5:]:
            if j < i and l[i] < p and c[i] > p:
                sweeps.append(f"снята ликвидность под {p:,.1f}")
    sweeps = list(dict.fromkeys(sweeps))[-2:]

    top, bot = max(h[-60:]), min(l[-60:])
    mid = (top + bot) / 2

    body = [abs(c[i] - o[i]) for i in range(n)]
    trs = [max(h[i] - l[i], abs(h[i] - c[i - 1]), abs(l[i] - c[i - 1]))
           for i in range(n - 14, n)]
    atr = sum(trs) / 14

    zones = []
    for i in range(max(22, n - 80), n):
        m = i - 1
        avg = sum(body[m - 20:m]) / 20
        if body[m] < avg:
            continue
        if l[i] > h[i - 2] and l[i] - h[i - 2] >= 0.1 * atr:
            lo, hi = h[i - 2], l[i]
            if min(l[i + 1:] or [1e12]) > lo:
                zones.append(("bull", lo, hi))
        if h[i] < l[i - 2] and l[i - 2] - h[i] >= 0.1 * atr:
            lo, hi = h[i], l[i - 2]
            if max(h[i + 1:] or [-1e12]) < hi:
                zones.append(("bear", lo, hi))

    for i in range(max(21, n - 100), n):
        avg = sum(body[i - 20:i]) / 20
        if body[i] > 1.5 * avg and body[i] > 0:
            up = c[i] > o[i]
            for k in range(1, 6):
                j = i - k
                if j < 0:
                    break
                if (up and c[j] < o[j]) or ((not up) and c[j] > o[j]):
                    lo, hi = l[j], h[j]
                    if up:
                        mit = any(x < lo for x in c[i + 1:])
                    else:
                        mit = any(x > hi for x in c[i + 1:])
                    if not mit:
                        zones.append(("bull" if up else "bear", lo, hi))
                    break

    bull = [z for z in zones if z[0] == "bull" and z[1] < price]
    bear = [z for z in zones if z[0] == "bear" and z[2] > price]

    return dict(price=price, tr=tr, last_h=last_h, last_l=last_l,
                event=event, eqh=eqh, eql=eql, sweeps=sweeps, top=top,
                bot=bot, mid=mid, bull=bull, bear=bear, atr=atr,
                last_range=h[-1] - l[-1])


def live(key, tf):
    cd = fetch(key, tf)
    d = analyze_data(cd["o"][:-1], cd["h"][:-1], cd["l"][:-1],
                     cd["c"][:-1], cd["c"][-1])
    hd = fetch(key, HTF[tf])
    d["htf"] = trend_of(hd["h"][:-1], hd["l"][:-1])
    d["src"] = cd["src"]
    return d


def near(zs, price):
    return sorted(zs, key=lambda z: abs(price - (z[1] + z[2]) / 2))[:2]


def zone_lines(zs):
    return "\n".join(f"  {a:,.1f} - {b:,.1f}" for _, a, b in zs) or "  нет"


def setup_core(d):
    p, a = d["price"], d["atr"]
    if d["last_range"] > 3 * a:
        return None
    if d["tr"] == 1 and p <= d["mid"] and d["bull"]:
        z = near(d["bull"], p)[0]
        entry = min(z[2], p)
        sl = z[1] - 0.2 * a
        tp = d["last_h"] if d["last_h"] > entry else d["top"]
        side = "BUY"
        risk, reward = entry - sl, tp - entry
    elif d["tr"] == -1 and p >= d["mid"] and d["bear"]:
        z = near(d["bear"], p)[0]
        entry = max(z[1], p)
        sl = z[2] + 0.2 * a
        tp = d["last_l"] if d["last_l"] < entry else d["bot"]
        side = "SELL"
        risk, reward = sl - entry, entry - tp
    else:
        return None
    if risk <= 0 or reward <= 0 or reward / risk < 1.5:
        return None
    if abs(p - entry) > 3 * a:
        return None
    kind = "по рынку" if abs(p - entry) <= 0.1 * a else "лимит"
    return side, kind, entry, tp, sl


def in_session(ts):
    dt = datetime.fromtimestamp(ts, timezone.utc)
    return dt.weekday() < 5 and SESSION[0] <= dt.hour < SESSION[1]


NEWS = {"t": 0, "items": [], "ok": False}


def news_near(ts):
    now = time.time()
    if now - NEWS["t"] > 3600:
        NEWS["t"] = now
        try:
            items = []
            for e in get_json(NEWS_URL, timeout=20):
                if e.get("country") == "USD" and e.get("impact") == "High":
                    dt = datetime.fromisoformat(e["date"])
                    if dt.tzinfo is None:
                        raise ValueError("нет часового пояса")
                    items.append((dt.timestamp(), e.get("title", "")))
            NEWS["items"], NEWS["ok"] = items, True
        except Exception:
            NEWS["ok"] = False
            NEWS["items"] = []
            NEWS["t"] = now - 3000
    for t, title in NEWS["items"]:
        if t - 1800 <= ts <= t + 3600:
            return t, title
    return None


def why_no_setup(d):
    try:
        p, a = d["price"], d["atr"]
        if d["last_range"] > 3 * a:
            return "последняя свеча слишком большая"
        if d["tr"] not in (1, -1):
            return "тренд не выражен"
        if d["tr"] == 1:
            if p > d["mid"]:
                return "тренд вверх, но нет отката"
            if not d["bull"]:
                return "тренд вверх, но нет зоны спроса"
            z = near(d["bull"], p)[0]
            entry = min(z[2], p)
            sl = z[1] - 0.2 * a
            tp = d["last_h"] if d["last_h"] > entry else d["top"]
            risk, reward = entry - sl, tp - entry
        else:
            if p < d["mid"]:
                return "тренд вниз, но нет отката"
            if not d["bear"]:
                return "тренд вниз, но нет зоны предложения"
            z = near(d["bear"], p)[0]
            entry = max(z[1], p)
            sl = z[2] + 0.2 * a
            tp = d["last_l"] if d["last_l"] < entry else d["bot"]
            risk, reward = sl - entry, entry - tp
        if risk <= 0 or reward <= 0:
            return "цель слишком близко"
        if reward / risk < 1.5:
            return f"прибыль/риск {reward / risk:.1f}, нужно от 1.5"
        if abs(p - entry) > 3 * a:
            return "вход далеко от цены"
    except Exception:
        pass
    return "нет сетапа"

def decide(d, ts):
    s = setup_core(d)
    if s is None:
        return None, why_no_setup(d)
    if not in_session(ts):
        return None, "вне сессий"
    htf = d["htf"]
    if (s[0] == "BUY" and htf == -1) or (s[0] == "SELL" and htf == 1):
        return None, "против старшего ТФ"
    if news_near(ts):
        return None, "новости"
    return s, ""


def evaluate(sig, bars):
    side, entry, tp, sl = sig["side"], sig["entry"], sig["tp"], sig["sl"]
    win, life = HOR[sig["tf"]]
    t0 = sig["t"]
    rr = abs(tp - entry) / abs(entry - sl)
    entered = sig["kind"] == "по рынку"
    t_in = t0 if entered else None
    for t, hi, lo in bars:
        if not entered:
            if t - t0 > win:
                return "expired", 0.0
            if (side == "BUY" and lo <= entry) or (side == "SELL" and hi >= entry):
                entered, t_in = True, t
            else:
                continue
        if t - t_in > life:
            return "timeout", 0.0
        if side == "BUY":
            if lo <= sl:
                return "sl", -1.0
            if hi >= tp:
                return "tp", rr
        else:
            if hi >= sl:
                return "sl", -1.0
            if lo <= tp:
                return "tp", rr
    return ("open" if entered else "pending"), 0.0


def load_j():
    try:
        with open(JOURNAL) as f:
            return json.load(f)
    except Exception:
        return []


def save_j(j):
    with open(JOURNAL, "w") as f:
        json.dump(j, f)


def log_signal(key, tf, s, ts):
    j = load_j()
    for x in j:
        if (x["key"] == key and x["tf"] == tf and x["side"] == s[0]
                and x["status"] in ("pending", "open")):
            return
    j.append(dict(key=key, tf=tf, side=s[0], kind=s[1], entry=s[2],
                  tp=s[3], sl=s[4], t=int(ts), status="pending", r=0.0))
    save_j(j)


def update_journal():
    j = load_j()
    cache = {}
    for x in j:
        if x["status"] not in ("pending", "open"):
            continue
        k = (x["key"], x["tf"])
        try:
            if k not in cache:
                cache[k] = fetch(*k)
            cd = cache[k]
            bars = [b for b in zip(cd["t"], cd["h"], cd["l"]) if b[0] >= x["t"]]
            x["status"], x["r"] = evaluate(x, bars)
        except Exception:
            pass
    save_j(j)
    return j


def summ(rows):
    done = [(s, r) for s, r in rows if s in ("tp", "sl")]
    if not done:
        return "нет закрытых сделок"
    w = sum(1 for s, _ in done if s == "tp")
    tot = sum(r for _, r in done)
    return f"{len(done)} сд., {w / len(done) * 100:.0f}% прибыльных, итог {tot:+.1f}R"


def scan():
    for key in SYM:
        for tf in TFS:
            try:
                d = live(key, tf)
                s, why = decide(d, time.time())
                if s:
                    log_signal(key, tf, s, time.time())
            except Exception as e:
                print("scan:", e)
    update_journal()


def price_text(key):
    cd = fetch(key, "1d")
    p, prev = cd["c"][-1], cd["c"][-2]
    return f"{SYM[key]}: ${p:,.2f} ({(p - prev) / prev * 100:+.2f}% за день)"


def smc_text(key):
    d = live(key, "1h")
    p = d["price"]
    names = {1: "бычий", -1: "медвежий", 0: "нейтральный"}
    trend = {1: "бычья (HH + HL)", -1: "медвежья (LH + LL)", 0: "переходная / диапазон"}[d["tr"]]
    zone = "ПРЕМИУМ (выше 50%)" if p > d["mid"] else "ДИСКАУНТ (ниже 50%)"
    ev = news_near(time.time())
    if ev:
        news = f"скоро важное событие США: {ev[1]}"
    elif NEWS["ok"]:
        news = "важных событий США рядом нет"
    else:
        news = "календарь недоступен"
    lines = [
        f"SMC: {SYM[key]}, 1h ({d['src']})",
        f"Цена: {p:,.1f}", "",
        f"Структура: {trend}",
        f"Старший ТФ (1d): {names[d['htf']]}",
        f"Событие: {d['event']}",
        f"Свинг-хай: {d['last_h']:,.1f}",
        f"Свинг-лоу: {d['last_l']:,.1f}", "",
        f"Зона: {zone}",
        f"Диапазон: {d['bot']:,.1f} - {d['top']:,.1f}, 50% = {d['mid']:,.1f}", "",
        "Ликвидность:",
        f"  Выше (buy-side): {(d['eqh'] or d['last_h']):,.1f}"
        + (" (равные хаи)" if d["eqh"] else ""),
        f"  Ниже (sell-side): {(d['eql'] or d['last_l']):,.1f}"
        + (" (равные лои)" if d["eql"] else ""),
    ]
    for s in d["sweeps"]:
        lines.append(f"  {s}")
    lines += ["", "Бычьи FVG / OB ниже цены:", zone_lines(near(d["bull"], p)),
              "Медвежьи FVG / OB выше цены:", zone_lines(near(d["bear"], p)), "",
              "Сессия (Лондон/Нью-Йорк): " + ("активна" if in_session(time.time()) else "нет"),
              "Новости: " + news, "",
              "Автоматическая разметка, не финансовый совет."]
    return "\n".join(lines)


def asro_text():
    blocks = []
    for key, name in SYM.items():
        lines = []
        price = None
        for tf in TFS:
            try:
                d = live(key, tf)
                price = d["price"]
                s, why = decide(d, time.time())
                if s is None:
                    lines.append(f"{tf}: Ожидайте, рынок не стабилен ({why})")
                else:
                    log_signal(key, tf, s, time.time())
                    side, kind, entry, tp, sl = s
                    lines.append(f"{tf}: {side} ({kind})\n"
                                 f"Вход: {entry:,.1f}\n"
                                 f"TP: {tp:,.1f}\n"
                                 f"SL: {sl:,.1f}")
            except Exception:
                lines.append(f"{tf}: данные недоступны")
        head = f"{name}: {price:,.1f}" if price else name
        blocks.append(head + "\n" + "\n".join(lines))
    return "\n\n".join(blocks)


def stat_text():
    j = update_journal()
    if not j:
        return ("Журнал пуст. Пока бот запущен, он сам ищет сетапы "
                "каждые 15 минут и записывает их.")
    lines = ["Журнал сигналов:", ""]
    for key, name in SYM.items():
        for tf in TFS:
            xs = [x for x in j if x["key"] == key and x["tf"] == tf]
            if not xs:
                continue
            wait = sum(1 for x in xs if x["status"] in ("pending", "open"))
            other = sum(1 for x in xs if x["status"] in ("expired", "timeout"))
            lines.append(f"{name} {tf}: " + summ([(x["status"], x["r"]) for x in xs]))
            lines.append(f"  ждут/открыты: {wait}, без результата: {other}")
    done = sum(1 for x in j if x["status"] in ("tp", "sl"))
    if done < 30:
        lines += ["", f"Закрытых сделок всего {done}: мало, статистике пока верить рано (нужно хотя бы 30)."]
    return "\n".join(lines)


def backtest_series(key, tf):
    cd = fetch(key, tf, "bt")
    t, o, h, l, c = cd["t"], cd["o"], cd["h"], cd["l"], cd["c"]
    n = len(c)
    res = []
    i = 120
    while i < n - 2:
        lo_i = max(0, i - 299)
        try:
            d = analyze_data(o[lo_i:i + 1], h[lo_i:i + 1], l[lo_i:i + 1],
                             c[lo_i:i + 1], c[i])
            s = setup_core(d)
        except Exception:
            s = None
        if s:
            sig = dict(side=s[0], kind=s[1], entry=s[2], tp=s[3], sl=s[4],
                       t=t[i], tf=tf)
            st, r = evaluate(sig, list(zip(t[i + 1:], h[i + 1:], l[i + 1:])))
            htf = trend_of(h[lo_i:i + 1], l[lo_i:i + 1], 12)
            ok = not ((s[0] == "BUY" and htf == -1) or (s[0] == "SELL" and htf == 1))
            res.append((in_session(t[i]), ok, st, r))
            i += 6
        else:
            i += 2
    return res, cd["src"], n


def backtest_text():
    lines = ["Тест правил на истории", ""]
    for key, name in SYM.items():
        for tf in TFS:
            try:
                res, src, n = backtest_series(key, tf)
            except Exception:
                lines.append(f"{name} {tf}: данные недоступны")
                continue
            allr = [(st, r) for _, _, st, r in res]
            fil = [(st, r) for a, b, st, r in res if a and b]
            lines.append(f"{name} {tf} ({src}, {n} свечей)")
            lines.append("  все сетапы: " + summ(allr))
            lines.append("  с фильтрами: " + summ(fil))
    lines += ["", "Фильтр: сессии + тренд старшего уровня (приближённо). "
              "Новости в тесте не учтены. Если TP и SL в одной свече, считается SL. "
              "R = прибыль в долях риска. Это прошлое, оно не гарантирует будущее."]
    return "\n".join(lines)



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
                    msg = f"🔔 АВТО-СИГНАЛ {name} (15m)\n{signal}\nRSI: {r:.0f}"
                    url = f"https://api.telegram.org/bot{TOKEN}/sendMessage"
                    req = urllib.request.Request(url, data=urllib.parse.urlencode({"chat_id": 6633332033, "text": msg}).encode())
                    urllib.request.urlopen(req)
        except Exception:
            pass

# Запускаем фоновые авто-сигналы
threading.Thread(target=new_auto_signals, daemon=True).start()

def main():
    try:
        get_json(API + "setMyCommands", {"commands": json.dumps(
            [{"command": c, "description": d} for c, d in MENU])})
    except Exception as e:
        print("Меню команд не обновлено:", e)
    offset = 0
    last_scan = 0
    print("Бот запущен. Откройте его в Telegram и нажмите /start")
    while True:
        if time.time() - last_scan > SCAN_EVERY:
            last_scan = time.time()
            try:
                scan()
            except Exception as e:
                print("scan error:", e)
        try:
            upd = get_json(API + "getUpdates",
                           {"offset": offset, "timeout": 30}, timeout=45)
        except Exception as e:
            print("Ошибка сети:", e)
            time.sleep(5)
            continue
        for u in upd.get("result", []):
            offset = u["update_id"] + 1
            msg = u.get("message")
            if not msg or "text" not in msg:
                continue
            chat = msg["chat"]["id"]
            cmd = msg["text"].split()[0].split("@")[0].lower().replace(".", "_")
            try:
                if cmd in ("/start", "/help"):
                    send(chat, START_TEXT, keyboard=True)
                elif cmd == "/gold":
                    send(chat, price_text("gold"))
                elif cmd == "/btc":
                    send(chat, price_text("btc"))
                elif cmd == "/analiz_gold":
                    send(chat, smc_text("gold"))
                elif cmd == "/analiz_btc":
                    send(chat, smc_text("btc"))
                elif cmd == "/asro":
                    send(chat, asro_text())
                elif cmd == "/stat":
                    send(chat, stat_text())
                elif cmd == "/backtest":
                    send(chat, "Считаю историю, это займёт 1-2 минуты...")
                    send(chat, backtest_text())
            except Exception as e:
                try:
                    send(chat, f"Ошибка: {e}")
                except Exception:
                    pass


main()

# --- КОД ДЛЯ RENDER ---
import os
from flask import Flask
import threading

app = Flask(__name__)

@app.route('/')
def health():
    return "Bot is running!"

def run_flask():
    port = int(os.environ.get("PORT", 8080))
    app.run(host="0.0.0.0", port=port)

threading.Thread(target=run_flask, daemon=True).start()
