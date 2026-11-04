import re

with open('bot.py', 'r', encoding='utf-8') as f:
    lines = f.readlines()

# 1. Удаляем все старые кривые вставки про scalping
cleaned_lines = [l for l in lines if 'cmd == "/scalping"' not in l and 'scalping_text()' not in l]

# 2. Обновляем клавиатуру
code = "".join(cleaned_lines)
new_kb = 'KEYBOARD = {"keyboard": [["/gold", "/btc"], ["/analiz_gold", "/analiz_btc"], ["/asro", "/scalping"], ["/stat"]], "resize_keyboard": True}'
code = re.sub(r'KEYBOARD\s*=\s*\{.*?True\}', new_kb, code, flags=re.DOTALL)

# 3. Вставляем команду с ИДЕАЛЬНЫМИ отступами
final_lines = []
for line in code.split('\n'):
    # Ищем безопасное место для вставки (перед /stat)
    if 'elif cmd == "/stat":' in line:
        indent = line[:len(line) - len(line.lstrip())]
        final_lines.append(f'{indent}elif cmd == "/scalping":')
        final_lines.append(f'{indent}    send(chat, "Скальпинг в разработке!")')
    final_lines.append(line)

# 4. Сохраняем
with open('bot.py', 'w', encoding='utf-8') as f:
    f.write('\n'.join(final_lines))

print("=== КОД ПОЛНОСТЬЮ ИСПРАВЛЕН! ===")
