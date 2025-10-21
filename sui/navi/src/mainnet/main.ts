import { SuiContext, SuiObjectContext } from "@sentio/sdk/sui";
import { lending } from "../types/sui/0x834a86970ae93a73faf4fff16ae40bdb72b91c47be585fff19a2af60a19ddca3.js";
import { token } from "@sentio/sdk/utils";
import { ProtocolProcessor } from "./storage.js";
import { PoolProcessor } from "./pool.js";
import { OracleProcessor } from "./oracle.js";
import { AddressProcessor } from "./address.js";
import { FeeProcessor } from "./fee.js";
import { scaleDown, BigDecimal } from "@sentio/sdk";
import {
  lending as lending_new_liquidation_event,
  incentive_v2,
  flash_loan,
  storage,
} from "../types/sui/0x834a86970ae93a73faf4fff16ae40bdb72b91c47be585fff19a2af60a19ddca3.js";
import {
  lending as lending_new_liquidation_event_v3,
  incentive_v3,
  flash_loan as flash_loan_v3,
} from "../types/sui/0x81c408448d0d57b3e371ea94de1d40bf852784d3e225de1e74acab3e8395c18f.js";
import { FlashLoanCoins, getDecimalBySymbol, COIN_MAP } from "./utils.js";
import { DECIMAL_MAP, SYMBOL_MAP } from "./utils.js";

let coinInfoMap = new Map<string, Promise<token.TokenInfo>>();

// Cumulative withdrawal amount tracker for calculating real cumulative revenue
let cumulativeWithdrawnAmounts = new Map<string, BigDecimal>();

// Fee pool data cache for getting current fee pool accumulated amounts
let feePoolAmounts = new Map<string, BigDecimal>();

// Track previous feeForPool values for calculating net growth
let previousFeePoolAmounts = new Map<string, BigDecimal>();

// Track cumulative net growth of fee pools (only positive changes)
let feePoolNetGrowth = new Map<string, BigDecimal>();

// Treasury balance for pool cache - 用于存储池子的treasury balance数据
let treasuryBalanceForPoolCache = new Map<string, BigDecimal>();

// Historical data initialization flag
let isHistoricalDataInitialized = false;

// Coin mapping used across different event handlers
const COIN_MAPPING: { [key: string]: string } = {
  "0": "0x0000000000000000000000000000000000000000000000000000000000000002::sui::SUI",
  "1": "0x5d4b302506645c37ff133b98c4b50a5ae14841659738d6d733d59d0d217a93bf::coin::COIN",
  "2": "0xc060006111016b8a020ad5b33834984a437aaa7d3c74c18e09a95d48aceab08c::coin::COIN",
  "3": "0xaf8cd5edc19c4512f4259f0bee101a40d41ebed738ade5874359610ef8eeced5::coin::COIN",
  "4": "0x06864a6f921804860930db6ddbe2e16acdf8504495ea7481637a1c8b9a8fe54b::cetus::CETUS",
  "5": "0x549e8b69270defbfafd4f94e17ec44cdbdd99820b33bda2278dea3b9a32d3f55::cert::CERT",
  "6": "0xbde4ba4c2e274a60ce15c1cfff9e5c42e41654ac8b6d906a57efa4bd3c29f47d::hasui::HASUI",
  "7": "0xa99b8952d4f7d947ea77fe0ecdcc9e5fc0bcab2841d6e2a5aa00c3044e5544b5::navx::NAVX",
  "8": "0x027792d9fed7f9844eb4839566001bb6f6cb4804f66aa2da6fe1ee242d896881::coin::COIN", // WBTC
  "9": "0x2053d08c1e2bd02791056171aab0fd12bd7cd7efad2ab8f6b9c8902f14df2ff2::ausd::AUSD", // AUSD
  "10": "0xdba34672e30cb065b1f93e3ab55318768fd6fef66c15942c9f7cb846e2f900e7::usdc::USDC", // Native USDC
  "11": "0xd0e89b2af5e4910726fbcd8b8dd37bb79b29e5f83f7491bca830e94f7f226d29::eth::ETH", // Native ETH
  "12": "0x960b531667636f39e85867775f52f6b1f220a058c4de786905bdf761e06a56bb::usdy::USDY", // USDY
  "13": "0x5145494a5f5100e645e4b0aa950fa6b68f614e8c59e17bc5ded3495123a79178::ns::NS", // NS
  "14": "0x5f496ed5d9d045c5b788dc1bb85f54100f2ede11e46f6a232c29daada4c5bdb6::coin::COIN", // stBTC
  "15": "0xdeeb7a4662eec9f2f3def03fb937a663dddaa2e215b8078a284d026b7946c270::deep::DEEP", // DEEP
  "16": "0xf16e6b723f242ec745dfd7634ad072c42d5c1d9ac9d62a39c381303eaa57693a::fdusd::FDUSD", // FDUSD
  "17": "0xe1b45a0e641b9955a20aa0ad1c1f4ad86aad8afb07296d4085e349a50e90bdca::blue::BLUE", // BLUE
  "18": "0xce7ff77a83ea0cb6fd39bd8748e2ec89a3f41e8efdc3f4eb123e0ca37b184db2::buck::BUCK", // BUCK
  "19": "0x375f70cf2ae4c00bf37117d0c85a2c71545e6ee05c4a5c7d282cd66a4504b068::usdt::USDT", // nUSDT
  "20": "0xd1b72982e40348d069bb1ff701e634c117bb5f741f44dff91e472d3b01461e55::stsui::STSUI", // stSUI
  "21": "0xaafb102dd0902f5055cadecd687fb5b71ca82ef0e0285d90afde828ec58ca96b::btc::BTC", // suiBTC
  "22": "0xb7844e289a8410e50fb3ca48d69eb9cf29e27d223ef90353fe1bd8e27ff8f3f8::coin::COIN", // SOL
  "23": "0x3e8e9423d80e1774a7ca128fccd8bf5f1f7753be658c5e645929037f7c819040::lbtc::LBTC", // LBTC
  "24": "0x356a26eb9e012a68958082340d4c4116e7f55615cf27affcff209cf0ae544f59::wal::WAL", // WAL
  "25": "0x3a304c7feba2d819ea57c3542d68439ca2c386ba02159c740f7b406e592c62ea::haedal::HAEDAL", // HAEDAL
  "26": "0x876a4b7bce8aeaef60464c11f4026903e9afacab79b9b142686158aa86560b50::xbtc::XBTC", // XBTC
  "27": "0x7262fb2f7a3a14c888c438a3cd9b912469a58cf60f367352c46584262e8299aa::ika::IKA", //IKA
};

