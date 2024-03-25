import { createInterface } from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';

/**
 * Prompts the user with a question and returns their input as a string.
 * Utilizes the readline module to create an interactive command line interface.
 *
 * @param {string} question - The question to display to the user.
 * @returns {Promise<string>} - A promise that resolves with the user's input.
 *
 * @example
 * async function getUserInput() {
 *   // Prompt the user and wait for their response
 *   const name = await prompt('What is your name? ');
 *
 *   console.log(`Hello, ${name}!`);
 * }
 *
 * getUserInput();
 */
export const prompt = async (question: string): Promise<string> => {
  // Create a readline interface using process.stdin and process.stdout
  const rl = createInterface({ input, output });

  // Wait for the user to respond to the question
  const answer = await rl.question(question);

  // Close the readline interface after receiving the input
  rl.close();

  // Return the user's input
  return answer;
};
