import os
from flask import Flask
import threading
import subprocess
import sys

app = Flask(__name__)

@app.route('/')
def health():
    return "Bot is running!"

def run_flask():
    port = int(os.environ.get("PORT", 8080))
    app.run(host="0.0.0.0", port=port)

if __name__ == "__main__":
    # 1. Запускаем веб-сервер для Render
    threading.Thread(target=run_flask, daemon=True).start()
    # 2. Запускаем твоего бота из bot.py
    subprocess.run([sys.executable, "bot.py"])