// Initialize historical cumulative withdrawal amounts
async function initializeHistoricalWithdrawals(ctx: SuiContext): Promise<void> {
  if (isHistoricalDataInitialized) return;

  // Initialize all tokens with zero cumulative withdrawals
  // Historical data can be set here if available
  for (const coinSymbol of Object.values(COIN_MAP)) {
    if (coinSymbol) {
      cumulativeWithdrawnAmounts.set(coinSymbol, BigDecimal(0));
    }
  }

  isHistoricalDataInitialized = true;
}

// Get cumulative withdrawn amount from storage
async function getCumulativeWithdrawn(
  ctx: SuiContext | SuiObjectContext,
  coinSymbol: string
): Promise<BigDecimal> {
  // Ensure historical data is initialized
  if (!isHistoricalDataInitialized && "eventLogger" in ctx) {
    await initializeHistoricalWithdrawals(ctx as SuiContext);
  }

  return cumulativeWithdrawnAmounts.get(coinSymbol) || BigDecimal(0);
}

// Save cumulative withdrawn amount to storage
async function saveCumulativeWithdrawn(
  ctx: SuiContext,
  coinSymbol: string,
  amount: BigDecimal
): Promise<void> {
  cumulativeWithdrawnAmounts.set(coinSymbol, amount);
}

// Get cumulative withdrawn amount (priority: memory, then storage)
export async function getCumulativeWithdrawnAmount(
  ctx: SuiContext | SuiObjectContext,
  coinSymbol: string
): Promise<BigDecimal> {
  let amount = cumulativeWithdrawnAmounts.get(coinSymbol);
  if (!amount) {
    amount = await getCumulativeWithdrawn(ctx, coinSymbol);
    cumulativeWithdrawnAmounts.set(coinSymbol, amount);
  }
  return amount;
}

// Get total cumulative withdrawn amount for all tokens
export function getTotalCumulativeWithdrawn(): BigDecimal {
  let total = BigDecimal(0);
  for (const amount of cumulativeWithdrawnAmounts.values()) {
    total = total.plus(amount);
  }
  return total;
}

// Get cumulative withdrawn amounts by token
export function getCumulativeWithdrawnByToken(): Map<string, BigDecimal> {
  return new Map(cumulativeWithdrawnAmounts);
}

export const getOrCreateCoin = async function (
  ctx: SuiContext | SuiObjectContext,
  coinAddress: string
): Promise<token.TokenInfo> {
  let coinInfo = coinInfoMap.get(coinAddress);
  if (!coinInfo) {
    coinInfo = buildCoinInfo(ctx, coinAddress);
    coinInfoMap.set(coinAddress, coinInfo);
  }
  return await coinInfo;
};

