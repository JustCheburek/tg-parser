import express, { Request, Response } from 'express';
import * as fs from 'fs';
import * as path from 'path';
import { getEnvVar } from '../utils/env.js';

const app = express();
const PORT = Number(process.env.PORT || 3000);

// Отладочная информация
console.log('Текущая рабочая директория:', process.cwd());

// Определяем пути к файлам относительно текущей директории
const MESSAGES_FILE = path.resolve(process.cwd(), 'output', 'messages.json');
console.log('Путь к файлу с сообщениями:', MESSAGES_FILE);
console.log('Существует ли файл:', fs.existsSync(MESSAGES_FILE));

// Директория с фотографиями
const PHOTOS_DIR = path.resolve(process.cwd(), 'output', 'photos');
console.log('Путь к директории с фотографиями:', PHOTOS_DIR);
console.log('Существует ли директория:', fs.existsSync(PHOTOS_DIR));

// Создаем директории, если они не существуют
if (!fs.existsSync(path.resolve(process.cwd(), 'output'))) {
  fs.mkdirSync(path.resolve(process.cwd(), 'output'), { recursive: true });
  console.log('Создана директория output');
}

if (!fs.existsSync(PHOTOS_DIR)) {
  fs.mkdirSync(PHOTOS_DIR, { recursive: true });
  console.log('Создана директория photos');
}

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

// Маршрут для получения всех сообщений с поддержкой пагинации
// Пример: /?offset=0&limit=100
app.get('/', (req, res) => {
  if (!fs.existsSync(MESSAGES_FILE)) {
    return res.status(404).json({ error: 'messages.json не найден' });
  }
  const data = fs.readFileSync(MESSAGES_FILE, 'utf8');
  try {
    const messages = JSON.parse(data);
    const processed = processMessages(messages);
    // Параметры пагинации
    const offset = Number(req.query.offset) || 0;
    const limit = req.query.limit !== undefined ? Number(req.query.limit) : undefined;
    let result = processed;
    if (!isNaN(offset) && limit !== undefined && !isNaN(limit)) {
      result = processed.slice(offset, offset + limit);
    } else if (!isNaN(offset) && offset > 0) {
      result = processed.slice(offset);
    } else if (limit !== undefined && !isNaN(limit)) {
      result = processed.slice(0, limit);
    }
    res.json(result);
  } catch (e) {
    res.status(500).json({ error: 'Invalid JSON' });
  }
});

// Получение фотографии по ID сообщения
app.get('/photo/:id', (req: Request, res: Response) => {
  const messageId = req.params.id;
  const photoPath = path.join(PHOTOS_DIR, `photo_${messageId}.jpg`);
  
  if (!fs.existsSync(photoPath)) {
    return res.status(404).json({ error: 'Фотография не найдена' });
  }
  
  res.sendFile(photoPath);
});

// Маршрут для проверки состояния API
app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    filesystemCheck: {
      outputDirExists: fs.existsSync(path.resolve(process.cwd(), 'output')),
      photosDirExists: fs.existsSync(PHOTOS_DIR),
      messagesFileExists: fs.existsSync(MESSAGES_FILE)
    }
  });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`API сервер запущен на http://0.0.0.0:${PORT}`);
  console.log(`Базовый URL API: ${API_BASE_URL}`);
}); 