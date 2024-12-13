import { defineConfig } from '../defineConfig.js';
import type { DeployedMarkets } from '../types.js';

export function createTestnetConfig() {
  return defineConfig({
    env: 'testnet',
    markets: markets,
    assets: assets,
  });
}

const markets: DeployedMarkets = {
  USDC: {
    marketAddress:
      '0xa42a086b357cdb5ee3e7b981ea67768e38a5b6db4db35ca4dbab32ab60f48475',
    startBlock: BigInt(11380000),
  },
  USDT: {
    marketAddress:
      '0x44daa228d84335bf2e17b1af1cf7f9de73266977affe6c3445f08bd07a2b0d5d',
    startBlock: BigInt(11380000),
  },
};

const assets: Record<string, string> = {
  '0x3aced3c270121c9d85e00fb14f079ecc666b733b12a0d15df1c2ecae26c1167a': 'USDC',
  '0xc264acd28eaf6f33e0e13360a37741dc91221aaa8817e1b4e462d61bb08c5835': 'USDT',
  '0xf8f8b6283d7fa5b672b530cbb84fcccb4ff8dc40f8176ef4544ddb1f1952ad07': 'ETH',
  '0x506442d6926065fe53dd09870b7392dd46bfe39b761ab347b11cc2e1f8874250': 'BTC',
  '0xa95097d8fe21970639e543db9b7f590aa678f325bce3dbc12a682cdcbbfae378': 'UNI',
  '0xf3e2b3960e0930402a5d6047883f5c178a30aa5db2f0d7302d582cefb59a1575': 'BTC',
  '0x790d2c0eb869e72cf42540d928ce728c253142d5ef07ed22b75009e40660e4ea': 'BNB',
  '0x24dd639420a98a5d9d3015280e82cafefb3b88d75f996107d1a3b12da831f733': 'ezETH',
};
