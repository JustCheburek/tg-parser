import express from 'express';
import * as fs from 'fs';
import * as path from 'path';
import { getEnvVar } from '../utils/env.js';

const app = express();
const PORT = Number(process.env.PORT || 3000);

// Отладочная информация
console.log('Текущая рабочая директория:', process.cwd());

// Файл с сообщениями (абсолютный путь)
const MESSAGES_FILE = '/home/zi/tg-parser/output/messages.json';
console.log('Путь к файлу с сообщениями:', MESSAGES_FILE);
console.log('Существует ли файл:', fs.existsSync(MESSAGES_FILE));

// Директория с фотографиями
const PHOTOS_DIR = path.resolve(process.cwd(), 'output', 'photos');

// Базовый URL API (с завершающим слешем)
const API_BASE_URL = getEnvVar('API_BASE_URL', 'string', false) || 
  `http://localhost:${PORT}/`;

// Добавляем URL к фотографиям для внешнего доступа
function processMessages(messages: any[]) {
  return messages.map(message => {
    if (message.photoPath) {
      // Формируем URL для доступа к фото извне
      const photoId = path.basename(message.photoPath).replace('photo_', '').replace('.jpg', '');
      message.photoUrl = `${API_BASE_URL}photo/${photoId}`;
    }
    return message;
  });
}

// Маршрут для получения всех сообщений
app.get('/', (req, res) => {
  if (!fs.existsSync(MESSAGES_FILE)) {
    return res.status(404).json({ error: 'messages.json не найден' });
  }
  const data = fs.readFileSync(MESSAGES_FILE, 'utf8');
  try {
    const messages = JSON.parse(data);
    res.json(processMessages(messages));
  } catch (e) {
    res.status(500).json({ error: 'Invalid JSON' });
  }
});

// Получение фотографии по ID сообщения
app.get('/photo/:id', (req, res) => {
  const messageId = req.params.id;
  const photoPath = path.join(PHOTOS_DIR, `photo_${messageId}.jpg`);
  
  if (!fs.existsSync(photoPath)) {
    return res.status(404).json({ error: 'Фотография не найдена' });
  }
  
  res.sendFile(photoPath);
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`API сервер запущен на http://0.0.0.0:${PORT}`);
  console.log(`Базовый URL API: ${API_BASE_URL}`);
}); 