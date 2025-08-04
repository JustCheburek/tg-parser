/* eslint-disable @typescript-eslint/require-await */
import { TelegramClient } from 'telegram';
import { StringSession } from 'telegram/sessions/index.js';
import { apiId, apiHash, channelUsername, savedSession } from './config';
import { fetchAllMessages } from './api/messages';
import * as path from 'path';

/**
 * Получает сохраненную сессию из .env файла
 */
const getSessionFromEnv = async (): Promise<string> => {
  return savedSession || '';
};

/**
 * The main function orchestrates the setup and execution of the Telegram client,
 * handles user authentication, and triggers the message fetching process.
 */
const main = async (): Promise<void> => {
  console.log('TG Parser запущен');
  console.log(`Будут загружены сообщения из канала: @${channelUsername}`);

  // Initialize the Telegram client with a saved session, if available
  const stringSession = new StringSession(await getSessionFromEnv());

  const client: TelegramClient = new TelegramClient(
    stringSession,
    apiId,
    apiHash,
    {
      connectionRetries: 5,
    },
  );

  try {
    await client.connect();
    // await client.start({
    //   phoneNumber: async () => phoneNumber || '',
    //   password: async () => twoFactorPassword || '',
    //   phoneCode: async () => await prompt('Введите код авторизации из Telegram: '),
    //   onError: (err: Error) => {
    //     console.log(`Ошибка авторизации: ${err.message}`);
    //     throw err;
    //   },
    // });
    console.log('Пользователь успешно авторизован!');
  } catch (error) {
    console.log(`\n❌ Не удалось авторизоваться: ${(error as Error).message}`);
    await client.disconnect();
    return;
  }

  await fetchAllMessages(client);
  await client.disconnect();

  console.log('Завершение работы приложения...');
};

/**
 * Handles graceful shutdown of the application
 *
 * @param {boolean} [isError=false] - Indicates if the shutdown is due to an error.
 */
const shutdown = (isError: boolean = false) => {
  console.log('Завершение работы приложения...');
  process.exit(isError ? 1 : 0); // Exit the process, indicating error if any
};

// Register event listeners for graceful shutdown and unhandled rejections
process.once('SIGTERM', () => shutdown());
process.once('SIGINT', () => shutdown());
process.once('unhandledRejection', (error) => {
  console.log(
    `\n❌ Необработанная ошибка: ${(error as Error)?.message || 'Неизвестная ошибка'}`,
  );
  shutdown(true);
});

// Парсер
(async () => {
  await main();
  shutdown();
})().catch((error) => {
  console.log(
    `\n❌ Внутренняя ошибка приложения: ${(error as Error)?.message || 'Неизвестная ошибка'}`,
  );
  shutdown(true);
});
