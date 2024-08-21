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

export const NETWORK = EthChainId.MANTA_PACIFIC;
export const UNISWAP_V3_FACTORY = "0x5bd1f6735b80e58aac88b8a94836854d3068a13a";
export const NONFUNGIBLE_POSITION_MANAGER_CONTRACT =
  "0xe77e3F98a386a4C8f8c706A2aCfFdf57e70D06c6";

const POOL_ADDRESSES = [
  "0x02b25ffb7269fc167f8959de9a1bcd4213c06aaf",
  "0xed3fbcfa626947a6970c62c41514d1d802fe42e9",
  "0xe94e24db9ee7b3f3a443392f1e4d16b70763211b",
  "0xc60b2cF874638Ce45A6ed03E6e164b537387324c",
  "0xA0F00ee36bdE3318a4F226f64AAf93E463D8A6C4",
  "0xF1465d9377407AA2Da59aC3A1160199E5ba5b407",
  "0x6a6B95267722d59c6efCd4644D6f84987256a9a8",
  "0xA0f847CB93127eF21fC43C0e8611B7E529C96E2d",
  "0x6b4506a5aCe59697B9Ed3A40A41ca3acd391175a",
  "0x1bc27509F33299784Fae67eC273a240c9DB4bc92",
  "0x10b47Eb6E4C9066Ad2956A613B3d2A2C9D3038e7",
  "0x9DeDfD6A9D14b6203e30F4d2c2B5D74cacb4861a",
  "0x29760945A72a6C42Bbe431762F9cebe872889c80",
  "0x5D29609d122c7518f01C2b0117E0aA99eA545666",
  "0x014644Ba11a8bDF9A616562A830FF9E963D55681",
  "0xbA16538faFa2dC89356df383FA5831b5fDceF6d3",
  "0x6887f8187B4F946cE29d04BD9Aa78D96875a9858",
  "0x49c321f936b9D539899E523c31B52845465ad2a7",
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

export const STONE_ADDRESS = "0xEc901DA9c68E90798BbBb74c11406A32A70652C3";

export function isStone(address: string) {
    return address.toLowerCase() === STONE_ADDRESS.toLowerCase();
}