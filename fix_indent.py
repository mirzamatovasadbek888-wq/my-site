import re

with open('bot.py', 'r', encoding='utf-8') as f:
    code = f.read()

# Ищем кривой блок scalping и заменяем его на ровный (с 4 пробелами в начале)
pattern = r'(?m)^\s*elif cmd == "/scalping":\n\s*send\(chat, scalping_text\(\)\)'
replacement = '''    elif cmd == "/scalping":
        send(chat, scalping_text())'''

code = re.sub(pattern, replacement, code)

with open('bot.py', 'w', encoding='utf-8') as f:
    f.write(code)

print("Отступы исправлены!")
