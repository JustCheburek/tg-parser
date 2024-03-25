import { TelegramClient } from 'telegram';
import { Api } from 'telegram/tl/index.js';
import { delay } from '../utils/common.js';
import {
  messagesLimit, // The maximum number of messages to fetch in one call
  fetchDelay, // Delay between fetch cycles to avoid rate limiting
  justTry, // Flag to determine if only one fetch cycle should be attempted
  channelUsername, // The username of the channel to fetch messages from
} from '../config.js';
import { getCycle, saveCycle } from '../db/fetchCycle.js';
import { parseTelegramMessage, saveMessageMany } from '../db/messages.js';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('MessagesApi');

/**
 * Fetches all messages from a given Telegram channel and stores them in a database.
 * Continues fetching in cycles until no new messages are found or if configured to fetch once.
 *
 * @param {TelegramClient} client - The Telegram client initialized with user credentials.
 * @returns {Promise<void>} A promise that resolves when all messages have been fetched and processed.
 */
export const fetchAllMessages = async (
  client: TelegramClient,
): Promise<void> => {
  // Retrieve the current offset ID from the database to continue the fetch cycle
  let { offsetId } = await getCycle(channelUsername);

  // Infinite loop to continuously fetch messages until a break condition is met
  // eslint-disable-next-line no-constant-condition
  while (true) {
    // Fetch a batch of messages starting from the current offset
    const result = await client.invoke(
      new Api.messages.GetHistory({
        peer: channelUsername,
        limit: messagesLimit,
        offsetId,
      }),
    );

    // Cast the result to Api.messages.Messages and extract the messages array
    const messages = (result as Api.messages.Messages)
      .messages as Api.Message[];

    // If no messages are returned, we've reached the end of the channel's history
    if (messages.length === 0) {
      logger.trace('Done fetching all messages.');
      break; // Break the loop to stop fetching
    }

    // Log the details of the fetched messages for debugging purposes
    logger.trace(
      `Messages fetched: [from: ${messages[0].id}, to: ${messages[messages.length - 1].id}, messages: ${messages.length}]`,
    );

    // If configured to only try fetching once, exit the loop after the first batch
    if (justTry) {
      break;
    }

    // Save the fetched messages to the database after processing
    await saveMessageMany(messages.map((m) => parseTelegramMessage(m)));

    // Update the offset ID to the smallest message ID from the fetched batch for the next cycle
    offsetId = Math.min(...messages.map((m) => m.id));

    // Save the new offset ID to the database for the next fetch cycle
    await saveCycle(channelUsername, offsetId);
    logger.trace(`Next cycle on ${channelUsername}. Offset: ${offsetId}`);

    // Wait for a specified delay to avoid hitting rate limits
    await delay(fetchDelay);
  }
};
