import { EthChainId } from "@sentio/sdk/eth";

export const aquaPools = [
  {
    network: EthChainId.SCROLL,
    address: "0x3E8AC5264Bac40A0E66E5ea7e191Be7a39816966",
    token0IsStone: false,
  },
  {
    network: EthChainId.SCROLL,
    address: "0x36E6D734526a2C2c9aA770F6a75784398862D9eb",
    token0IsStone: false,
  },
  {
    network: EthChainId.LINEA,
    address: "0x67DB8f96bd1B0D4B2c61FB6B8A6C163a69bF8120",
    token0IsStone: true,
  },
];

export const classicPools = [
  {
    network: EthChainId.SCROLL,
    address: "0xaBBeFBC71C72c7114fc6A9701f3C0c7D87Ca279F",
    token0IsStone: false,
  },
];

export function getStoneIndex(pool: string): number | undefined {
  for (const config of aquaPools) {
    if (config.address.toLowerCase() === pool.toLowerCase()) {
      return config.token0IsStone ? 0 : 1;
    }
  }
  for (const config of classicPools) {
    if (config.address.toLowerCase() === pool.toLowerCase()) {
      return config.token0IsStone ? 0 : 1;
    }
  }
  return undefined;
}
