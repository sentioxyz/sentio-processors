import { CHAIN_IDS } from "@sentio/sdk";

export interface ChainConstants {
  chainID: string;
  nativeTokenWrappedAddress: string;
  builderAddresses: Set<string>;
  blackListedAddresses: Set<string>;
}

export const chainConfigs = [
  {
    chainID: CHAIN_IDS.ETHEREUM,
    nativeTokenWrappedAddress: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
    builderAddresses: new Set<string>([
      "0x95222290DD7278Aa3Ddd389Cc1E1d165CC4BAfe5".toLowerCase(), // beaver
      "0xDAFEA492D9c6733ae3d56b7Ed1ADB60692c98Bc5".toLowerCase(), // flashbots
      "0x690B9A9E9aa1C9dB991C7721a92d351Db4FaC990".toLowerCase(), // builder0x69
    ]),
    blackListedAddresses: new Set<string>([
      "0xB33af361843357E05B6Df3e45ae3B5CEc8E01137".toLowerCase(), // dsproxy
      "0x9008D19f58AAbD9eD0D60971565AA8510560ab41".toLowerCase(), // GPLv2
    ]),
  },
];
