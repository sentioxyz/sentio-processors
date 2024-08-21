import { EthChainId, getProvider } from "@sentio/sdk/eth";
import { getERC20Contract } from "@sentio/sdk/eth/builtin/erc20";
import { getFireflyV3PoolContract } from "./types/eth/fireflyv3pool.js";

export interface PoolInfo {
  address: string;
  token0: string;
  token0Decimals: number;
  token1: string;
  token1Decimals: number;
  fee: number;
}

export const NETWORK = EthChainId.MANTA_PACIFIC;
export const STONE_ADDRESS = "0xEc901DA9c68E90798BbBb74c11406A32A70652C3";
export const NONFUNGIBLE_POSITION_MANAGER_CONTRACT =
  "0x1f2c501d98880d4f4011276a89d302622a358068"; 

const POOL_ADDRESSES = [
  "0x5ebeb5262ba6a1dae85f517ca17284f2bb0d7126",
];

export const configs: PoolInfo[] = await Promise.all(
  POOL_ADDRESSES.map(async (address) => {
    const c = getFireflyV3PoolContract(NETWORK, address);
    const [token0, token1, fee] = await Promise.all([
      c.token0(),
      c.token1(),
      c.fee(),
    ]);
    if (!isStone(token0) && !isStone(token1)) {
      throw new Error(`invalid pool: ${address}`);
    }
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