export async function buildCoinInfo(
  ctx: SuiContext | SuiObjectContext,
  coinAddress: string
): Promise<token.TokenInfo> {
  // Add safety check for undefined or null coinAddress
  if (!coinAddress) {
    console.warn(`buildCoinInfo called with undefined/null coinAddress`);
    throw new Error(`Invalid coinAddress: ${coinAddress}`);
  }

  // Additional check for "null" string
  if (coinAddress === "null") {
    console.warn(`buildCoinInfo called with "null" string as coinAddress`);
    throw new Error(`Invalid coinAddress: "null"`);
  }

  try {
    const metadata = await ctx.client.getCoinMetadata({
      coinType: coinAddress,
    });
    //@ts-ignore
    const symbol = metadata.symbol;
    //@ts-ignore
    const decimal = metadata.decimals;
    //@ts-ignore
    const name = metadata.name;
    return {
      symbol,
      name,
      decimal,
    };
  } catch (error) {
    console.error(`Error getting coin metadata for ${coinAddress}:`, error);
    throw error;
  }
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

async function onEvent(event: LendingEvent, ctx: SuiContext) {
  const sender = event.data_decoded.sender;
  const reserve = event.data_decoded.reserve;

  // Add comprehensive safety checks for reserve
  if (reserve === null || reserve === undefined) {
    console.warn(
      `Reserve is null or undefined for event: ${JSON.stringify(event.data_decoded)}`
    );
    return;
  }

  // Additional check: if reserve.toString() returns "null", it means reserve is actually null
  if (reserve.toString() === "null") {
    console.warn(
      `Reserve.toString() returns "null" for event: ${JSON.stringify(event.data_decoded)}`
    );
    return;
  }

  const coinAddress = COIN_MAPPING[reserve.toString()];

  // Add safety check for undefined coinAddress
  if (!coinAddress) {
    console.warn(
      `Coin address not found for reserve: ${reserve}, type: ${typeof reserve}, reserve.toString(): "${reserve.toString()}"`
    );
    return;
  }

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
  const asset: string = event.data_decoded.asset as string;
  const coinAddress = event.type_arguments[0] as string;
  const coinSymbol = FlashLoanCoins[asset] || "unknown";

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
  const assetIndex = Number(event.data_decoded.asset); // Asset is numeric index
  const poolId = event.data_decoded.poolId;
  const before = event.data_decoded.before;
  const after = event.data_decoded.after;
  const index = event.data_decoded.index;

  // Get complete coin_type through numeric index
  let coinType = COIN_MAPPING[assetIndex.toString()];
  if (
    coinType ===
    "0x0000000000000000000000000000000000000000000000000000000000000002::sui::SUI"
  ) {
    coinType = "0x2::sui::SUI"; // Normalize SUI address
  }

  const coinSymbol = COIN_MAP[coinType] || `UNKNOWN_${assetIndex}`;

  // Use 9 decimal places for treasury balance consistency (all treasury operations use 9 decimals)
  const decimal = 9; // Treasury balance is always 9 decimals regardless of token's native decimals
  const withdrawAmount = scaleDown(amount, decimal);

  // Update cumulative withdrawal amount
  const currentCumulative = await getCumulativeWithdrawnAmount(ctx, coinSymbol);
  const newCumulative = currentCumulative.plus(withdrawAmount);

  await saveCumulativeWithdrawn(ctx, coinSymbol, newCumulative);

  // No Gauge record for cumulativeWithdrawnAmount

  // No Gauge record for withdrawTreasuryAmount

  // Keep original event unchanged
  ctx.eventLogger.emit("WithdrawTreasury", {
    sender,
    recipient,
    id: assetIndex.toString(), // Keep original numeric format
    amount,
    amount_normalized: withdrawAmount,
    poolId,
    before,
    after,
    index,
    env: "mainnet",
  });

  // Add V2 version event with cumulative data
  ctx.eventLogger.emit("WithdrawTreasuryV2", {
    sender,
    recipient,
    id: assetIndex.toString(),
    amount,
    amount_normalized: withdrawAmount,
    poolId,
    before,
    after,
    index,
    env: "mainnet",
    coin_symbol: coinSymbol,
    coin_type: coinType, // Complete coin_type
    cumulative_withdrawn: newCumulative,
    withdraw_amount_decimal: withdrawAmount,
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

  // Safety checks for undefined decimal values
  if (collateral_decimal === undefined) {
    return; // Skip processing this event
  }

  if (debt_decimal === undefined) {
    return; // Skip processing this event
  }

  // Additional safety check for symbol mappings
  if (!collateral_symbol) {
    return;
  }

  if (!debt_symbol) {
    return;
  }

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
  .bind({ startCheckpoint: 7800000n })
  .onEventFlashLoan(flashLoanHandler)
  .onEventFlashRepay(flashoanRepayHandler);

lending_new_liquidation_event
  .bind({ startCheckpoint: 7800000n })
  .onEventDepositOnBehalfOfEvent(depositOnBehalfOfHandler)
  .onEventRepayOnBehalfOfEvent(repayOnBehalfOfHandler)
  .onEventBorrowEvent(onEvent)
  .onEventDepositEvent(onEvent)
  .onEventRepayEvent(onEvent)
  .onEventWithdrawEvent(onEvent);

// SupraSValueFeed.bind({ startCheckpoint: 32862600n })
//   .onEventSCCProcessedEvent(supraEventHandler)

incentive_v2
  .bind({ startCheckpoint: 7800000n })
  .onEventRewardsClaimed(onRewardsClaimedEvent);

lending_new_liquidation_event_v3
  .bind({ startCheckpoint: 7800000n })
  .onEventLiquidationEvent(onLiquidationNewEventV3)
  .onEventDepositOnBehalfOfEvent(depositOnBehalfOfHandlerV3)
  .onEventRepayOnBehalfOfEvent(repayOnBehalfOfHandlerV3);

incentive_v3
  .bind({ startCheckpoint: 7800000n })
  .onEventRewardClaimed(onRewardsClaimedEventV3);

storage
  .bind({ startCheckpoint: 7800000n })
  .onEventWithdrawTreasuryEvent(withdrawTreasuryHandler);

// Update fee pool amount (called by fee.ts)
export function updateFeePoolAmount(
  coinSymbol: string,
  amount: BigDecimal
): void {
  feePoolAmounts.set(coinSymbol, amount);
}

// Get fee pool amount
export function getFeePoolAmount(coinSymbol: string): BigDecimal {
  return feePoolAmounts.get(coinSymbol) || BigDecimal(0);
}

// Update fee pool amount and calculate net growth (called by fee.ts)
export function updateFeePoolWithGrowthTracking(
  coinSymbol: string,
  currentAmount: BigDecimal
): void {
  // Get previous amount
  const previousAmount =
    previousFeePoolAmounts.get(coinSymbol) || BigDecimal(0);

  // Calculate difference
  const difference = currentAmount.minus(previousAmount);

  // Only add positive differences (growth)
  if (difference.gt(BigDecimal(0))) {
    const currentNetGrowth = feePoolNetGrowth.get(coinSymbol) || BigDecimal(0);
    const newNetGrowth = currentNetGrowth.plus(difference);
    feePoolNetGrowth.set(coinSymbol, newNetGrowth);
  } else if (difference.lt(BigDecimal(0))) {
  }

  // Update current values
  feePoolAmounts.set(coinSymbol, currentAmount);
  previousFeePoolAmounts.set(coinSymbol, currentAmount);
}

// Get fee pool net growth
export function getFeePoolNetGrowth(coinSymbol: string): BigDecimal {
  return feePoolNetGrowth.get(coinSymbol) || BigDecimal(0);
}

// Treasury balance for pool management functions
export function updateTreasuryBalanceForPool(
  coin_symbol: string,
  treasuryBalance: BigDecimal
) {
  treasuryBalanceForPoolCache.set(coin_symbol, treasuryBalance);
}

export function getTreasuryBalanceForPool(coin_symbol: string): BigDecimal {
  return treasuryBalanceForPoolCache.get(coin_symbol) || BigDecimal(0);
}

// Get all fee pool net growth data
export function getAllFeePoolNetGrowth(): Map<string, BigDecimal> {
  return new Map(feePoolNetGrowth);
}

// Calculate real cumulative revenue = current fee pool + cumulative withdrawn amounts
export async function calculateRealCumulativeRevenue(
  ctx: SuiContext | SuiObjectContext,
  coinSymbol: string
): Promise<BigDecimal> {
  const currentFeePool = getFeePoolAmount(coinSymbol);
  const cumulativeWithdrawn = await getCumulativeWithdrawnAmount(
    ctx,
    coinSymbol
  );

  // Real cumulative revenue = current amount in fee pool + amount already withdrawn
  const realRevenue = currentFeePool.plus(cumulativeWithdrawn);

  return realRevenue;
}
