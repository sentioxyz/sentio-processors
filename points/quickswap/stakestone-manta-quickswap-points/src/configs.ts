import { EthChainId, getProvider } from "@sentio/sdk/eth";
import { getUniswapV3PoolContract } from "./types/eth/uniswapv3pool.js";

export interface PoolBaseInfo {
  address: string;
  token0: string;
  token1: string;
  fee: number;
  startBlock: number;
}

export const NETWORK = EthChainId.MANTA_PACIFIC;
export const NONFUNGIBLE_POSITION_MANAGER_ADDRESS =
  "0xa5E0829CaCEd8fFDD4De3c43696c57F7D7A678ff";
export const STONE_ADDRESS = "0xec901da9c68e90798bbbb74c11406a32a70652c3";

export const POOL_ADDRESSES = [
  "0x1a6378383258A5D8AE40d383200AE29C53e85AF9",
  "0xa5540ABc0Be0e9e7731b770d0d1CB2D3e4250225",
  "0xA5101d48355d5D731c2bEDD273aA0Eb7ed55d0C7",
  "0x8294B6E9a5cE9d322B710C45d83E3A3cB1592199",
  "0x4164887b9E46e6d294408890688da398faCB6250",
  "0xE68E751ef5e89463B8CA7e909049FA50d7d1BcF5",
  "0x665B3941A7801900D8A9Cf0e6B5a3299D31AFd7B",
  "0x2958A4313d47Fc3E7E786D4F4c93219aE21fBB9D",
];

export const POOLS = Object.fromEntries(
  await Promise.all(
    POOL_ADDRESSES.map(async (address) => {
      const pool = getUniswapV3PoolContract(NETWORK, address);
      const token0 = await pool.token0();
      const token1 = await pool.token1();
      const fee = Number(await pool.fee());
      const startBlock = await getCreationBlock(NETWORK, address);
      return [
        address,
        <PoolBaseInfo>{ address, token0, token1, fee, startBlock },
      ];
    })
  )
) as Record<string, PoolBaseInfo>;

export const POOLS_START_BLOCK = Math.min(
  ...Object.values(POOLS).map((pool) => pool.startBlock)
);

console.log("init config", {
    POOL_ADDRESSES,
    POOLS,
    POOLS_START_BLOCK,
})

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
