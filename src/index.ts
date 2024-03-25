/* eslint-disable @typescript-eslint/require-await */
import { TelegramClient } from 'telegram';
import { StringSession } from 'telegram/sessions';
import { apiId, apiHash } from './config.js';
import { getSession, saveSession } from './db/session.js';
import { prisma } from './db/index.js';
import { fetchAllMessages } from './api/messages.js';
import { prompt } from './utils/input.js';

/**
 * The main function orchestrates the setup and execution of the Telegram client,
 * handles user authentication, and triggers the message fetching process.
 */
const main = async (): Promise<void> => {
  console.log('Starting...');

  // Initialize the Telegram client with a saved session, if available
  const stringSession = new StringSession(await getSession());

  const client = new TelegramClient(stringSession, apiId, apiHash, {
    connectionRetries: 5,
  });

  try {
    // Attempt to connect the client to Telegram
    await client.connect();

    // Verify that the user is authorized; if not, throw an error
    if (!(await client.isUserAuthorized())) {
      throw new Error('Session is not valid or expired');
    }
  } catch (err) {
    // Handle connection and authorization errors
    console.log(
      'Login required:',
      (err as Error).message ?? 'Unknown connection error',
    );

    // Prompt the user for login details and attempt to start a new session
    await client.start({
      phoneNumber: () => prompt('Enter your phone number: '),
      phoneCode: () => prompt('Enter code: '),
      onError: (err: Error) => console.error(err),
    });
    console.log('Successfully logged in.');
  }

  // Save the session string for future connections
  await saveSession(stringSession.save());
  console.log('Session updated.');

  // Proceed to fetch all messages from the configured Telegram channel
  await fetchAllMessages(client);

  // Disconnect the client
  await client.disconnect();
};

/**
 * Handles graceful shutdown of the application, ensuring that the Prisma client disconnects properly.
 *
 * @param {boolean} [isError=false] - Indicates if the shutdown is due to an error.
 */
const shutdown = (isError: boolean = false) => {
  const stopHandler = async () => {
    await prisma.$disconnect(); // Ensure Prisma client disconnects
  };
  stopHandler()
    .catch(console.error)
    .finally(() => process.exit(isError ? 1 : 0)); // Exit the process, indicating error if any
};

// Register event listeners for graceful shutdown and unhandled rejections
process.once('SIGTERM', () => shutdown());
process.once('SIGINT', () => shutdown());
process.once('unhandledRejection', (error) => {
  console.error('🛸 Unhandled rejection', error);
  shutdown(true);
});

// Execute the main function and handle errors
main()
  .then(() => shutdown())
  .catch((error) => {
    console.error('🚨 Internal application error', error);
    shutdown(true);
  });
