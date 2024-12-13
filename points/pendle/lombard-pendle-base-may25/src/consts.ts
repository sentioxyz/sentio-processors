import { addressTypeFromJSON } from "@sentio/sdk";
import { EthChainId } from "@sentio/sdk/eth";

export const CONFIG = {
  BLOCKCHAIN: EthChainId.BASE,
};

export const MISC_CONSTS = {
  ONE_E18: BigInt("1000000000000000000"),
  ONE_HOUR_IN_MINUTE: 60,
  ZERO_ADDRESS: "0x0000000000000000000000000000000000000000",
  MULTICALL_BATCH: 256,
};

export const DAILY_POINTS = 1000
export const MULTIPLIER = 3

export const PENDLE_POOL_ADDRESSES = {
  // retrieved from Pendle pool contract readTokens()
  SY: "0xb261266cb30c255cb9c73ebf4a3ead9398d23ab4",
  // retrieved from Pendle pool contract readTokens()
  YT: "0x5fd84c3dd5c00ab9e04bd94685b55e8dd0c1e3fd",
  // using new pool contract
  LP: "0x727cebacfb10ffd353fc221d06a862b437ec1735",
  SY_START_BLOCK: 22920572,
  // the block which the new contract is deployed
  START_BLOCK: 22920673,
  MARKET_EXPIRY: 1748476800,
  TREASURY: "0xc328dfcd2c8450e2487a91daa9b75629075b7a43",


  EQB_STAKING: "0x2583a2538272f31e9a15dd12a432b8c96ab4821d",
  EQB_RECEIPT_TOKEN: "0xba0f08909af43ed21ac54d44ff863835f22addf0",
  EQB_START_BLOCK: 20883300,

  // PENPIE_START_BLOCK: ,
  // PENPIE_RECEIPT_TOKEN: "",

  // STAKEDAO_RECEIPT_TOKEN: "",
  // STAKEDAO_START_BLOCK: ,

  MULTICALL: "0xca11bde05977b3631167028862be2a173976ca11",
  LIQUID_LOCKERS: [
    // {
    //   // penpie
    //   address: "",
    //   receiptToken: "",
    // },
    {
      // EQB
      address: "0x2583a2538272f31e9a15dd12a432b8c96ab4821d",
      receiptToken: "0xba0f08909af43ed21ac54d44ff863835f22addf0",
    },
    // {
    //   // stakeDAO
    //   address: "",
    //   receiptToken: "",
    // }
  ]
}
