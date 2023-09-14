import { EthChainId } from "@sentio/sdk/eth";
export interface ChainConstants {
  chainID: EthChainId;
  nativeTokenWrappedAddress: string;
  blackListedAddresses: Set<string>;
  mintBurnAddr: Set<string>;
  phalconChain: string;
  watchSpam: Set<string>;
}

export const chainConfigs = [
  {
    chainID: EthChainId.ETHEREUM,
    nativeTokenWrappedAddress:
      "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2".toLowerCase(),
    blackListedAddresses: new Set<string>([
      "0x1D6DEdb49AF91A11B5C5F34954FD3E8cC4f03A86".toLowerCase(), // df saver recipe
      "0x619Ad2D02dBeE6ebA3CDbDA3F98430410e892882".toLowerCase(), // insta aggregator
      "0x9008D19f58AAbD9eD0D60971565AA8510560ab41".toLowerCase(), // CoW settlement
      "0x3D6f08ae8C2931E27e95811E42F5d70164759a94".toLocaleLowerCase(), // DefiEdge
    ]),
    mintBurnAddr: new Set<string>([
      "0x0000000000000000000000000000000000000000",
      "0x35A398425d9f1029021A92bc3d2557D42C8588D7".toLowerCase(), // pirexCvx
      "0x7f39C581F595B53c5cb19bD0b3f8dA6c935E2Ca0".toLowerCase(), //lido
      "0xDcEF968d416a41Cdac0ED8702fAC8128A64241A2".toLowerCase(), //curve
      "0xbEbc44782C7dB0a1A60Cb6fe97d0b483032FF1C7".toLowerCase(), // curve
      "0xF014FEF41cCB703975827C8569a3f0940cFD80A4".toLowerCase(), // token manager
      "0xbAFA44EFE7901E04E39Dad13167D089C559c1138".toLowerCase(), // frax minter
      "0x0A59649758aa4d66E25f08Dd01271e891fe52199".toLowerCase(), // maker
    ]),
    phalconChain: "eth",
    watchSpam: new Set<string>([]),
  },
  {
    chainID: EthChainId.POLYGON,
    nativeTokenWrappedAddress:
      "0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270".toLowerCase(),
    blackListedAddresses: new Set<string>([
      "0xa63D57042B2d462B8dcf1570F8288dba405Cc909".toLowerCase(), // tdex
      "0xBF65023BcF48Ad0ab5537Ea39C9242de499386c9".toLowerCase(), // yieldwolf vaults
      "0x8F5BBB2BB8c2Ee94639E55d5F41de9b4839C1280".toLowerCase(), // synapse bridge
      "0x2967E7Bb9DaA5711Ac332cAF874BD47ef99B3820".toLowerCase(), // sodimanod
      "0xDef1C0ded9bec7F1a1670819833240f027b25EfF".toLowerCase(), // 0xproxy
      "0xB77EC71C90A533719df75bc6a209f7fB3e936EEd".toLowerCase(), //strategy
      "0xa5e0829caced8ffdd4de3c43696c57f7d7a678ff".toLowerCase(), // router
      "0x1E8ae092651e7B14e4D0f93611267c5Be19B8b9F".toLowerCase(), // settlement
    ]),
    mintBurnAddr: new Set<string>([
      "0x0000000000000000000000000000000000000000",
    ]),
    phalconChain: "polygon",
    watchSpam: new Set<string>([
      "0xefA413DE95fD661346C6dE01342b4779Df2dd517".toLowerCase(),
      "0xED8dD4384c309bD57aAD10789740F865B1CAea91".toLowerCase(),
      "0x458df878cae2174a294b907df6d4235fa59eaa44".toLowerCase(),
      "0xce6314f881c05f64c89b0f6520c0286f0ac91f8f".toLowerCase(),
      "0xefa413de95fd661346c6de01342b4779df2dd517".toLowerCase(),
      "0xe9324ca2d46f651ec16289f518b1392cf90d6d77".toLowerCase(),
      "0x41139bd34ff2d438480d3e73c360a5e915c79a64".toLowerCase(),
    ]),
  },
  {
    chainID: EthChainId.AVALANCHE,
    nativeTokenWrappedAddress:
      "0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7".toLowerCase(),
    blackListedAddresses: new Set<string>([
      "0xaCd4428f8c183edA30d102Da3646C070bC7469Eb".toLowerCase(), // glacier
      "0xC05e61d0E7a63D27546389B7aD62FdFf5A91aACE".toLowerCase(), // bridge
      "0x2967E7Bb9DaA5711Ac332cAF874BD47ef99B3820".toLowerCase(), //sodimanod
      "0xdef171fe48cf0115b1d80b88dc8eab59176fee57".toLowerCase(), // augustusSwapper
      "0x82147c5a7e850ea4e28155df107f2590fd4ba327".toLowerCase(), // gmx
    ]),
    mintBurnAddr: new Set<string>([
      "0x0000000000000000000000000000000000000000",
      "0x0974D9d3bc463Fa17497aAFc3a87535553298FbE".toLowerCase(), // curve
      "0x7f90122BF0700F9E7e1F688fe926940E8839F353".toLowerCase(), // curve
      "0xc09c12093b037866Bf68C9474EcDb5113160fBcE".toLowerCase(), // LP
      "0xb3c68d69E95B095ab4b33B4cB67dBc0fbF3Edf56".toLowerCase(), // ironbank
      "0x836648A8cE166Ba7CaFb27F0E6AD21d5C91b7774".toLowerCase(), // LP
      "0x06f01502327De1c37076Bea4689a7e44279155e9".toLowerCase(), // LP
    ]),
    phalconChain: "avax",
    watchSpam: new Set<string>([]),
  },
  {
    chainID: EthChainId.MOONBEAM,
    nativeTokenWrappedAddress:
      "0xAcc15dC74880C9944775448304B263D191c6077F".toLowerCase(),
    blackListedAddresses: new Set<string>([]),
    mintBurnAddr: new Set<string>([]),
    phalconChain: "moonbeam",
    watchSpam: new Set<string>([]),
  },
];
