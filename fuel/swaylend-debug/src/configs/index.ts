import { createMainnetConfig } from './envs/mainnet.js';
import { createTestnetConfig } from './envs/testnet.js';

export const appConfig = getConfig();

function getConfig() {
  const appEnv = process.env.APP_ENV;

  switch (appEnv) {
    case 'mainnet':
      return createMainnetConfig();
    case 'testnet':
      return createTestnetConfig();
    default:
      throw new Error(`Invalid APP_ENV "${process.env.APP_ENV}"`);
  }
}
