import { EthChainId, getProvider } from "@sentio/sdk/eth";

export const TOKEN_DECIMALS = 18;

export const configs = [
  // {
  //   network: EthChainId.BOB,
  //   address: "0xe714576abA1d46F54BD00ceb04c4B9c384e054ea",
  // },
  // {
  //   network: EthChainId.MODE,
  //   address: "0x6A0d9584D88D22BcaD7D4F83E7d6AB7949895DDF",
  // },
  // {
  //   network: EthChainId.LINEA,
  //   address: "0x67492784Ec588681e55b2BFC0118d882a8F23E48",
  // },
  {
    network: EthChainId.MANTA_PACIFIC,
    address: "0x71384B2c17433Ba1D8F6Fe895E9B2E7953dCED68",
    rnpTokenAddress: "0x2d391C26b02B97C7cDc3B08B50eDC69fAC92820b",
    rnpTokenStartBlock: await getCreationBlock(
      EthChainId.MANTA_PACIFIC,
      "0x2d391C26b02B97C7cDc3B08B50eDC69fAC92820b"
    ),
  },
  // {
  //   network: EthChainId.SCROLL,
  //   address: "0xE5C40a3331d4Fb9A26F5e48b494813d977ec0A8E",
  // },
  // {
  //   network: EthChainId.ZKLINK_NOVA,
  //   address: "0x8c4ba925D899ccde6d3657fcd9416c819EDbef97",
  // },
  // {
  //   network: EthChainId.B2_MAINNET,
  //   address: "0x8b03af6CA293FeE5A64497B8D50A5186a5BEcAA9",
  // }
];

export function getConfig(chainId: EthChainId) {
  return configs.find((config) => config.network === chainId);
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
