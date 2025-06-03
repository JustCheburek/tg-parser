import 'dotenv/config';
import { getEnvVar } from './utils/env.js';

export const apiId = getEnvVar('API_ID', 'number');
export const apiHash = getEnvVar('API_HASH', 'string');
export const fetchDelay = getEnvVar('MSG_FETCH_DELAY', 'number');
export const channelUsername = getEnvVar('CHANNEL_USERNAME', 'string');
// Параметры авторизации (необязательные)
export const phoneNumber = getEnvVar('PHONE_NUMBER', 'string', false);
export const twoFactorPassword = getEnvVar('TWO_FACTOR_PASSWORD', 'string', false);
export const savedSession = getEnvVar('SAVED_SESSION', 'string', false);
