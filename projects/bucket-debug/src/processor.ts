import {
  BUILTIN_TYPES,
  SuiNetwork,
  SuiObjectProcessor,
  SuiObjectProcessorTemplate,
} from "@sentio/sdk/sui";
import { fountain_core as old_fountain } from "./types/sui/old_fountain.js";
import { fountain_core as sbuck_fountain } from "./types/sui/sbuck_fountain.js";
import { fountain as strap_fountain } from "./types/sui/strap_fountain.js";
import { getPriceBySymbol } from "@sentio/sdk/utils";
import { normalizeSuiAddress } from "@mysten/sui.js/utils";
import { SuiMoveObject } from "@mysten/sui.js/client";
import {
  bucket_events,
  bucket,
  interest,
} from "./types/sui/0xce7ff77a83ea0cb6fd39bd8748e2ec89a3f41e8efdc3f4eb123e0ca37b184db2.js";
import { BigDecimal } from "@sentio/sdk";

const START_CHECKPOINT = 76_049_261;
const SUI_CHAIN_ID = 101;
const POOLS_TABLE = "Pools";
const POOL_SNAPSHOT_TABLE = "Pool_Snapshot";
const POSITION_SNAPSHOT_TABLE = "Position_Snapshot";
const PROTOCOL_TYPE = "CDP";
const BUCK_TYPE =
  "0xce7ff77a83ea0cb6fd39bd8748e2ec89a3f41e8efdc3f4eb123e0ca37b184db2::buck::BUCK";
const OUTPUT_VOL_TYPE =
  "0xc592cdefe5ad2d062b128b6a097983e9c40a742c50abb867a5821714a628457::bucket::OutputVolume";
const INTEREST_TABLE_TYPE =
  "0xd9162764da404339384fe40487499dc867c3f1fa3eb870381c41a8b41458b0e5::interest::InterestTable";

const UNSUPPORTED_SYMBOLS = [
  "FLOWX_STABLE_LP",
  "CETUS_STABLE_LP",
  "SCALLOP_STABLE_SCOIN",
];

type PoolType = "BUCKET" | "PIPE" | "PSM";

type PoolHeader = {
  name: string;
  poolId: string;
  poolType: PoolType;
};

type PoolInfo = {
  symbol: string;
  tokenAddress: string;
  balance: number;
};

type TokenInfo = {
  symbol: string;
  decimal: number;
  address: string;
};

export const POOLS: PoolHeader[] = [
  // BUCKET
  {
    name: "SUI",
    poolId:
      "0xca4f4781342cfd66ff8e3d52862c1c82c7c1dd641c142e368939ca0e0efbb3d2",
    poolType: "BUCKET",
  },
  // {
  //   name: "vSUI",
  //   poolId:
  //     "0xf8cdc2b3f4a7129f784c280f1025fd874764380d81b6a6f3709dfb63e84d9d90",
  //   poolType: "BUCKET",
  // },
  // {
  //   name: "afSUI",
  //   poolId:
  //     "0x7bae099fba3b32b5052ef98a53e3193c3497881c05a4ce13b603084a3dd10679",
  //   poolType: "BUCKET",
  // },
  // {
  //   name: "haSUI",
  //   poolId:
  //     "0x29919d2f47e27a075f6ddb099d03f6455a5595b5bcf7e30d3b30cd539b5c16f1",
  //   poolType: "BUCKET",
  // },
  // {
  //   name: "CETUS",
  //   poolId:
  //     "0x10e30ddaa454b9041378c84f6330075ee356b80e459e375898d348c1649fa1af",
  //   poolType: "BUCKET",
  // },
  // {
  //   name: "ETH",
  //   poolId:
  //     "0x15b017368a2f0f848b24a6925f99ce94a3a8dccda09c62f54813d137e5ebc5eb",
  //   poolType: "BUCKET",
  // },
  // {
  //   name: "USDY",
  //   poolId:
  //     "0x1de3c4f89ad80a33d4e02efe2965bfb3b35543a52b2588048f5b3fcbf702136f",
  //   poolType: "BUCKET",
  // },
  // {
  //   name: "NAVX",
  //   poolId:
  //     "0x7b613c12b423aa7085f47dc4aa9f5b85546f21cbf1fe2861f3834c08d288b670",
  //   poolType: "BUCKET",
  // },

  // // PSM
  // {
  //   name: "USDC",
  //   poolId:
  //     "0x0c2e5fbfeb5caa4c2f7c8645ffe9eca7e3c783536efef859be03146b235f9e04",
  //   poolType: "PSM",
  // },
  // {
  //   name: "USDT",
  //   poolId:
  //     "0x607e7d386e29066b964934e0eb1daa084538a79b5707c34f38e190d64e24923e",
  //   poolType: "PSM",
  // },
  // {
  //   name: "Scallop Stable sCoin",
  //   poolId:
  //     "0xe3a3ca38171458c6f310bc9b4ba5d7bff7850b190049dcdb1e89ddbd7893d528",
  //   poolType: "PSM",
  // },
  // {
  //   name: "Cetus Stable LP",
  //   poolId:
  //     "0xba86a0f37377844f38060a9f62b5c5cd3f8ba13901fa6c4ee5777c1cc535306b",
  //   poolType: "PSM",
  // },
  // {
  //   name: "FlowX Stable LP",
  //   poolId:
  //     "0xccdaf635eb1c419dc5ab813cc64c728a9f5a851202769e254f348bff51f9a6dc",
  //   poolType: "PSM",
  // },
];

