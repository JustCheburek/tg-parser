import { FetchCycle } from '@prisma/client';
import { prisma } from './index.js';

/**
 * Retrieves the fetch cycle for a given Telegram channel from the database.
 * If the fetch cycle does not exist, a new entry is created.
 *
 * @param {string} channel - The unique identifier of the Telegram channel.
 * @returns {Promise<FetchCycle>} - The fetch cycle object containing the last fetched message ID and other metadata.
 */
export const getCycle = async (channel: string): Promise<FetchCycle> => {
  // Attempt to find an existing fetch cycle for the specified channel
  let cycle = await prisma.fetchCycle.findUnique({
    where: {
      channel, // Use the channel name as the unique identifier
    },
  });

  // If no existing fetch cycle is found, create a new one with default values
  if (!cycle) {
    cycle = await prisma.fetchCycle.create({
      data: {
        channel, // Initialize the fetch cycle for the given channel
      },
    });
  }

  return cycle; // Return the found or newly created fetch cycle
};

/**
 * Updates or creates the fetch cycle for a given Telegram channel with a new offset ID.
 * The offset ID represents the last message ID that was fetched, enabling subsequent fetches to continue from this point.
 *
 * @param {string} channel - The unique identifier of the Telegram channel.
 * @param {number} offsetId - The message ID to set as the new offset for the fetch cycle.
 * @returns {Promise<void>} - A promise that resolves once the operation is complete.
 */
export const saveCycle = async (
  channel: string,
  offsetId: number,
): Promise<void> => {
  // Update an existing fetch cycle or create a new one if it doesn't exist
  await prisma.fetchCycle.upsert({
    where: {
      channel, // Identify the fetch cycle by the channel name
    },
    update: {
      offsetId, // Update the offset ID to the new value
    },
    create: {
      channel, // If creating a new cycle, set both the channel name and the offset ID
      offsetId,
    },
  });
};
