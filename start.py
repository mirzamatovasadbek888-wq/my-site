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

if __name__ == "__main__":
    # Запускаем Flask в фоне
    threading.Thread(target=run_flask, daemon=True).start()
    
    # Запускаем твоего бота в главном потоке, чтобы видеть все ошибки
    print("=== ЗАПУСК БОТА ===", flush=True)
    os.system("python -u bot.py")
