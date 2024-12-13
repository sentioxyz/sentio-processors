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

export const DAILY_POINTS = 1000
export const MULTIPLIER = 3

export const PENDLE_POOL_ADDRESSES = {
  // retrieved from Pendle pool contract readTokens()
  SY: "0x9d6ec7a7b051b32205f74b140a0fa6f09d7f223e",
  // retrieved from Pendle pool contract readTokens()
  YT: "0x1cae47aa3e10a77c55ee32f8623d6b5acc947344",
  // using new pool contract
  LP: "0xcae62858db831272a03768f5844cbe1b40bb381f",
  SY_START_BLOCK: 20712286,
  // the block which the new contract is deployed
  START_BLOCK: 20712332,
  TREASURY: "0xc328dfcd2c8450e2487a91daa9b75629075b7a43",


  EQB_STAKING: "0x64627901dadb46ed7f275fd4fc87d086cff1e6e3",
  EQB_RECEIPT_TOKEN: "0x08cef7af62cdc92246515a81e87cc7da633cc8b6",
  EQB_START_BLOCK: 20728094,

  PENPIE_START_BLOCK: 20919482,
  PENPIE_RECEIPT_TOKEN: "0xa8DaF5Fef4d4f5620dF1BC8a72F71F4539691Fd4",

  STAKEDAO_RECEIPT_TOKEN: "0xa0db137445f4c8db1d4609884bc53d9e4a05bc0c",
  STAKEDAO_START_BLOCK: 20769037,

  MULTICALL: "0xca11bde05977b3631167028862be2a173976ca11",
  LIQUID_LOCKERS: [
    {
      // penpie
      address: "0x6e799758cee75dae3d84e09d40dc416ecf713652",
      receiptToken: "0xa8DaF5Fef4d4f5620dF1BC8a72F71F4539691Fd4",
    },
    {
      // EQB
      address: "0x64627901dadb46ed7f275fd4fc87d086cff1e6e3",
      receiptToken: "0x08cef7af62cdc92246515a81e87cc7da633cc8b6",
    },
    {
      // stakeDAO
      address: "0xd8fa8dc5adec503acc5e026a98f32ca5c1fa289a",
      receiptToken: "0xa0db137445f4c8db1d4609884bc53d9e4a05bc0c",
    }
  ]
}
