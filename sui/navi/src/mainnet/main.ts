import { SuiContext, SuiObjectContext } from "@sentio/sdk/sui";
import { lending } from "../types/sui/0x834a86970ae93a73faf4fff16ae40bdb72b91c47be585fff19a2af60a19ddca3.js";
import { token } from "@sentio/sdk/utils";
import { ProtocolProcessor } from "./storage.js";
import { PoolProcessor } from "./pool.js";
import { OracleProcessor } from "./oracle.js";
import { AddressProcessor } from "./address.js";
import { FeeProcessor } from "./fee.js";
import { scaleDown } from "@sentio/sdk";
import {
  lending as lending_new_liquidation_event,
  incentive_v2,
  flash_loan,
  storage
} from "../types/sui/0x834a86970ae93a73faf4fff16ae40bdb72b91c47be585fff19a2af60a19ddca3.js";
import {
  lending as lending_new_liquidation_event_v3,
  incentive_v3,
  flash_loan as flash_loan_v3,
} from "../types/sui/0x81c408448d0d57b3e371ea94de1d40bf852784d3e225de1e74acab3e8395c18f.js";
import { FlashLoanCoins, getDecimalBySymbol } from "./utils.js";

import { DECIMAL_MAP, SYMBOL_MAP } from "./utils.js";
// import { PythOracleProcessor } from './pyth.js'
// import {SupraSValueFeed} from '../types/sui/0xc7abe17a209fcab08e2d7d939cf3df11f5b80cf03d10b50893f38df12fdebb07.js'
// import {getSupraPrice} from './supra.js'

let coinInfoMap = new Map<string, Promise<token.TokenInfo>>();

export const getOrCreateCoin = async function (
  ctx: SuiContext | SuiObjectContext,
  coinAddress: string
): Promise<token.TokenInfo> {
  let coinInfo = coinInfoMap.get(coinAddress);
  if (!coinInfo) {
    coinInfo = buildCoinInfo(ctx, coinAddress);
    coinInfoMap.set(coinAddress, coinInfo);
    console.log("set coinInfoMap for " + coinAddress);
  }
  return await coinInfo;
};

export async function buildCoinInfo(
  ctx: SuiContext | SuiObjectContext,
  coinAddress: string
): Promise<token.TokenInfo> {
  const metadata = await ctx.client.getCoinMetadata({ coinType: coinAddress });
  //@ts-ignore
  const symbol = metadata.symbol;
  //@ts-ignore
  const decimal = metadata.decimals;
  //@ts-ignore
  const name = metadata.name;
  console.log(`build coin metadata ${symbol} ${decimal} ${name}`);
  return {
    symbol,
    name,
    decimal,
  };
}

export type LendingEvent =
  | lending.BorrowEventInstance
  | lending.DepositEventInstance
  | lending.WithdrawEventInstance
  | lending.RepayEventInstance
  | lending_new_liquidation_event_v3.BorrowEventInstance
  | lending_new_liquidation_event_v3.DepositEventInstance
  | lending_new_liquidation_event_v3.WithdrawEventInstance
  | lending_new_liquidation_event_v3.RepayEventInstance;

PoolProcessor();
ProtocolProcessor();
OracleProcessor();
AddressProcessor();
FeeProcessor();
// PythOracleProcessor()
// PythOracleProcessor()

