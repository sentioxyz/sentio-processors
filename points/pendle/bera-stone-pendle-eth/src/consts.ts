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

export const WSTUSR_ADDRESS = "0x1202f5c7b4b9e47a1a484e8b270be34dbbc75055"

export const PENDLE_POOL_ADDRESSES = {
  // retrieved from Pendle pool contract readTokens()
  SY: "0xd7B2a47aC9236d9685B573a2428f72Ec45E97C45",
  // retrieved from Pendle pool contract readTokens()
  YT: "0x695e502eE8e39A128FB79e8D01230d15f368eA45",
  // using new pool contract
  LP: "0x7561C5CCfe41A26B33944B58C70D6a3CB63E881c",
  SY_START_BLOCK: 21623306,
  // the block which the new contract is deployed
  START_BLOCK: 21623332,
  MARKET_EXPIRY:1744243200,
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
