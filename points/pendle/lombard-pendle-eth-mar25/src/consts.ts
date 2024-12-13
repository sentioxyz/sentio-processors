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
  SY: "0xc781c0cc527cb8c351be3a64c690216c535c6f36",
  // retrieved from Pendle pool contract readTokens()
  YT: "0x1e30afeb27c0544f335f8aa21e0a9599c273823a",
  // using new pool contract
  LP: "0x70b70ac0445c3ef04e314dfda6caafd825428221",
  SY_START_BLOCK: 20861069,
  // the block which the new contract is deployed
  START_BLOCK: 20861085,
  TREASURY: "0xc328dfcd2c8450e2487a91daa9b75629075b7a43",


  EQB_STAKING: "0x64627901dadb46ed7f275fd4fc87d086cff1e6e3",
  EQB_RECEIPT_TOKEN: "0xafd39d1ee745b3a8963dd73a94cf055a19346b20",
  EQB_START_BLOCK: 20883300,

  PENPIE_START_BLOCK: 20927198,
  PENPIE_RECEIPT_TOKEN: "0x5d7f9e58f1ea4cedf5ae08ee81c2782ae8643d53",

  // STAKEDAO_RECEIPT_TOKEN: "",
  // STAKEDAO_START_BLOCK: ,

  MULTICALL: "0xca11bde05977b3631167028862be2a173976ca11",
  LIQUID_LOCKERS: [
    {
      // penpie
      address: "0x6e799758cee75dae3d84e09d40dc416ecf713652",
      receiptToken: "0x5d7f9e58f1ea4cedf5ae08ee81c2782ae8643d53",
    },
    {
      // EQB
      address: "0x64627901dadb46ed7f275fd4fc87d086cff1e6e3",
      receiptToken: "0xafd39d1ee745b3a8963dd73a94cf055a19346b20",
    },
    {
      // stakeDAO
      address: "0xd8fa8dc5adec503acc5e026a98f32ca5c1fa289a",
      receiptToken: "0xa0db137445f4c8db1d4609884bc53d9e4a05bc0c",
    }
  ]
}
