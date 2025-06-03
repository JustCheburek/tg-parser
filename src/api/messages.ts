import { TelegramClient } from 'telegram';
import { Api } from 'telegram/tl/index.js';
import { delay } from '../utils/common.js';
import {
  fetchDelay, // Delay between fetch cycles to avoid rate limiting
  channelUsername, // The username of the channel to fetch messages from
} from '../config.js';
import * as fs from 'fs';
import * as path from 'path';

const MESSAGES_FILE = path.resolve(process.cwd(), 'output', 'messages.json');
const PHOTOS_DIR = path.resolve(process.cwd(), 'output', 'photos');
if (!fs.existsSync(PHOTOS_DIR)) {
  fs.mkdirSync(PHOTOS_DIR, { recursive: true });
}

// Тип для сообщения, сохраняемого в JSON
interface SimpleMessage {
  id: number;
  date: number;
  text: string | null;
  media: string;
  photoPath?: string;
  heading: string | null;
  tags: string[];
}

function extractHeading(text: string | null): string | null {
  if (!text) return null;
  // Только первая строка (до первого \n или \r)
  const firstLine = text.split(/\n|\r/)[0];
  return firstLine.trim() || null;
}

function extractTags(text: string | null): string[] {
  if (!text) return [];
  const lines = text.trim().split(/\r?\n/);
  const lastLine = lines[lines.length - 1];
  // Ищем слова, начинающиеся с #, любые символы кроме пробела и переноса
  return (lastLine.match(/#([^\s#]+)/g) || []).map(tag => tag.slice(1));
}

function extractBodyText(text: string | null): string | null {
  if (!text) return null;
  const lines = text.split(/\r?\n/);
  if (lines.length <= 2) return null;
  // Убираем первую и последнюю строку
  const body = lines.slice(1, -1).join('\n').trim();
  return body === '' ? null : body;
}

/**
 * Преобразует сообщение в объект для сохранения в JSON (только нужные поля)
 * @param {Api.Message} message - Telegram message
 * @returns {object} Объект сообщения для JSON
 */
const messageToJsonObject = (message: Api.Message, photoPath?: string): SimpleMessage => {
  const date = message.date; // timestamp (number)
  const msgId = message.id;
  const msgText = message.message ?? null;
  let mediaType = 'Нет';
  if (message.media) {
    mediaType = message.media.className.replace('MessageMedia', '');
  }
  const heading = extractHeading(msgText);
  const tags = extractTags(msgText);
  const body = extractBodyText(msgText);
  
  const obj: any = {
    id: msgId,
    date: date,
    text: body,
    media: mediaType,
    heading,
    tags
  };
  if (photoPath) obj.photoPath = photoPath;
  return obj;
};

/**
 * Создает JSON-файл с пустым массивом сообщений
 * @param {string} channelName - Имя канала Telegram
 * @returns {string} Путь к файлу
 */
const createMessageFile = (_channelName: string): string => {
  const outputDir = path.resolve(process.cwd(), 'output');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  if (!fs.existsSync(MESSAGES_FILE)) {
    fs.writeFileSync(MESSAGES_FILE, '[]', { encoding: 'utf8' });
    console.log(`\nСоздан файл для всех сообщений: ${MESSAGES_FILE}`);
  } else {
    console.log(`\nСообщения будут сохранены в файл: ${MESSAGES_FILE}`);
  }
  return MESSAGES_FILE;
};

/**
 * Записывает сообщения в JSON-файл (уникальность по id, обновление text, сортировка по date)
 * @param {string} filePath - Путь к файлу
 * @param {Api.Message[]} messages - Массив сообщений для записи
 */
const writeMessagesToFile = async (filePath: string, messages: Api.Message[], client: TelegramClient): Promise<void> => {
  let fileContent = '[]';
  if (fs.existsSync(filePath)) {
    fileContent = fs.readFileSync(filePath, { encoding: 'utf8' });
  }
  let jsonData: SimpleMessage[] = [];
  try {
    jsonData = JSON.parse(fileContent);
  } catch {
    jsonData = [];
  }
  const idMap = new Map<number, SimpleMessage>();
  for (const msg of jsonData) {
    idMap.set(msg.id, msg);
  }
  for (const message of messages) {
    let photoPath;
    if (message.media && message.media instanceof Api.MessageMediaPhoto) {
      photoPath = await downloadPhotoMiniapp(client, message);
    }
    const obj = messageToJsonObject(message, photoPath);
    if (idMap.has(obj.id)) {
      idMap.get(obj.id)!.text = obj.text;
      if (photoPath) idMap.get(obj.id)!.photoPath = photoPath;
    } else {
      idMap.set(obj.id, obj);
    }
  }
  const result = Array.from(idMap.values()).sort((a, b) => b.date - a.date);
  fs.writeFileSync(filePath, JSON.stringify(result, null, 2), { encoding: 'utf8' });
};

// --- MINIAPP: скачивание фото через GramJS ---
async function downloadPhotoMiniapp(client: TelegramClient, message: Api.Message): Promise<string | undefined> {
  if (message.media && message.media instanceof Api.MessageMediaPhoto) {
    const filePath = path.join(PHOTOS_DIR, `photo_${message.id}.jpg`);
    if (fs.existsSync(filePath)) {
      return filePath;
    }
    try {
      const buffer = await client.downloadMedia(message);
      if (buffer) {
        fs.writeFileSync(filePath, buffer);
        return filePath;
      }
    } catch (e) {
      console.log(`Ошибка скачивания фото для сообщения ${message.id}:`, e);
    }
  }
  return undefined;
}

/**
 * Fetches all messages from a given Telegram channel, displays them in console
 * and saves them to a text file.
 * Continues fetching in cycles until no new messages are found or if configured to fetch once.
 *
 * @param {TelegramClient} client - The Telegram client initialized with user credentials.
 * @returns {Promise<void>} A promise that resolves when all messages have been fetched and processed.
 */
export const fetchAllMessages = async (
  client: TelegramClient,
): Promise<void> => {
  let offsetId = 0;
  let totalMessages = 0;
  const outputFilePath = createMessageFile(channelUsername);
  while (true) {
    const result = await client.invoke(
      new Api.messages.GetHistory({
        peer: channelUsername,
        limit: 100,
        offsetId,
      }),
    );
    const messages = (result as Api.messages.Messages)
      .messages as Api.Message[];
    if (messages.length === 0) {
      console.log(`\nВся история загружена.`);
      break;
    }
    totalMessages += messages.length;
    await writeMessagesToFile(outputFilePath, messages, client);
    console.log(`Всего загружено и выведено сообщений: ${totalMessages}`);
    offsetId = Math.min(...messages.map((m) => m.id));
    await delay(fetchDelay);
  }
};