POOLS.forEach((info, idx) => {
  SuiObjectProcessor.bind({
    objectId: info.poolId,
    network: SuiNetwork.MAIN_NET,
    startCheckpoint: BigInt(START_CHECKPOINT),
  }).onTimeInterval(
    async (self, dofs, ctx) => {
      console.log("self", JSON.stringify(self))
      console.log("dofs", JSON.stringify(dofs))

      const outputVolumeObj = await ctx.coder.getDynamicFields(
        dofs,
        bucket.OutputKey.type(),
        bucket.OutputVolume.type(),
      );
      console.log("outputVolumeObj", outputVolumeObj.length, JSON.stringify(outputVolumeObj))

    },
    1,
    1440,
    undefined,
    { owned: true },
  );
});

function getPackageId(str: string): string {
  return normalizeSuiAddress(str.split("::")[0]);
}

function getTokenInfo(tokenAddr: string): TokenInfo {
  const address = normalizeSuiAddress(tokenAddr);
  switch (address) {
    case normalizeSuiAddress("0x2"):
      return { symbol: "SUI", decimal: 9, address };
    case "0x549e8b69270defbfafd4f94e17ec44cdbdd99820b33bda2278dea3b9a32d3f55":
      return { symbol: "vSUI", decimal: 9, address };
    case "0xf325ce1300e8dac124071d3152c5c5ee6174914f8bc2161e88329cf579246efc":
      return { symbol: "afSUI", decimal: 9, address };
    case "0xbde4ba4c2e274a60ce15c1cfff9e5c42e41654ac8b6d906a57efa4bd3c29f47d":
      return { symbol: "haSUI", decimal: 9, address };
    case "0x06864a6f921804860930db6ddbe2e16acdf8504495ea7481637a1c8b9a8fe54b":
      return { symbol: "CETUS", decimal: 9, address };
    case "0x960b531667636f39e85867775f52f6b1f220a058c4de786905bdf761e06a56bb":
      return { symbol: "USDY", decimal: 6, address };
    case "0xaf8cd5edc19c4512f4259f0bee101a40d41ebed738ade5874359610ef8eeced5":
      return { symbol: "ETH", decimal: 8, address };
    case "0xa99b8952d4f7d947ea77fe0ecdcc9e5fc0bcab2841d6e2a5aa00c3044e5544b5":
      return { symbol: "NAVX", decimal: 9, address };
    case "0xc060006111016b8a020ad5b33834984a437aaa7d3c74c18e09a95d48aceab08c":
      return { symbol: "USDT", decimal: 6, address };
    case "0x8d1aee27f8537c06d19c16641f27008caafc42affd2d2fb7adb96919470481ec":
      return { symbol: "CETUS_STABLE_LP", decimal: 9, address };
    case "0xcffc684610db2d1956cfb25858678be8ea96d2766b4c756d4096abd38461f40a":
      return { symbol: "FLOWX_STABLE_LP", decimal: 6, address };
    case "0x08a7a3c873402d7cf9d44192aae337e0b27a72c2a4a230d10230488cf614c5a2":
      return { symbol: "SCALLOP_STABLE_SCOIN", decimal: 6, address };
    default:
      return { symbol: "USDC", decimal: 6, address };
  }
}

function getTypeArgs(moveType: string): string[] {
  return moveType
    .slice(moveType.indexOf("<") + 1, moveType.lastIndexOf(">"))
    .split(",")
    .map((t) => t.trim());
}

export function getPoolInfo(obj: SuiMoveObject, pType: PoolType): PoolInfo {
  const coinTypes = getTypeArgs(obj.type);
  const tokenAddr = getPackageId(coinTypes[0]);
  const { symbol, decimal, address: tokenAddress } = getTokenInfo(tokenAddr);
  let balance = 0;
  if (pType === "BUCKET") {
    balance = Number((obj.fields as any).collateral_vault) / 10 ** decimal;
  } else if (pType === "PSM") {
    balance = Number((obj.fields as any).pool) / 10 ** decimal;
  }
  return { symbol, tokenAddress, balance };
}

export function formatDate(d: Date): string {
  return d.toISOString().split("T")[0];
}

function getPoolAddress(symbol: string): string {
  return (
    POOLS.find((pool) => pool.name === symbol)?.poolId ??
    "0xca4f4781342cfd66ff8e3d52862c1c82c7c1dd641c142e368939ca0e0efbb3d2"
  );
}
