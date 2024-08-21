import { EthChainId, getProvider } from "@sentio/sdk/eth";

export const SBSTONE_DECIMALS = 8;
export const STONE_DECIMALS = 18;
export const EXCHANGE_RATE_DECIMALS = 18;

export const configs = [
  {
    network: EthChainId.BOB,
    address: "0x8dbf84c93727c85DB09478C83a8621e765D20eC2",
  },
  {
    network: EthChainId.MODE,
    address: "0x8EeA9ED0d547457fEF88fBF459BF8a18fb04d277",
  },
  {
    network: EthChainId.MANTA_PACIFIC,
    address: "0x033F5e084a627cC420980ED9B1476C84A92FC5D4",
    rnpTokenAddress: "0xECC4EBb767FC8F69A21e261b87255cD5A74f2812",
    rnpTokenStartBlock: await getCreationBlock(
      EthChainId.MANTA_PACIFIC,
      "0xECC4EBb767FC8F69A21e261b87255cD5A74f2812"
    ),
  },
  {
    network: EthChainId.B2_MAINNET,
    address: "0xD13bE8b716b18265e294831FCb1330d170840BB3"
  }
];

export function getConfig(chainId: EthChainId) {
  return configs.find((config) => config.network === chainId);
}

async function getCreationBlock(
  network: EthChainId,
  address: string
): Promise<number> {
  const provider = getProvider(network);
  let l = 0;
  let r = await provider.getBlockNumber();
  while (l < r) {
    const m = Math.floor((l + r) / 2);
    const code = await provider.getCode(address, m);
    if (code.length > 2) {
      r = m;
    } else {
      l = m + 1;
    }
  }
  return l;
}
