import { EthChainId, getProvider } from "@sentio/sdk/eth";
import { getERC20Contract } from "@sentio/sdk/eth/builtin/erc20";
import { getAlgebraPoolContract } from "./types/eth/algebrapool.js";

export interface PoolInfo {
  address: string;
  token0: string;
  token0Decimals: number;
  token1: string;
  token1Decimals: number;
  tickSpacing: number;
}

export const NETWORK = EthChainId.LINEA;
export const NONFUNGIBLE_POSITION_MANAGER_CONTRACT =
  "0x5D3D9E20ad27dd61182505230D1bD075bd249E4B";

const POOL_ADDRESSES = [
  "0x0eb7deb69d6b9296f3536776aae1420ff3b87da3",
  "0x9c78036ea1fc883a9a2dc2ec4bafed4f27fbccb3",
  "0xde925362524d1891e3c6e03a6c7f4ea0c3d8e8b9",
  "0xa85351f0e74c7ef3efd7b18c24ad3feb91297980",
  "0x87b03e34bcdb8dfdd943d486c9141ed1a16543c7",
];

export const configs: PoolInfo[] = await Promise.all(
  POOL_ADDRESSES.map(async (address) => {
    const c = getAlgebraPoolContract(NETWORK, address);
    const [token0, token1, tickSpacing] = await Promise.all([
      c.token0(),
      c.token1(),
      c.tickSpacing()
    ]);
    return {
      address,
      token0,
      token0Decimals: Number(await getERC20Contract(NETWORK, token0).decimals()),
      token1,
      token1Decimals: Number(await getERC20Contract(NETWORK, token1).decimals()),
      tickSpacing: Number(tickSpacing),
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

export const STONE_ADDRESS = "0x93F4d0ab6a8B4271f4a28Db399b5E30612D21116";

export function isStone(address: string) {
    return address.toLowerCase() === STONE_ADDRESS.toLowerCase();
}