import { EthChainId, getProvider } from "@sentio/sdk/eth";

interface Config {
  network: EthChainId;
  aTokenAddress: string;
  debtTokenAddress?: string;
  rz0StoneAddress?: string;
  rz0StoneStartBlock?: number;
}

export const configs: Config[] = [
  {
    network: EthChainId.LINEA,
    aTokenAddress: "0xCCF76F25D5CC39DB7cd644A5A66eFf91b2cdcC25",
  },
  {
    network: EthChainId.MANTA_PACIFIC,
    aTokenAddress: "0x8d8b70a576113FEEdd7E3810cE61f5E243B01264",
    debtTokenAddress: "0x3Da71Ad7E055ee9716bBA4DaC53E37cDDF60D509",
    rz0StoneAddress: "0x53EC122D2644aEa125031f2055b862535Fe5e08a",
    rz0StoneStartBlock: await getCreationBlock(
      EthChainId.MANTA_PACIFIC,
      "0x53EC122D2644aEa125031f2055b862535Fe5e08a"
    ),
  },
];

export function getConfig(chainId: EthChainId) {
  return configs.find((config) => config.network === chainId);
}

export const STONE_DECIMALS = 18;

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
