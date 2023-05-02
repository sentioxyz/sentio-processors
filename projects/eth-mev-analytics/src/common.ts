import { CHAIN_IDS } from "@sentio/sdk";

export interface ChainConstants {
  chainID: string;
  nativeTokenWrappedAddress: string;
  blackListedAddresses: Set<string>;
  mintBurnAddr: Set<string>;
  phalconChain: string;
}

export const chainConfigs = [
  {
    chainID: CHAIN_IDS.ETHEREUM,
    nativeTokenWrappedAddress:
      "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2".toLowerCase(),
    blackListedAddresses: new Set<string>([
      "0xB33af361843357E05B6Df3e45ae3B5CEc8E01137".toLowerCase(), // dsproxy
      "0xE2f05BBE81Cfcb79d0D8C39F706a5416ad845EE0".toLowerCase(), // another ds proxy
      "0x67e5Dbe8b910b307Adfee1C119C63f417101300B".toLowerCase(), // another ds proxy
      "0x4000235A519e9728a9AAda6872cB8F152b7Abe47".toLowerCase(), // another ds proxy
      "0x9008D19f58AAbD9eD0D60971565AA8510560ab41".toLowerCase(), // GPLv2
      "0xDEF171Fe48CF0115B1d80b88dc8eAB59176FEe57".toLowerCase(), // paraswap v5
      "0xb46Fb07b0c80DBC3F97cae3BFe168AcaD46dF507".toLowerCase(), // zenbull
      "0x3DdC956B08c0A6dA2249f8c528fF0594F5AEa381".toLowerCase(), // zber
      "0x36b49ebf089be8860d7fc60f2553461e9cc8e9e2".toLowerCase(), // yearngate/timeless
      "0x6753f23905f15376429e6f0c381fcc4862e48222".toLowerCase(), // pcvxzaps strategy
      "0x9a5132e149c547f254c73226da7f770d43d9ea44".toLowerCase(), // smardex
      "0x7a250d5630b4cf539739df2c5dacb4c659f2488d".toLowerCase(), // uniswap v2 router
      "0x71f6C4AEe7741cd7434353a98eC31B298d642Eed".toLowerCase(), // convex staking proxy
      "0x6A7efa964Cf6D9Ab3BC3c47eBdDB853A8853C502".toLowerCase(), // frax price index
      "0x541a2378589E280FDfDde6e53Fb5ECf98a853fC2".toLowerCase(), // timeless finance
      "0x455D80a02411F8fF918D10b4e6fb23fA5c225267".toLowerCase(), // instadapp
    ]),
    mintBurnAddr: new Set<string>([
      "0x0000000000000000000000000000000000000000",
      "0x35A398425d9f1029021A92bc3d2557D42C8588D7".toLowerCase(), // pirexCvx
      "0x7f39C581F595B53c5cb19bD0b3f8dA6c935E2Ca0".toLowerCase(), //lido
      "0xDcEF968d416a41Cdac0ED8702fAC8128A64241A2".toLowerCase(), //curve
    ]),
    phalconChain: "eth",
  },
  {
    chainID: CHAIN_IDS.POLYGON,
    nativeTokenWrappedAddress:
      "0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270".toLowerCase(),
    blackListedAddresses: new Set<string>([
      "0xa63D57042B2d462B8dcf1570F8288dba405Cc909".toLowerCase(), // tdex
      "0xBF65023BcF48Ad0ab5537Ea39C9242de499386c9".toLowerCase(), // yieldwolf vaults
      "0x8F5BBB2BB8c2Ee94639E55d5F41de9b4839C1280".toLowerCase(), // synapse bridge
    ]),
    mintBurnAddr: new Set<string>([
      "0x0000000000000000000000000000000000000000",
    ]),
    phalconChain: "polygon",
  },
];
