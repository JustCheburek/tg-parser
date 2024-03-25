import { createInterface } from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';

export const prompt = async (question: string): Promise<string> => {
  const rl = createInterface({ input, output });
  const answer = await rl.question(question);
  rl.close();
  return answer;
};
