import { TelegramClient } from 'telegram';
import { Api } from 'telegram/tl';
import { delay } from '../utils/common.js';
import {
  messagesLimit,
  fetchDelay,
  justTry,
  channelUsername,
} from '../config.js';
import { getCycle, saveCycle } from '../db/fetchCycle.js';
import { parseTelegramMessage, saveMessageMany } from '../db/messages.js';

/**
 * Fetches all messages from a given channel.
 *
 * @param {TelegramClient} client - The Telegram client.
 * @returns {Promise<Api.Message[]>} - A promise that resolves with an array of messages.
 */
export const fetchAllMessages = async (
  client: TelegramClient,
): Promise<void> => {
  // Getting initial cycle values
  let { offsetId } = await getCycle(channelUsername);

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const result = await client.invoke(
      new Api.messages.GetHistory({
        peer: channelUsername,
        limit: messagesLimit,
        offsetId,
      }),
    );

    const messages = (result as Api.messages.Messages)
      .messages as Api.Message[];

    if (messages.length === 0) {
      console.log('Done');
      break; // Exit the loop if no more messages are found
    }

    console.log(
      `Messages fetched: [from: ${messages[0].id}, to: ${messages[messages.length - 1].id}, messages: ${messages.length}]`,
    );

    // Exit from the cycle if we want just to try to fetch messages once
    if (justTry) {
      break;
    }

    // for (const m of messages) {
    //   await saveMessage(parseTelegramMessage(m));
    // }

    await saveMessageMany(messages.map((m) => parseTelegramMessage(m)));

    offsetId = Math.min(...messages.map((m) => m.id));

    await saveCycle(channelUsername, offsetId);
    console.log(`Next cycle on ${channelUsername}. Offset: ${offsetId}`);

    await delay(fetchDelay);
  }
};
