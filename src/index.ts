/* eslint-disable @typescript-eslint/require-await */
import { TelegramClient } from 'telegram';
import { StringSession } from 'telegram/sessions';
import { apiId, apiHash } from './config.js';
import { getSession, saveSession } from './db/session.js';
import { prisma } from './db/index.js';
import { fetchAllMessages } from './api/messages.js';
import { prompt } from './utils/input.js';

const main = async (): Promise<void> => {
  console.log('Starting...');

  const stringSession = new StringSession(await getSession());

  const client = new TelegramClient(stringSession, apiId, apiHash, {
    connectionRetries: 5,
  });

  try {
    await client.connect();

    if (!(await client.isUserAuthorized())) {
      throw new Error('Session is not valid or expired');
    }
  } catch (err) {
    console.log(
      'Login required:',
      (err as Error).message ?? 'Unknown connection error',
    );

    await client.start({
      phoneNumber: () => prompt('Enter your phone number: '),
      phoneCode: () => prompt('Enter code: '),
      onError: (err: Error) => console.error(err),
    });
    console.log('Successfully logged in.');
  }

  await saveSession(stringSession.save());
  console.log('Session updated.');

  await fetchAllMessages(client);

  await client.disconnect();
};

/** Graceful Shutdown handler */
const shutdown = (isError: boolean = false) => {
  const stopHandler = async () => {
    await prisma.$disconnect();
  };
  stopHandler()
    .catch(console.error)
    .finally(() => process.exit(isError ? 1 : 0));
};

process.once('SIGTERM', () => shutdown());
process.once('SIGINT', () => shutdown());
process.once('unhandledRejection', (error) => {
  console.error('🛸 Unhandled rejection', error);
  shutdown(true);
});

main()
  .then(() => shutdown())
  .catch((error) => {
    console.error('🚨 Internal application error', error);
    shutdown(true);
  });
