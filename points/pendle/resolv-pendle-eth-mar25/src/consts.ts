import { addressTypeFromJSON } from "@sentio/sdk";
import { EthChainId } from "@sentio/sdk/eth";

export const CONFIG = {
  BLOCKCHAIN: EthChainId.ETHEREUM,
};

export const MISC_CONSTS = {
  ONE_E18: BigInt("1000000000000000000"),
  ONE_HOUR_IN_MINUTE: 60,
  ZERO_ADDRESS: "0x0000000000000000000000000000000000000000",
  MULTICALL_BATCH: 256,
};

export const DAILY_POINTS = 1
export const MULTIPLIER = 5 //hold wstUSR

export const PENDLE_POOL_ADDRESSES = {
  // retrieved from Pendle pool contract readTokens()
  SY: "0x6c78661c00D797C9c7fCBE4BCacbD9612A61C07f",
  // retrieved from Pendle pool contract readTokens()
  YT: "0xe0e034AfF49755e80b15594ce3A16d74d1a09b2F",
  // using new pool contract
  LP: "0x353d0b2efb5b3a7987fb06d30ad6160522d08426",
  SY_START_BLOCK: 21463529,
  // the block which the new contract is deployed
  START_BLOCK: 21463550,
  MARKET_EXPIRY: 1743033600,
  TREASURY: "0xc328dfcd2c8450e2487a91daa9b75629075b7a43",


  // EQB_STAKING: "0x2583a2538272f31e9a15dd12a432b8c96ab4821d",
  // EQB_RECEIPT_TOKEN: "0xba0f08909af43ed21ac54d44ff863835f22addf0",
  // EQB_START_BLOCK: 20883300,

  // PENPIE_START_BLOCK: ,
  // PENPIE_RECEIPT_TOKEN: "",

  // STAKEDAO_RECEIPT_TOKEN: "",
  // STAKEDAO_START_BLOCK: ,

  MULTICALL: "0xca11bde05977b3631167028862be2a173976ca11",

  //comment lp.ts logic
  LIQUID_LOCKERS: [
    // {
    //   // penpie
    //   address: "",
    //   receiptToken: "",
    // },
    // {
    //   // EQB
    //   address: "0x2583a2538272f31e9a15dd12a432b8c96ab4821d",
    //   receiptToken: "0xba0f08909af43ed21ac54d44ff863835f22addf0",
    // },
    // {
    //   // stakeDAO
    //   address: "",
    //   receiptToken: "",
    // }
  ]
}
