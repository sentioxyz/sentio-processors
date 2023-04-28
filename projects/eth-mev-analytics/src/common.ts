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
      "0x9008D19f58AAbD9eD0D60971565AA8510560ab41".toLowerCase(), // GPLv2
      "0xDEF171Fe48CF0115B1d80b88dc8eAB59176FEe57", // paraswap v5
      "0xb46Fb07b0c80DBC3F97cae3BFe168AcaD46dF507", // zenbull
      "0x3DdC956B08c0A6dA2249f8c528fF0594F5AEa381", // zber
      "0x36b49ebf089be8860d7fc60f2553461e9cc8e9e2", // yearngate/timeless
      "0x6753f23905f15376429e6f0c381fcc4862e48222", // pcvxzaps strategy
    ]),
  },
];
