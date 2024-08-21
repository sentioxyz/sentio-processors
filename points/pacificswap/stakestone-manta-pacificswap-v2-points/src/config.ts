import { EthChainId, getProvider } from "@sentio/sdk/eth";
import { getERC20Contract } from "@sentio/sdk/eth/builtin/erc20";
import { getPancakePairContract } from "./types/eth/pancakepair.js";

export interface PoolInfo {
  address: string;
  token0: string;
  token0Decimals: number;
  token1: string;
  token1Decimals: number;
}

export const NETWORK = EthChainId.MANTA_PACIFIC;
export const STONE_ADDRESS = "0xEc901DA9c68E90798BbBb74c11406A32A70652C3";
export const TOKEN_DECIMALS = 18;

const POOL_ADDRESSES = [
  "0x290008f512fc28f3fed4311dac0b5579161a7c5e",
  "0x0008669754f8d4b6bc0c5d54c76d289d942849c4",
  "0x5837a72630c21a93ec7d2c3aca97bc58f4017da0",
  "0x5865bb662c384c29d57303e58e1b6431869c95fe",
  "0x68cd04735375c004c555826bd6d9e854741a6f7b",
  "0xa5d62712c0aa1fe59d15990d1364df0e8e882822",
  "0xa6d8d22d5b8b082662704336cc2f5957765f3a76",
  "0xdebadad875dcbbc51a19b2e5a34b25cd5ef43757",
];

export const configs: PoolInfo[] = await Promise.all(
  POOL_ADDRESSES.map(async (address) => {
    const c = getPancakePairContract(NETWORK, address);
    const [token0, token1] = await Promise.all([c.token0(), c.token1()]);
    if (!isStone(token0) && !isStone(token1)) {
      throw new Error(`pool not related: ${address}`);
    }
    return {
      address,
      token0,
      token0Decimals: Number(
        await getERC20Contract(NETWORK, token0).decimals()
      ),
      token1,
      token1Decimals: Number(
        await getERC20Contract(NETWORK, token1).decimals()
      ),
    };
  })
);

export const POOL_START_BLOCK = Math.min(
  ...(await Promise.all(
    POOL_ADDRESSES.map((address) => getCreationBlock(NETWORK, address))
  ))
);

export function getPoolInfo(address: string) {
  return configs.find(
    (config) => config.address.toLowerCase() === address.toLowerCase()
  );
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

export function isStone(address: string) {
  return address.toLowerCase() === STONE_ADDRESS.toLowerCase();
}
