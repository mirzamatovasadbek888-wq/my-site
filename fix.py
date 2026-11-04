import re

with open('bot.py', 'r', encoding='utf-8') as f:
    code = f.read()

# 1. Меняем клавиатуру (убираем backtest, добавляем scalping)
new_kb = 'KEYBOARD = {"keyboard": [["/gold", "/btc"], ["/analiz_gold", "/analiz_btc"], ["/asro", "/scalping"], ["/stat"]], "resize_keyboard": True}'
code = re.sub(r'KEYBOARD\s*=\s*\{.*?True\}', new_kb, code, flags=re.DOTALL)

# 2. Добавляем обработчик команды (если его нет)
if 'cmd == "/scalping"' not in code:
    handler = 'elif cmd == "/scalping":\n        send(chat, scalping_text())\n    '
    code = code.replace('elif cmd == "/stat":', handler + 'elif cmd == "/stat":')

# 3. Добавляем саму функцию, если её нет
if 'def scalping_text' not in code:
    func = '''
def scalping_text():
    return "⚡️ Анализ скальпинга (5м и 15м) в разработке..."
'''
    code = code.replace('def main():', func + '\ndef main():')

with open('bot.py', 'w', encoding='utf-8') as f:
    f.write(code)

print("Код успешно обновлен!")
