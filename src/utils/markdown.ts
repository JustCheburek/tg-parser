import * as fs from 'fs';
import * as path from 'path';
import { Api } from 'telegram/tl/index.js';

// Интерфейс для сообщения
interface Message {
  id: number;
  text: string | null;
  markdown: string | null;
  [key: string]: any; // Для других полей
}

// Интерфейс для сущностей Telegram
interface MessageEntity {
  className: string;
  offset: number;
  length: number;
  url?: string;
  userId?: number;
  [key: string]: any; // Для других полей
}

/**
 * Экранирует спецсимволы внутри URL для Markdown, не трогая внешнее форматирование
 */
function safeMarkdownUrl(url: string): string {
  // Заменяем только ** внутри URL на %2A%2A (или * *)
  return url.replace(/\*\*/g, '%2A%2A');
}

/**
 * Преобразует сущности Telegram в Markdown-разметку
 * @param {string} text - Исходный текст сообщения
 * @param {Api.TypeMessageEntity[] | undefined} entities - Массив сущностей Telegram
 * @returns {string} Текст с Markdown-разметкой
 */
export function convertEntitiesToMarkdown(text: string, entities?: Api.TypeMessageEntity[]): string {
  if (!text) return '';
  if (!entities || entities.length === 0) return text;
  
  // Копируем сущности, чтобы не мутировать исходные
  let entitiesCopy = [...entities];
  
  // 1. Ищем пары text_url + bold с одинаковым диапазоном
  for (let i = 0; i < entitiesCopy.length; i++) {
    const e1 = entitiesCopy[i];
    if (e1.className === 'MessageEntityTextUrl' || e1.className === 'MessageEntityUrl') {
      for (let j = 0; j < entitiesCopy.length; j++) {
        if (i === j) continue;
        const e2 = entitiesCopy[j];
        if (e2.className === 'MessageEntityBold' && e1.offset === e2.offset && e1.length === e2.length) {
          // Помечаем жирность как вложенную
          (e1 as any)._wrapBold = true;
          // Удаляем жирность из списка, чтобы не дублировать
          entitiesCopy = entitiesCopy.filter((_, idx) => idx !== j);
          break;
        }
      }
    }
  }
  
  // Сортируем сущности по смещению (от меньшего к большему) и по длине (от большего к меньшему)
  const sortedEntities = [...entitiesCopy].sort((a, b) => {
    if (a.offset !== b.offset) return a.offset - b.offset;
    return b.length - a.length;
  });
  
  // Создаем копию текста для Markdown
  let markdown = text;
  let offset = 0; // Смещение из-за добавления Markdown-тегов
  
  // Обрабатываем каждую сущность
  for (const entity of sortedEntities) {
    const { className, offset: entityOffset, length } = entity;
    
    // Учитываем смещение из-за добавленных тегов
    const adjustedOffset = entityOffset + offset;
    
    // Проверяем, что смещение и длина валидны
    if (entityOffset < 0 || entityOffset + length > text.length) continue;
    
    // Извлекаем фрагмент текста для этой сущности
    const fragment = markdown.substring(adjustedOffset, adjustedOffset + length);
    
    // Применяем Markdown-разметку в зависимости от типа сущности
    let replacement = '';
    switch (className) {
      case 'MessageEntityBold':
        replacement = `**${fragment}**`;
        offset += 4; // **...**
        break;
      case 'MessageEntityItalic':
        replacement = `*${fragment}*`;
        offset += 2; // *...*
        break;
      case 'MessageEntityCode':
        replacement = `\`${fragment}\``;
        offset += 2; // `...`
        break;
      case 'MessageEntityPre':
        replacement = `\`\`\`\n${fragment}\n\`\`\``;
        offset += 8; // ```\n...\n```
        break;
      case 'MessageEntityStrike':
        replacement = `~~${fragment}~~`;
        offset += 4; // ~~...~~
        break;
      case 'MessageEntityUnderline':
        replacement = `__${fragment}__`;
        offset += 4; // __...__
        break;
      case 'MessageEntityUrl':
        if ((entity as any)._wrapBold) {
          replacement = `[**${fragment}**](${fragment})`;
          offset += fragment.length + 8; // [**...**](...)
        } else {
          replacement = `[${fragment}](${fragment})`;
          offset += fragment.length + 4;
        }
        break;
      case 'MessageEntityTextUrl':
        const url = (entity as Api.MessageEntityTextUrl).url;
        if ((entity as any)._wrapBold) {
          replacement = `[**${fragment}**](${url})`;
          offset += url.length + 8;
        } else {
          replacement = `[${fragment}](${url})`;
          offset += url.length + 4;
        }
        break;
      case 'MessageEntityMention':
        replacement = `[${fragment}](https://t.me/${fragment.substring(1)})`;
        offset += 13 + fragment.length; // [...](https://t.me/...)
        break;
      case 'MessageEntityMentionName':
        const userId = (entity as Api.MessageEntityMentionName).userId.toString();
        replacement = `[${fragment}](tg://user?id=${userId})`;
        offset += 14 + userId.length; // [...](tg://user?id=...)
        break;
      case 'MessageEntityHashtag':
        replacement = `**${fragment}**`;
        offset += 4; // **...**
        break;
      case 'MessageEntitySpoiler':
        replacement = `||${fragment}||`;
        offset += 4; // ||...||
        break;
      case 'MessageEntityBlockquote':
        // Форматирование цитаты - добавляем > перед каждой строкой
        const lines = fragment.split('\n');
        const quotedLines = lines.map(line => `> ${line}`);
        replacement = quotedLines.join('\n');
        offset += lines.length * 2; // > для каждой строки
        break;
      default:
        replacement = fragment; // Не изменяем
        break;
    }
    
    // Заменяем фрагмент в тексте
    markdown = markdown.substring(0, adjustedOffset) + replacement + markdown.substring(adjustedOffset + length);
  }
  
  return markdown;
}
