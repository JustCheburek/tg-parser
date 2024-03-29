import { prisma } from './index.js';

/**
 * Retrieves the most recent session string from the database.
 *
 * This function queries the 'session' table, orders the records by their creation date
 * in descending order, and returns the latest session string. If no session is found,
 * it returns an empty string.
 *
 * @returns {Promise<string>} A promise that resolves to the most recent session string,
 * or an empty string if no session is available.
 */
export const getSession = async (): Promise<string> => {
  // Fetch the most recently created session record
  const session = await prisma.session.findFirst({
    orderBy: {
      createdAt: 'desc', // Order by creation date, most recent first
    },
  });

  // Return the session string if found, otherwise return an empty string
  return session?.sessionString ?? '';
};

/**
 * Saves a new session string to the database.
 *
 * This function creates a new record in the 'session' table with the provided session string.
 * It's intended for storing session information that can later be retrieved by `getSession`.
 *
 * @param {string} sessionString - The session string to be saved in the database.
 * @returns {Promise<void>} A promise that resolves once the session string has been saved.
 */
export const saveSession = async (sessionString: string): Promise<void> => {
  // Create a new session record with the provided session string
  await prisma.session.create({
    data: {
      sessionString,
    },
  });
};
