import { Api } from 'telegram';
import { Message, AttachmentType, Attachment } from '@prisma/client';
import { prisma } from './index.js';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('MessagesDb');

// Types for the inputs to database functions, omitting the auto-generated 'id' field
export type AttachmentInput = Omit<Attachment, 'id'>;
export type MessageInput = Omit<Message, 'id'> & {
  attachmentsInput: AttachmentInput[];
};

/**
 * Converts a Telegram API message into a structured format suitable for database storage.
 * It identifies different types of media attachments within the message and prepares them
 * for insertion into the database.
 *
 * @param {Api.Message} telegramMessage - The Telegram message object to be parsed.
 * @param {string} channelName - Channel username
 * @returns {MessageInput} A structured representation of the message, including attachments,
 * ready for database insertion.
 */
export const parseTelegramMessage = (
  telegramMessage: Api.Message,
  channelName: string,
): MessageInput => {
  const attachmentsInput: AttachmentInput[] = [];

  // Process different types of media in the message
  switch (telegramMessage.media?.className) {
    case 'MessageMediaPhoto':
      // Handling photo attachments
      if (telegramMessage.media.photo) {
        attachmentsInput.push({
          mediaId: telegramMessage.media.photo.id.toString(),
          type: AttachmentType.PHOTO,
          mimeType: null, // MIME type is not applicable for photos
        });
      }
      break;
    case 'MessageMediaDocument':
      // Handling document attachments, including MIME type
      if (telegramMessage.media.document) {
        attachmentsInput.push({
          mediaId: telegramMessage.media.document.id.toString(),
          mimeType: (telegramMessage.media.document as Api.Document).mimeType,
          type: AttachmentType.DOCUMENT,
        });
      }
      break;
    case 'MessageMediaWebPage':
      // Handling web page attachments
      if (telegramMessage.media.webpage) {
        attachmentsInput.push({
          mediaId: (telegramMessage.media.webpage as Api.WebPage).id.toString(),
          mimeType: null, // MIME type is often not applicable for web pages
          type: AttachmentType.WEBPAGE,
        });
      }
      break;
    // Additional media types can be handled similarly
  }

  // Return a structured object representing the message and its attachments
  return {
    channelId: (telegramMessage.peerId as Api.PeerChannel).channelId.toString(),
    channelName,
    messageId: telegramMessage.id,
    date: telegramMessage.date ?? null,
    message: telegramMessage.message ?? null,
    attachments: attachmentsInput.map((a) => a.mediaId),
    attachmentsInput,
    replyToMsgId: telegramMessage.replyToMsgId ?? null,
    replies: telegramMessage.replies?.replies ?? 0,
  };
};

/**
 * Saves a single parsed message to the database, including any attachments.
 * This function handles both the creation of new records and the updating of existing ones.
 *
 * @param {MessageInput} messageInput - The parsed message object, including attachment data.
 * @returns {Promise<void>}
 */
export const saveMessage = async ({
  channelId,
  channelName,
  messageId,
  date,
  message,
  replyToMsgId,
  attachments,
  attachmentsInput,
  replies,
}: MessageInput): Promise<void> => {
  await prisma.$transaction(async (prisma) => {
    // Create attachment records if there are any
    if (attachmentsInput.length > 0) {
      await prisma.attachment.createMany({
        data: attachmentsInput,
      });
    }

    // Upsert the message record
    await prisma.message.upsert({
      where: {
        channelMessage: { channelId, messageId },
      },
      update: { date, message, replyToMsgId, attachments, replies },
      create: {
        channelId,
        channelName,
        messageId,
        date,
        message,
        replyToMsgId,
        attachments,
        replies,
      },
    });
  });

  logger.trace(
    `Message #${messageId} in channel #${channelId} has been processed`,
  );
};

/**
 * Saves multiple parsed messages to the database in a batch operation.
 * Attachments are processed and saved first, followed by the messages themselves.
 *
 * @param {MessageInput[]} messagesInput - An array of parsed message objects.
 * @returns {Promise<void>}
 */
export const saveMessageMany = async (messagesInput: MessageInput[]) => {
  // Consolidate all attachment inputs into a single array
  const attachmentsInput = messagesInput.reduce<
    MessageInput['attachmentsInput']
  >((acc, val) => [...acc, ...val.attachmentsInput], []);

  await prisma.$transaction(async (prisma) => {
    // Create attachment records in batch
    if (attachmentsInput.length > 0) {
      await prisma.attachment.createMany({
        data: attachmentsInput,
      });
    }

    // Create message records, omitting the attachment inputs as they're handled separately
    await prisma.message.createMany({
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      data: messagesInput.map(({ attachmentsInput, ...rest }) => rest),
    });
  });

  logger.trace(
    `Messages ${messagesInput.map((m) => m.messageId).join(', ')} processed`,
  );
};