async function onEvent(event: LendingEvent, ctx: SuiContext) {
  const sender = event.data_decoded.sender;
  // const amount = event.data_decoded.amount
  const reserve = event.data_decoded.reserve;
  const Coins: any = {
    "0": "0x0000000000000000000000000000000000000000000000000000000000000002::sui::SUI",
    "1": "0x5d4b302506645c37ff133b98c4b50a5ae14841659738d6d733d59d0d217a93bf::coin::COIN",
    "2": "0xc060006111016b8a020ad5b33834984a437aaa7d3c74c18e09a95d48aceab08c::coin::COIN",
    "3": "0xaf8cd5edc19c4512f4259f0bee101a40d41ebed738ade5874359610ef8eeced5::coin::COIN",
    "4": "0x06864a6f921804860930db6ddbe2e16acdf8504495ea7481637a1c8b9a8fe54b::cetus::CETUS",
    "5": "0x549e8b69270defbfafd4f94e17ec44cdbdd99820b33bda2278dea3b9a32d3f55::cert::CERT",
    "6": "0xbde4ba4c2e274a60ce15c1cfff9e5c42e41654ac8b6d906a57efa4bd3c29f47d::hasui::HASUI",
    "7": "0xa99b8952d4f7d947ea77fe0ecdcc9e5fc0bcab2841d6e2a5aa00c3044e5544b5::navx::NAVX",
    "8": "0x027792d9fed7f9844eb4839566001bb6f6cb4804f66aa2da6fe1ee242d896881::coin::COIN", //wbtc
    "9": "0x2053d08c1e2bd02791056171aab0fd12bd7cd7efad2ab8f6b9c8902f14df2ff2::ausd::AUSD", //ausd
    "10": "0xdba34672e30cb065b1f93e3ab55318768fd6fef66c15942c9f7cb846e2f900e7::usdc::USDC", //native usdc
    "11": "0xd0e89b2af5e4910726fbcd8b8dd37bb79b29e5f83f7491bca830e94f7f226d29::eth::ETH", //native eth
    "12": "0x960b531667636f39e85867775f52f6b1f220a058c4de786905bdf761e06a56bb::usdy::USDY", //USDY
    "13": "0x5145494a5f5100e645e4b0aa950fa6b68f614e8c59e17bc5ded3495123a79178::ns::NS", //NS
    "14": "0x5f496ed5d9d045c5b788dc1bb85f54100f2ede11e46f6a232c29daada4c5bdb6::coin::COIN", //stBTC
    "15": "0xdeeb7a4662eec9f2f3def03fb937a663dddaa2e215b8078a284d026b7946c270::deep::DEEP", //deep
    "16": "0xf16e6b723f242ec745dfd7634ad072c42d5c1d9ac9d62a39c381303eaa57693a::fdusd::FDUSD", //FDUSD
    "17": "0xe1b45a0e641b9955a20aa0ad1c1f4ad86aad8afb07296d4085e349a50e90bdca::blue::BLUE", //BLUE
    "18": "0xce7ff77a83ea0cb6fd39bd8748e2ec89a3f41e8efdc3f4eb123e0ca37b184db2::buck::BUCK", //BUCK
    "19": "0x375f70cf2ae4c00bf37117d0c85a2c71545e6ee05c4a5c7d282cd66a4504b068::usdt::USDT", //nUSDT
    "20": "0xd1b72982e40348d069bb1ff701e634c117bb5f741f44dff91e472d3b01461e55::stsui::STSUI", //stSUI
    "21": "0xaafb102dd0902f5055cadecd687fb5b71ca82ef0e0285d90afde828ec58ca96b::btc::BTC", //suiBTC
    "22": "0xb7844e289a8410e50fb3ca48d69eb9cf29e27d223ef90353fe1bd8e27ff8f3f8::coin::COIN", //SOL
    "23": "0x3e8e9423d80e1774a7ca128fccd8bf5f1f7753be658c5e645929037f7c819040::lbtc::LBTC", //LBTC
    "24": "0x356a26eb9e012a68958082340d4c4116e7f55615cf27affcff209cf0ae544f59::wal::WAL" //WAL
  };
  const coinAddress = Coins[reserve];
  // const coinAddress = event.data_decoded.pool;

  const typeArray = event.type.split("::");
  const type = typeArray[typeArray.length - 1];
  const coinDecimal = getOrCreateCoin(ctx, coinAddress);
  const amount = scaleDown(
    event.data_decoded.amount,
    (await coinDecimal).decimal
  );

  ctx.eventLogger.emit("UserInteraction", {
    distinctId: sender,
    sender,
    amount,
    reserve,
    type,
    env: "mainnet",
  });
}

