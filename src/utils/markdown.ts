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
 * Преобразует сущности Telegram в Markdown-разметку
 * @param {string} text - Исходный текст сообщения
 * @param {Api.TypeMessageEntity[] | undefined} entities - Массив сущностей Telegram
 * @returns {string} Текст с Markdown-разметкой
 */
export function convertEntitiesToMarkdown(text: string, entities?: Api.TypeMessageEntity[]): string {
  if (!text) return '';
  if (!entities || entities.length === 0) return text;
  
  // Сортируем сущности по смещению (от меньшего к большему) и по длине (от большего к меньшему)
  // Это позволит сначала обработать более крупные сущности, а потом более мелкие
  const sortedEntities = [...entities].sort((a, b) => {
    if (a.offset !== b.offset) {
      return a.offset - b.offset; // Сначала по смещению (от меньшего к большему)
    }
    return b.length - a.length; // При одинаковом смещении - по длине (от большего к меньшему)
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
        replacement = `[${fragment}](${fragment})`;
        offset += fragment.length + 4; // [...](...)
        break;
      case 'MessageEntityTextUrl':
        const url = (entity as Api.MessageEntityTextUrl).url;
        replacement = `[${fragment}](${url})`;
        offset += url.length + 4; // [...](...)
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
