# Используем официальный образ Bun
FROM oven/bun:1.2.15

# Устанавливаем рабочую директорию
WORKDIR /app

# Копируем package.json, bun.lock и tsconfig.json
COPY package.json bun.lock* tsconfig.json ./

# Устанавливаем зависимости
RUN bun install

# Создаем директорию для выходных данных
RUN mkdir -p /app/output/photos

# Копируем исходники
COPY . .

# Открываем порт для API
EXPOSE 3000

# Устанавливаем переменные окружения
ENV NODE_ENV=api

# Запускаем API сервер
CMD ["bun", "src/index.ts"] 