async function onLiquidationEvent(
  event: lending.LiquidationCallEventInstance,
  ctx: SuiContext
) {
  const sender = event.data_decoded.sender;
  const liquidation_amount = event.data_decoded.liquidate_amount;
  const liquidate_user = event.data_decoded.liquidate_user;
  const reserve = event.data_decoded.reserve;
  const reserve_Decimal = DECIMAL_MAP[reserve];
  const reserve_Symbol = SYMBOL_MAP[reserve];
  const typeArray = event.type.split("::");
  const type = typeArray[typeArray.length - 1];

  ctx.eventLogger.emit("UserInteraction", {
    distinctId: sender,
    sender,
    liquidation_amount,
    liquidate_user,
    reserve,
    reserve_Decimal,
    reserve_Symbol,
    type,
    env: "mainnet",
  });
}

async function onLiquidationNewEvent(
  event: lending_new_liquidation_event.LiquidationEventInstance,
  ctx: SuiContext
) {
  const sender = event.data_decoded.sender;
  const user = event.data_decoded.user;
  const collateral_asset = event.data_decoded.collateral_asset;
  const collateral_decimal = DECIMAL_MAP[collateral_asset];
  const collateral_symbol = SYMBOL_MAP[collateral_asset];
  const collateral_price = event.data_decoded.collateral_price;
  const collateral_amount = event.data_decoded.collateral_amount;
  const treasury = event.data_decoded.treasury;
  const debt_asset = event.data_decoded.debt_asset;
  const debt_decimal = DECIMAL_MAP[debt_asset];
  const debt_symbol = SYMBOL_MAP[debt_asset];
  const debt_price = event.data_decoded.debt_price;
  const debt_amount = event.data_decoded.debt_amount;
  const typeArray = event.type.split("::");
  const type = typeArray[typeArray.length - 1];

  ctx.eventLogger.emit("Liquidation", {
    liquidation_sender: sender,
    user: user,
    collateral_asset,
    collateral_decimal,
    collateral_decimal_ray: Math.pow(10, collateral_decimal),
    collateral_symbol,
    collateral_price,
    collateral_price_normalized: scaleDown(
      collateral_price,
      collateral_decimal
    ),
    collateral_amount,
    collateral_amount_normalized: scaleDown(
      collateral_amount,
      collateral_decimal
    ),
    treasury,
    debt_asset,
    debt_decimal,
    debt_decimal_ray: Math.pow(10, debt_decimal),
    debt_symbol,
    debt_price,
    debt_price_normalized: scaleDown(debt_price, debt_decimal),
    debt_amount,
    debt_amount_normalized: scaleDown(debt_amount, debt_decimal),
    type,
    env: "mainnet",
  });
}

async function onRewardsClaimedEvent(
  event: incentive_v2.RewardsClaimedInstance,
  ctx: SuiContext
) {
  ctx.eventLogger.emit("RewardsClaimed", {
    sender: event.data_decoded.sender,
    amount: event.data_decoded.amount,
    pool: event.data_decoded.pool,
    coin_type: null,
    rule_ids: null,
    rule_indices: null,
    env: "mainnet",
  });
}

async function flashLoanHandler(
  event: flash_loan.FlashLoanInstance,
  ctx: SuiContext
) {
  const sender = event.data_decoded.sender;
  const amount = event.data_decoded.amount;
  const asset : string = event.data_decoded.asset as string;
  const coinAddress = event.type_arguments[0] as string;
  const coinSymbol = FlashLoanCoins[asset] || "unknown";

  console.log(asset);

  ctx.eventLogger.emit("flashloan", {
    sender: sender,
    amount: amount,
    asset: asset,
    coinAddress: coinAddress,
    coinType: coinSymbol,
    env: "mainnet",
  });
}

