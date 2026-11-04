with open('bot.py', 'r', encoding='utf-8') as f:
    lines = f.readlines()

new_lines = []
for line in lines:
    # Ищем, где обрабатывается команда /stat
    if 'elif cmd == "/stat":' in line:
        # Берем отступы (пробелы) именно от этой строчки
        spaces = len(line) - len(line.lstrip())
        indent = " " * spaces
        
        # Вставляем обработку /scalping с ТОЧНО ТАКИМИ ЖЕ отступами
        new_lines.append(f'{indent}elif cmd == "/scalping":\n')
        new_lines.append(f'{indent}    send(chat, "⚡️ Скальпинг: ищу быстрые зоны на 5м и 15м...")\n')
        new_lines.append(f'{indent}    send(chat, "Пока нет четких FVG зон. Ждем.")\n')
    
    new_lines.append(line)

with open('bot.py', 'w', encoding='utf-8') as f:
    f.writelines(new_lines)

print("Команда /scalping успешно добавлена в код!")
