import { CHAIN_IDS } from "@sentio/sdk";

export interface ChainConstants {
  chainID: string;
  nativeTokenWrappedAddress: string;
  blackListedAddresses: Set<string>;
}

export const chainConfigs = [
  {
    chainID: CHAIN_IDS.ETHEREUM,
    nativeTokenWrappedAddress: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
    blackListedAddresses: new Set<string>([
      "0xB33af361843357E05B6Df3e45ae3B5CEc8E01137".toLowerCase(), // dsproxy
      "0xE2f05BBE81Cfcb79d0D8C39F706a5416ad845EE0".toLowerCase(), // another ds proxy
      "0x67e5Dbe8b910b307Adfee1C119C63f417101300B".toLowerCase(), // another ds proxy
      "0x9008D19f58AAbD9eD0D60971565AA8510560ab41".toLowerCase(), // GPLv2
      "0xDEF171Fe48CF0115B1d80b88dc8eAB59176FEe57".toLowerCase(), // paraswap v5
      "0xb46Fb07b0c80DBC3F97cae3BFe168AcaD46dF507".toLowerCase(), // zenbull
      "0x3DdC956B08c0A6dA2249f8c528fF0594F5AEa381".toLowerCase(), // zber
      "0x36b49ebf089be8860d7fc60f2553461e9cc8e9e2".toLowerCase(), // yearngate/timeless
      "0x6753f23905f15376429e6f0c381fcc4862e48222".toLowerCase(), // pcvxzaps strategy
      "0x9a5132e149c547f254c73226da7f770d43d9ea44".toLowerCase(), // smardex
      "0x7a250d5630b4cf539739df2c5dacb4c659f2488d".toLowerCase(), // uniswap v2 router
      "0x71f6C4AEe7741cd7434353a98eC31B298d642Eed".toLowerCase(), // convex staking proxy
    ]),
  },
];
