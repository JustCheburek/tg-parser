#!/bin/bash
export PATH="$HOME/.bun/bin:$PATH"

# Директория проекта
PROJECT_DIR="/home/zi/tg-parser"
LOG_FILE="$PROJECT_DIR/parser-cron.log"

# Логируем начало выполнения
echo "-----------------------------------" >> $LOG_FILE
echo "Запуск парсера: $(date)" >> $LOG_FILE

# Переходим в директорию проекта
cd $PROJECT_DIR
echo "Рабочая директория: $(pwd)" >> $LOG_FILE

# Проверяем наличие файла .env
if [ -f "$PROJECT_DIR/.env" ]; then
  echo "Файл .env найден" >> $LOG_FILE
else
  echo "ОШИБКА: Файл .env не найден!" >> $LOG_FILE
  exit 1
fi

# Запускаем парсер и логируем вывод
echo "Запускаем парсер..." >> $LOG_FILE
bun run start >> $LOG_FILE 2>&1
RESULT=$?

# Проверяем результат выполнения
if [ $RESULT -eq 0 ]; then
  echo "Парсер успешно завершил работу: $(date)" >> $LOG_FILE
else
  echo "ОШИБКА: Парсер завершился с кодом $RESULT: $(date)" >> $LOG_FILE
fi

echo "-----------------------------------" >> $LOG_FILE