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
export const inETH_ADDRESS = "0x5a7a183b6b44dc4ec2e3d2ef43f98c5152b1d76d";

const POOL_ADDRESSES = [
  "0xbbe42b34ea1bca170222be0791bd09dd624180ff"
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

export function isInETH(address: string) {
  return address.toLowerCase() === inETH_ADDRESS.toLowerCase();
}