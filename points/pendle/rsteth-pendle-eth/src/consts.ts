import { addressTypeFromJSON } from "@sentio/sdk";
import { EthChainId } from "@sentio/sdk/eth";

export const CONFIG = {
  BLOCKCHAIN: EthChainId.ETHEREUM,
};

export const MISC_CONSTS = {
  ONE_E18: BigInt("1000000000000000000"),
  ONE_DAY_IN_MINUTE: 60 * 24,
  ZERO_ADDRESS: "0x0000000000000000000000000000000000000000",
  MULTICALL_BATCH: 256,
};

export const MELLOW_MULTIPLIER = 2n

export const PENDLE_POOL_ADDRESSES = {
  // retrieved from Pendle pool contract readTokens()
  SY: "0x553cD5e6D2072723f5FE5457576Ed6D06b0905b2",
  // retrieved from Pendle pool contract readTokens()
  YT: "0xF04f1F279C9dA038b917538D89947f0E00672487",
  // using new pool contract
  LP: "0xa96febd6c5faf7739d3149bfb43211ec6844a37c",
  SY_START_BLOCK: 20122412,
  // the block which the new contract is deployed
  START_BLOCK: 20125483,
  TREASURY: "0x8270400d528c34e1596ef367eedec99080a1b592",
  PENPIE_RECEIPT_TOKEN: "0x2038dc1CCA0E6bCdCB8B94Fb8b8ADDfcc6812Cf9",
  PENPIE_START_BLOCK: 20146235,

  EQB_STAKING: "0x64627901dadb46ed7f275fd4fc87d086cff1e6e3",
  EQB_RECEIPT_TOKEN: "0x7504115f3feCe387D95521FA2E5c533bda88f998",
  EQB_START_BLOCK: 20139245,

  STAKEDAO_RECEIPT_TOKEN: "0x395c5271f660fb88162e817a84d5703686d9b69e",
  STAKEDAO_START_BLOCK: 20133363,

  MULTICALL: "0xca11bde05977b3631167028862be2a173976ca11",
  LIQUID_LOCKERS: [
    {
      // Penpie
      address: "0x6e799758cee75dae3d84e09d40dc416ecf713652",
      receiptToken: "0xca11bde05977b3631167028862be2a173976ca11",
    },
    {
      // EQB
      address: "0x64627901dadb46ed7f275fd4fc87d086cff1e6e3",
      receiptToken: "0x7504115f3feCe387D95521FA2E5c533bda88f998",
    },
    {
      // StakeDAO
      address: "0xd8fa8dc5adec503acc5e026a98f32ca5c1fa289a",
      receiptToken: "0x395c5271f660fb88162e817a84d5703686d9b69e"
    }
  ],
};
