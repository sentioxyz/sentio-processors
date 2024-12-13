import { EthChainId, getProvider } from "@sentio/sdk/eth";
import { getERC20Contract } from "@sentio/sdk/eth/builtin/erc20";
import { getPancakeV3PoolContract } from "./types/eth/pancakev3pool.js";

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
  "0x5daC7eFE0b4Cd2CABdd350EFC0C69BCaa81e76c6";

const POOL_ADDRESSES = [
  "0xf44293edc40a5c3eb2045cbd53425a7ea8de1607",
  "0x8bc08e332e423c2a2773b0ce499eba36e4fc8857",
  "0xac62ca81b1b3642a868057a10a570d68871e909c",
  "0x5b3ba3f33c9888296a6e184aec38eb5c9b58df50",
  "0x3a12223a99c7f578382c1b1e69f23b51fa32d5a1",
  "0x908e5605bb87a50517785db85c955c3aa7d4125a",
  "0x996e2b492979440f4189c52906e8d81344a8efdf",
  "0x9b3229c33e34c437d0a888b460403e79c25cf89d",
];

export const configs: PoolInfo[] = await Promise.all(
  POOL_ADDRESSES.map(async (address) => {
    const c = getPancakeV3PoolContract(NETWORK, address);
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