async function flashoanRepayHandler(
  event: flash_loan.FlashRepayInstance,
  ctx: SuiContext
) {
  const sender = event.data_decoded.sender;
  const amount = event.data_decoded.amount;
  const asset = String(event.data_decoded.asset);
  const coinAddress = event.type_arguments[0] as string;
  const coinType = FlashLoanCoins[asset] || "unknown";

  ctx.eventLogger.emit("flashloanRepay", {
    sender: sender,
    coinType: coinType,
    coinAddress: coinAddress,
    amount: amount,
    fee_to_supplier: event.data_decoded.fee_to_supplier,
    fee_to_treasury: event.data_decoded.fee_to_treasury,
    env: "mainnet",
  });
}

async function depositOnBehalfOfHandler(
  event: lending.DepositOnBehalfOfEventInstance,
  ctx: SuiContext
) {
  const sender = event.data_decoded.sender;
  const user = event.data_decoded.user;
  const amount = event.data_decoded.amount;
  const reserve = event.data_decoded.reserve;

  ctx.eventLogger.emit("OnBehalfOfInteraction", {
    sender,
    user,
    reserve,
    amount,
    env: "mainnet",
    type: "deposit",
  });
}

async function repayOnBehalfOfHandler(
  event: lending.RepayOnBehalfOfEventInstance,
  ctx: SuiContext
) {
  const sender = event.data_decoded.sender;
  const user = event.data_decoded.user;
  const amount = event.data_decoded.amount;
  const reserve = event.data_decoded.reserve;

  ctx.eventLogger.emit("OnBehalfOfInteraction", {
    sender,
    user,
    reserve,
    amount,
    env: "mainnet",
    type: "repay",
  });
}

async function withdrawTreasuryHandler(
  event: storage.WithdrawTreasuryEventInstance,
  ctx: SuiContext
) {
  const sender = event.data_decoded.sender;
  const recipient = event.data_decoded.recipient;
  const amount = event.data_decoded.amount;
  const asset = event.data_decoded.asset.toString();
  const poolId = event.data_decoded.poolId;
  const before = event.data_decoded.before;
  const after = event.data_decoded.after;
  const index = event.data_decoded.index;

  ctx.eventLogger.emit("WithdrawTreasury", {
    sender,
    recipient,
    asset,
    amount,
    poolId,
    before,
    after,
    index,
    env: "mainnet",
  });
}

async function onLiquidationNewEventV3(
  event: lending_new_liquidation_event_v3.LiquidationEventInstance,
  ctx: SuiContext
) {
  const sender = event.data_decoded.sender;
  const user = event.data_decoded.user;
  const collateral_asset = event.data_decoded.collateral_asset;
  const collateral_decimal = DECIMAL_MAP[collateral_asset];
  const collateral_symbol = SYMBOL_MAP[collateral_asset];
  const collateral_price = event.data_decoded.collateral_price;
  const collateral_amount = event.data_decoded.collateral_amount;
  const treasury = event.data_decoded.treasury;
  const debt_asset = event.data_decoded.debt_asset;
  const debt_decimal = DECIMAL_MAP[debt_asset];
  const debt_symbol = SYMBOL_MAP[debt_asset];
  const debt_price = event.data_decoded.debt_price;
  const debt_amount = event.data_decoded.debt_amount;
  const typeArray = event.type.split("::");
  const type = typeArray[typeArray.length - 1];

  ctx.eventLogger.emit("Liquidation", {
    liquidation_sender: sender,
    user: user,
    collateral_asset,
    collateral_decimal,
    collateral_decimal_ray: Math.pow(10, collateral_decimal),
    collateral_symbol,
    collateral_price,
    collateral_price_normalized: scaleDown(
      collateral_price,
      collateral_decimal
    ),
    collateral_amount,
    collateral_amount_normalized: scaleDown(
      collateral_amount,
      collateral_decimal
    ),
    treasury,
    debt_asset,
    debt_decimal,
    debt_decimal_ray: Math.pow(10, debt_decimal),
    debt_symbol,
    debt_price,
    debt_price_normalized: scaleDown(debt_price, debt_decimal),
    debt_amount,
    debt_amount_normalized: scaleDown(debt_amount, debt_decimal),
    type,
    env: "mainnet",
  });
}

