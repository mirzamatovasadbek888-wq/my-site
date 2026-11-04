import re

with open('bot.py', 'r', encoding='utf-8') as f:
    code = f.read()

# 1. Заменяем старую заглушку на вызов новой функции
old_handler = '''elif cmd == "/scalping":
        send(chat, "⚡️ Скальпинг: ищу быстрые зоны на 5м и 15м...")
        send(chat, "Пока нет четких FVG зон. Ждем.")'''
new_handler = '''elif cmd == "/scalping":
        send(chat, real_scalping_analysis())'''

code = code.replace(old_handler, new_handler)

# 2. Добавляем функцию анализа в конец файла (если ее еще нет)
if 'def real_scalping_analysis():' not in code:
    func = '''
def get_fvg_data(symbol, interval, is_yahoo=False):
    import urllib.request, json
    try:
        if is_yahoo:
            url = f"https://query1.finance.yahoo.com/v8/finance/chart/{symbol}?interval={interval}&range=1d"
            req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
            res = urllib.request.urlopen(req, timeout=10)
            data = json.loads(res.read())
            result = data['chart']['result'][0]
            highs = result['indicators']['quote'][0]['high']
            lows = result['indicators']['quote'][0]['low']
            closes = result['indicators']['quote'][0]['close']
        else:
            url = f"https://api.binance.com/api/v3/klines?symbol={symbol}&interval={interval}&limit=30"
            res = urllib.request.urlopen(url, timeout=10)
            data = json.loads(res.read())
            highs = [float(c[2]) for c in data]
            lows = [float(c[3]) for c in data]
            closes = [float(c[4]) for c in data]

        signals = []
        for i in range(len(highs)-5, len(highs)-1):
            if highs[i-2] and lows[i] and highs[i-2] < lows[i]: 
                if highs[i-2] <= closes[-1] <= lows[i]:
                    signals.append(f"🟢 BUY {symbol} ({interval}): {highs[i-2]:.2f} - {lows[i]:.2f}")
            if lows[i-2] and highs[i] and lows[i-2] > highs[i]: 
                if highs[i] <= closes[-1] <= lows[i-2]:
                    signals.append(f"🔴 SELL {symbol} ({interval}): {highs[i]:.2f} - {lows[i-2]:.2f}")
        return signals
    except:
        return []

def real_scalping_analysis():
    results = []
    # BTC (Binance)
    for tf in ["5m", "15m"]:
        btc_sig = get_fvg_data("BTCUSDT", tf)
        if btc_sig: results.extend(btc_sig)
    # GOLD (Yahoo)
    for tf in ["5m", "15m"]:
        gold_sig = get_fvg_data("GC=F", tf, is_yahoo=True)
        if gold_sig: results.extend(gold_sig)
        
    if results:
        return "⚡️ **SCALPING (5м/15м)**\\n\\n" + "\\n".join(results) + "\\n\\n⚠️ Следи за риском!"
    else:
        return "⚡️ **SCALPING (5м/15м)**\\n\\nСейчас нет четких FVG зон по BTC и Золоту."

'''
    code += func

with open('bot.py', 'w', encoding='utf-8') as f:
    f.write(code)

print("Скальпинг для BTC и GOLD успешно внедрен!")
