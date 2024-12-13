import { EthChainId, getProvider } from "@sentio/sdk/eth";
import { getUniswapV3PoolContract } from "./types/eth/uniswapv3pool.js";
import { getERC20Contract } from "@sentio/sdk/eth/builtin/erc20";

export interface PoolInfo {
  address: string;
  token0: string;
  token0Decimals: number;
  token1: string;
  token1Decimals: number;
  fee: number;
}

export const NETWORK = EthChainId.SCROLL;
export const NONFUNGIBLE_POSITION_MANAGER_CONTRACT =
  "0x349B654dcbce53943C8e87F914F62ae9526C6681";
export const STONE_ADDRESS = "0x80137510979822322193fc997d400d5a6c747bf7";

const POOL_ADDRESSES = [
  "0xdf1f9ecbe147a1bdfd643e841211169c97f7eced",
  "0x4232d0927251c64c3e3cabcd0e464ccba055944e"
];

export const configs: PoolInfo[] = await Promise.all(
  POOL_ADDRESSES.map(async (address) => {
    const c = getUniswapV3PoolContract(NETWORK, address);
    const [token0, token1, fee] = await Promise.all([
      c.token0(),
      c.token1(),
      c.fee(),
    ]);
    return {
      address,
      token0,
      token0Decimals: Number(await getERC20Contract(NETWORK, token0).decimals()),
      token1,
      token1Decimals: Number(await getERC20Contract(NETWORK, token1).decimals()),
      fee: Number(fee),
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