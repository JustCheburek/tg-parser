import express, { Request, Response } from 'express';
import * as fs from 'fs';
import * as path from 'path';
import cors from 'cors';
import { getEnvVar } from '../utils/env.js';

const app = express();
const PORT = Number(process.env.PORT || 3000);

// Настройка CORS с расширенными опциями
const corsOptions = {
  origin: '*', // Разрешаем доступ с любого источника
  methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
  preflightContinue: false,
  optionsSuccessStatus: 204,
  credentials: true
};

// Подключаем CORS middleware
app.use(cors(corsOptions));

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

// Маршрут для получения всех сообщений с поддержкой пагинации
// Пример: /?offset=0&limit=100
app.get('/', (req: Request, res: Response) => {
  if (!fs.existsSync(MESSAGES_FILE)) {
    return res.status(404).json({ error: 'messages.json не найден' });
  }
  const data = fs.readFileSync(MESSAGES_FILE, 'utf8');
  try {
    const messages = JSON.parse(data);
    // Параметры пагинации
    const offset = Number(req.query.offset) || 0;
    const limit = req.query.limit !== undefined ? Number(req.query.limit) : undefined;
    let result = messages;
    if (!isNaN(offset) && limit !== undefined && !isNaN(limit)) {
      result = messages.slice(offset, offset + limit);
    } else if (!isNaN(offset) && offset > 0) {
      result = messages.slice(offset);
    } else if (limit !== undefined && !isNaN(limit)) {
      result = messages.slice(0, limit);
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