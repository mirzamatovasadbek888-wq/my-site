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
    threading.Thread(target=run_flask, daemon=True).start()
    print("=== ЗАПУСК БОТА ===", flush=True)
    
    process = subprocess.Popen(
        [sys.executable, "-u", "bot.py"],
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True
    )
    
    for line in process.stdout:
        print(line, end="", flush=True)
