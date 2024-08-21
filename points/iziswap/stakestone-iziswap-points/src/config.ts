import { EthChainId, getProvider } from "@sentio/sdk/eth";
import { getIZiSwapPoolContract } from "./types/eth/iziswappool.js";

export const TOKEN_DECIMALS = 18;

export const stoneAddresses: Record<string, string> = {
  [EthChainId.MANTA_PACIFIC]: "0xEc901DA9c68E90798BbBb74c11406A32A70652C3",
  [EthChainId.SCROLL]: "0x80137510979822322193fc997d400d5a6c747bf7",
};

export const poolConfigs = [
  {
    network: EthChainId.MANTA_PACIFIC,
    startBlock: 0,
    tokenXIsStone: false,
    address: "0x5FE8B6Ed86703e66Ea727cD06C44ac5a6DF9076f",
  },
  {
    network: EthChainId.MANTA_PACIFIC,
    startBlock: 0,
    tokenXIsStone: false,
    address: "0x8f29c44F81c5680f186BC66D5C1Ba65e4A59bd8d",
  },
  {
    network: EthChainId.MANTA_PACIFIC,
    startBlock: 0,
    tokenXIsStone: false,
    address: "0xaDF7C870F943E676583CcF28aB154f8794D0d27F",
  },
  {
    network: EthChainId.MANTA_PACIFIC,
    startBlock: 0,
    tokenXIsStone: false,
    address: "0xb0A6C5Fac88b1D0F2CA6B1Df2dbB06FF0D227800",
  },
  {
    network: EthChainId.MANTA_PACIFIC,
    startBlock: 0,
    tokenXIsStone: false,
    address: "0xCECD2A1D6235597C031dda3322e2B78B5d067038",
  },
  {
    network: EthChainId.MANTA_PACIFIC,
    startBlock: 0,
    tokenXIsStone: false,
    address: "0x2E11f5F92d6370938f38B6d5E05c281Ff7173c3F",
  },
  {
    network: EthChainId.MANTA_PACIFIC,
    startBlock: 0,
    tokenXIsStone: false,
    address: "0xBbFb0CD11b9c76b726F25D00bBbF0b40845d360B",
  },
  {
    network: EthChainId.MANTA_PACIFIC,
    startBlock: 0,
    tokenXIsStone: false,
    address: "0x206e1d707e4eAEdCF92C71FB67E4e8371541BF65",
  },
  {
    network: EthChainId.MANTA_PACIFIC,
    startBlock: 0,
    tokenXIsStone: false,
    address: "0xf81099a057Be7ECD615cf85a85B51B26BE3e43fE",
  },
  {
    network: EthChainId.MANTA_PACIFIC,
    startBlock: 0,
    tokenXIsStone: false,
    address: "0xeCBD0C52F1cfb364F72eb84b29d4D0F1f068c328",
  },
  {
    network: EthChainId.MANTA_PACIFIC,
    startBlock: 0,
    tokenXIsStone: false,
    address: "0x5D70463E78Cc277bEaAd7Ad3f0eC220d06b616E6",
  },
  {
    network: EthChainId.MANTA_PACIFIC,
    startBlock: 0,
    tokenXIsStone: false,
    address: "0xEB1c3f071662fFC6C0475C54DB76e0223Aa358cE",
  },
  {
    network: EthChainId.MANTA_PACIFIC,
    startBlock: 0,
    tokenXIsStone: false,
    address: "0x2067217b63BB8218B5556b19119daee190e9fb70",
  },
  {
    network: EthChainId.MANTA_PACIFIC,
    startBlock: 0,
    tokenXIsStone: false,
    address: "0x9c2dDed2D2a63d7D1D421709e7fBb16a39749784",
  },
  {
    network: EthChainId.MANTA_PACIFIC,
    startBlock: 0,
    tokenXIsStone: false,
    address: "0x1c03c0C12E535bbDBABE2eF2680C0b35e889C13B",
  },
  {
    network: EthChainId.MANTA_PACIFIC,
    startBlock: 0,
    tokenXIsStone: false,
    address: "0xDf3Bb501899bE32dEF89bED7eBB1C23C5cC35340",
  },
  {
    network: EthChainId.SCROLL,
    startBlock: 0,
    tokenXIsStone: false,
    address: "0xfe9d23b57c189Bf12C3ba71b4FB3b66a2d3AB71d",
  },
];

export const liquidityManagerAddresses: Record<string, string> = {
  [EthChainId.MANTA_PACIFIC]: "0x19b683A2F45012318d9B2aE1280d68d3eC54D663",
  [EthChainId.SCROLL]: "0x1502d025BfA624469892289D45C0352997251728",
};

export function isRelatedPool(network: EthChainId, address: string) {
  return poolConfigs.some(
    (config) =>
      config.network === network &&
      config.address.toLowerCase() === address.toLowerCase()
  );
}

export function getPoolInfo(network: EthChainId, address: string) {
  return poolConfigs.find(
    (config) =>
      config.network === network &&
      config.address.toLowerCase() === address.toLowerCase()
  );
}

for (const config of poolConfigs) {
  const c = getIZiSwapPoolContract(config.network, config.address);
  const stoneAddress = stoneAddresses[config.network].toLowerCase();
  const tokenX = await c.tokenX();
  if (tokenX.toLowerCase() == stoneAddress) {
    config.tokenXIsStone = true;
  } else {
    const tokenY = await c.tokenY();
    if (tokenY.toLowerCase() != stoneAddress) {
      throw new Error(
        `pool not related, network: ${config.network}, address: ${config.address}`
      );
    }
  }
  const creationBlock = await getCreationBlock(config.network, config.address);
  config.startBlock = creationBlock;
}
console.log({ poolConfigs });

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
