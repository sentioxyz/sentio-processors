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
      "0x36b49ebf089be8860d7fc60f2553461e9cc8e9e2", // yearngate/timeless
    ]),
  },
];