async function depositOnBehalfOfHandlerV3(
  event: lending_new_liquidation_event_v3.DepositOnBehalfOfEventInstance,
  ctx: SuiContext
) {
  const sender = event.data_decoded.sender;
  const user = event.data_decoded.user;
  const amount = event.data_decoded.amount;
  const reserve = event.data_decoded.reserve;

  ctx.eventLogger.emit("OnBehalfOfInteraction", {
    sender,
    user,
    reserve,
    amount,
    env: "mainnet",
    type: "deposit",
  });
}

async function repayOnBehalfOfHandlerV3(
  event: lending_new_liquidation_event_v3.RepayOnBehalfOfEventInstance,
  ctx: SuiContext
) {
  const sender = event.data_decoded.sender;
  const user = event.data_decoded.user;
  const amount = event.data_decoded.amount;
  const reserve = event.data_decoded.reserve;

  ctx.eventLogger.emit("OnBehalfOfInteraction", {
    sender,
    user,
    reserve,
    amount,
    env: "mainnet",
    type: "repay",
  });
}

async function onRewardsClaimedEventV3(
  event: incentive_v3.RewardClaimedInstance,
  ctx: SuiContext
) {
  ctx.eventLogger.emit("RewardsClaimed", {
    sender: event.data_decoded.user,
    amount: event.data_decoded.total_claimed,
    pool: null,
    coin_type: event.data_decoded.coin_type,
    rule_ids: event.data_decoded.rule_ids,
    rule_indices: event.data_decoded.rule_indices.map((index) =>
      index.toString()
    ),
    env: "mainnet",
  });
}

flash_loan
  .bind({ startCheckpoint: 120500000n })
  .onEventFlashLoan(flashLoanHandler)
  .onEventFlashRepay(flashoanRepayHandler);

lending
  .bind({ startCheckpoint: 120500000n })
  .onEventLiquidationCallEvent(onLiquidationEvent);

lending_new_liquidation_event
  .bind({ startCheckpoint: 120500000n })
  .onEventLiquidationEvent(onLiquidationNewEvent)
  .onEventDepositOnBehalfOfEvent(depositOnBehalfOfHandler)
  .onEventRepayOnBehalfOfEvent(repayOnBehalfOfHandler)
  .onEventBorrowEvent(onEvent)
  .onEventDepositEvent(onEvent)
  .onEventRepayEvent(onEvent)
  .onEventWithdrawEvent(onEvent);

// SupraSValueFeed.bind({ startCheckpoint: 32862600n })
//   .onEventSCCProcessedEvent(supraEventHandler)

incentive_v2
  .bind({ startCheckpoint: 120500000n })
  .onEventRewardsClaimed(onRewardsClaimedEvent);

lending_new_liquidation_event_v3
  .bind({ startCheckpoint: 113837268n })
  .onEventLiquidationEvent(onLiquidationNewEventV3)
  .onEventDepositOnBehalfOfEvent(depositOnBehalfOfHandlerV3)
  .onEventRepayOnBehalfOfEvent(repayOnBehalfOfHandlerV3);

incentive_v3
  .bind({ startCheckpoint: 113837268n })
  .onEventRewardClaimed(onRewardsClaimedEventV3);

storage
  .bind({ startCheckpoint: 120500000n })
  .onEventWithdrawTreasuryEvent(withdrawTreasuryHandler);
