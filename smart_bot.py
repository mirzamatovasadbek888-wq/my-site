import telebot
from telebot import types
import requests
import pandas as pd
import yfinance as yf
import time
import threading
from datetime import datetime
import os
from flask import Flask

app = Flask(__name__)

@app.route('/')
def health():
    return "Bot is running!"

def run_flask():
    port = int(os.environ.get("PORT", 8080))
    app.run(host="0.0.0.0", port=port)

TOKEN = '9028836326:AAH8-ItjOoxStP7ODO_1VizTCeLry60ldMY'
bot = telebot.TeleBot(TOKEN)

ASSETS = {
    'BTC': {'type': 'crypto', 'ticker': 'BTCUSDT'},
    'ETH': {'type': 'crypto', 'ticker': 'ETHUSDT'},
    'SOL': {'type': 'crypto', 'ticker': 'SOLUSDT'},
    'GOLD': {'type': 'forex', 'ticker': 'XAUUSD=X'},
    'EUR': {'type': 'forex', 'ticker': 'EURUSD=X'}
}

USERS_FILE = 'users.txt'
if not os.path.exists(USERS_FILE):
    open(USERS_FILE, 'w').close()

def save_user(chat_id):
    with open(USERS_FILE, 'r') as f:
        users = f.read().splitlines()
    if str(chat_id) not in users:
        with open(USERS_FILE, 'a') as f:
            f.write(f"{chat_id}\n")

def get_users():
    with open(USERS_FILE, 'r') as f:
        return f.read().splitlines()

def get_data(asset_key, interval, limit=100):
    asset = ASSETS[asset_key]
    if asset['type'] == 'crypto':
        url = f"https://api.binance.com/api/v3/klines?symbol={asset['ticker']}&interval={interval}&limit={limit}"
        try:
            res = requests.get(url, timeout=10).json()
            if isinstance(res, dict): return None
            df = pd.DataFrame(res, columns=['time', 'open', 'high', 'low', 'close', 'vol', 'ct', 'qav', 'trades', 'tb', 'tq', 'ignore'])
            for col in ['open', 'high', 'low', 'close', 'vol']: df[col] = df[col].astype(float)
            return df
        except: return None
    else:
        try:
            yf_int = {'1d': '1d', '1h': '1h', '30m': '30m', '15m': '15m'}[interval]
            period = '1y' if interval == '1d' else '1mo' 
            df = yf.download(asset['ticker'], interval=yf_int, period=period, progress=False)
            if df.empty: return None
            if isinstance(df.columns, pd.MultiIndex): df.columns = df.columns.get_level_values(0)
            df.rename(columns={'Open': 'open', 'High': 'high', 'Low': 'low', 'Close': 'close', 'Volume': 'vol'}, inplace=True)
            return df
        except: return None

def check_session():
    now = datetime.utcnow()
    if 7 <= now.hour < 21:
        return True
    return False

def analyze_asset(asset_key):
    if not check_session(): return None, "Вне торговой сессии"
    df_d = get_data(asset_key, '1d')
    if df_d is None or len(df_d) < 50: return None, "Нет данных (1D)"
    
    ema50 = df_d['close'].ewm(span=50, adjust=False).mean().iloc[-1]
    current_price = df_d['close'].iloc[-1]
    trend = "UP" if current_price > ema50 else "DOWN"

    for tf in ['1h', '30m', '15m']:
        df = get_data(asset_key, tf)
        if df is None or len(df) < 10: continue
        
        recent_low = df['low'].iloc[-5:-1].min()
        recent_high = df['high'].iloc[-5:-1].max()
        last_low, last_high = df['low'].iloc[-1], df['high'].iloc[-1]
        last_close = df['close'].iloc[-1]
        
        sweep_bull = (last_low < recent_low) and (last_close > recent_low)
        sweep_bear = (last_high > recent_high) and (last_close < recent_high)

        signals = []
        for i in range(len(df)-5, len(df)-1):
            if trend == "UP" and df['high'].iloc[i-2] < df['low'].iloc[i]:
                gap_low, gap_high = df['high'].iloc[i-2], df['low'].iloc[i]
                if gap_low <= last_close <= gap_high and sweep_bull:
                    signals.append(f"🟢 **BUY** ({tf})\nБычий FVG + Свип\nЗона: {gap_low:.4f} - {gap_high:.4f}")
            if trend == "DOWN" and df['low'].iloc[i-2] > df['high'].iloc[i]:
                gap_high, gap_low = df['low'].iloc[i-2], df['high'].iloc[i]
                if gap_low <= last_close <= gap_high and sweep_bear:
                    signals.append(f"🔴 **SELL** ({tf})\nМедвежий FVG + Свип\nЗона: {gap_low:.4f} - {gap_high:.4f}")
        if signals: return signals[0], None
    return None, f"Тренд ({trend}), сетапов нет"

def auto_scanner():
    while True:
        time.sleep(900)
        if not check_session(): continue
        for asset in ASSETS.keys():
            signal, msg = analyze_asset(asset)
            if signal:
                for user in get_users():
                    try: bot.send_message(user, f"🚨 **АВТО-СИГНАЛ: {asset}**\n\n{signal}\n\n⚠️ Не фин. совет.", parse_mode='Markdown')
                    except: pass

def get_main_keyboard():
    markup = types.ReplyKeyboardMarkup(resize_keyboard=True)
    markup.row(types.KeyboardButton('BTC'), types.KeyboardButton('ETH'), types.KeyboardButton('SOL'))
    markup.row(types.KeyboardButton('GOLD'), types.KeyboardButton('EUR'))
    markup.row(types.KeyboardButton('Включить авто-сигналы'))
    return markup

@bot.message_handler(commands=['start'])
def start(message):
    save_user(message.chat.id)
    bot.send_message(message.chat.id, "Привет! Я ASRO AI. Выбери актив или включи авто-сигналы:", reply_markup=get_main_keyboard())

@bot.message_handler(func=lambda message: True)
def handle_text(message):
    text = message.text.upper()
    if text == 'ВКЛЮЧИТЬ АВТО-СИГНАЛЫ':
        save_user(message.chat.id)
        return bot.send_message(message.chat.id, "✅ Вы подписаны на авто-сигналы!")
    if text in ASSETS.keys():
        bot.send_message(message.chat.id, f"Анализирую {text} (HTF + LTF)... ⏳")
        signal, msg = analyze_asset(text)
        if signal: bot.send_message(message.chat.id, f"📊 **Анализ {text}**\n\n{signal}\n\n⚠️ Не фин. совет.", parse_mode='Markdown')
        else: bot.send_message(message.chat.id, f"📊 {text}: {msg}")

if __name__ == "__main__":
    threading.Thread(target=auto_scanner, daemon=True).start()
    threading.Thread(target=run_flask, daemon=True).start()
    print("Умный бот ASRO AI запущен на Render...")
    bot.polling(non_stop=True)
