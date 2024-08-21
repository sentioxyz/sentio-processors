import { EthChainId, getProvider } from "@sentio/sdk/eth";
import { getPairContract } from "./types/eth/pair.js";

export interface PoolInfo {
  address: string;
  token0: string;
  token1: string;
}

export const NETWORK = EthChainId.LINEA;

const POOL_ADDRESSES = [
  "0x8f3e0a2378b0b5838e0e0d99fcecc167d47bc9a7",
  "0x4d776eb578196ee0725bda3319b4fb615bbf0ac5",
  "0xcef24c763e79329f48756f5a76d08b650c6f2293",
];

export const gaugeMap: Record<string, { address: string; startBlock: number }> =
  {
    "0x8f3e0a2378b0b5838e0e0d99fcecc167d47bc9a7": {
      address: "0xB301DB65B71589d2fFDa38B2BECFBDdf584D538E",
      startBlock: await getCreationBlock(
        NETWORK,
        "0xB301DB65B71589d2fFDa38B2BECFBDdf584D538E"
      ),
    },
  };

export const configs: PoolInfo[] = await Promise.all(
  POOL_ADDRESSES.map(async (address) => {
    const c = getPairContract(NETWORK, address);
    const [token0, token1] = await Promise.all([c.token0(), c.token1()]);
    return {
      address,
      token0,
      token1,
    };
  })
);

export function getPoolInfo(address: string) {
  return configs.find(
    (config) => config.address.toLowerCase() === address.toLowerCase()
  );
}

export const STONE_ADDRESS = "0x93F4d0ab6a8B4271f4a28Db399b5E30612D21116";

export function isStone(address: string) {
  return address.toLowerCase() === STONE_ADDRESS.toLowerCase();
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
