import 'dotenv/config';
import { getEnvVar } from './utils/env.js';

export const apiId = getEnvVar('API_ID', 'number');

export const apiHash = getEnvVar('API_HASH', 'string');

export const messagesLimit = getEnvVar('MSG_LIMIT', 'number');

export const fetchDelay = getEnvVar('MSG_FETCH_DELAY', 'number');

export const justTry = getEnvVar('MSG_TRY', 'boolean');

export const channelUsername = getEnvVar('CHANNEL_USERNAME', 'string');
