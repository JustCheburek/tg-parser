/**
 * Creates a promise that resolves after a specified delay.
 * This function can be used to pause execution in asynchronous functions
 * without blocking the main thread. It leverages JavaScript's `setTimeout` function.
 *
 * @param {number} ms - The delay in milliseconds before the promise resolves.
 * @returns {Promise<void>} A promise that resolves after the specified delay.
 */
export const delay = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));
