import { SuiContext, SuiNetwork } from "@sentio/sdk/sui";
import * as aggregator from "./types/sui/0x88dfe5e893bc9fa984d121e4d0d5b2e873dc70ae430cf5b3228ae6cb199cb32b.js";
import { slippage } from "./types/sui/0x5b7d732adeb3140a2dbf2becd1e9dbe56cee0e3687379bcfe7df4357ea664313.js";
import * as newSlippage from "./types/sui/0xdd21f177ec772046619e401c7a44eb78c233c0d53b4b2213ad83122eef4147db.js";
import * as dca from "./types/sui/0xaf08f20a6214169d5dc77c133e98b529bdb9c1db93ac8303dcd50e854504865a.js";
import { SuiCoinList } from "@sentio/sdk/sui/ext";
import { getPriceBySymbol, getPriceByType, token } from "@sentio/sdk/utils";

const START_CHECKPOINT = 72000000n;

let coinInfoMap = new Map<string, Promise<token.TokenInfo>>();

const referralIdToUsernameMap: Record<string, string> = {
  "1873161113": "NaviAG",
  "2463850496": "Navi",
  "9951543296": "naviTgBot",
  "3258838016": "w6g2000",
  "1000648704": "Binh",
  "7289584128": "sudo",
  "7723906048": "Jesus",
  "4697169920": "Mayan",
  "6541220672": "Wave",
  "8868297728": "SuiWallet",
};

export function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function buildCoinInfo(
  ctx: SuiContext,
  coinAddress: string
): Promise<token.TokenInfo> {
  let [symbol, name, decimal] = ["unk", "unk", 0];

  let retryCounter = 0;
  while (retryCounter++ <= 50) {
    try {
      const metadata = await ctx.client.getCoinMetadata({
        coinType: coinAddress,
      });
      if (metadata == null) {
        break;
      }

      symbol = metadata.symbol;
      decimal = metadata.decimals;
      name = metadata.name;
      console.log(`build coin metadata ${symbol} ${decimal} ${name}`);
    } catch (e) {
      console.log(
        `${e.message} get coin metadata error ${coinAddress}, retry: ${retryCounter}`
      );
      await delay(10000);
      continue;
    }
    break;
  }

  return {
    symbol,
    name,
    decimal,
  };
}

export const getOrCreateCoin = async function (
  ctx: SuiContext,
  coinAddress: string
): Promise<token.TokenInfo> {
  console.log("coinAddress", coinAddress);
  let coinInfo = coinInfoMap.get(coinAddress);
  if (!coinInfo) {
    coinInfo = buildCoinInfo(ctx, coinAddress);
    coinInfoMap.set(coinAddress, coinInfo);
    let i = 0;
    let msg = `set coinInfoMap for ${(await coinInfo).name}`;
    for (const key of coinInfoMap.keys()) {
      const coinInfo = await coinInfoMap.get(key);
      msg += `\n${i}:${coinInfo?.name},${coinInfo?.decimal} `;
      i++;
    }
    console.log(msg);
  }
  return coinInfo;
};

type MoveTypeName = {
  name?: string;
};

type CoinContext = {
  type: string;
  symbol: string;
  decimals: number;
  price: number;
};

const DEFAULT_COIN_CONTEXT: CoinContext = {
  type: "",
  symbol: "UNKNOWN",
  decimals: 0,
  price: 0,
};

const getCoinTypeFromTypeName = (typeName?: MoveTypeName): string => {
  return typeName?.name ?? "";
};

const getCoinContext = async (
  ctx: SuiContext,
  typeName?: MoveTypeName
): Promise<CoinContext> => {
  const coinType = getCoinTypeFromTypeName(typeName);
  if (coinType === "") {
    return { ...DEFAULT_COIN_CONTEXT };
  }

  const [info, price] = await Promise.all([
    getOrCreateCoin(ctx, coinType),
    getCoinPrice(ctx, coinType),
  ]);

  return {
    type: coinType,
    symbol: updateSymbol(info, coinType),
    decimals: info.decimal,
    price,
  };
};

const toDecimalAmount = (amount: bigint, decimals: number) => {
  if (decimals === 0) {
    return Number(amount);
  }
  return Number(amount) / Math.pow(10, decimals);
};

const toUsdValue = (amountNumber: number, price: number) => {
  return amountNumber * price;
};

const updateSymbol = (coin: token.TokenInfo, coinAddress: string) => {
  let symbol = coin.symbol;

  if (
    coinAddress ==
    "0xdba34672e30cb065b1f93e3ab55318768fd6fef66c15942c9f7cb846e2f900e7::usdc::USDC"
  ) {
    symbol = "nUSDC";
  } else if (
    coinAddress ==
    "0x5d4b302506645c37ff133b98c4b50a5ae14841659738d6d733d59d0d217a93bf::coin::COIN"
  ) {
    symbol = "wUSDC";
  } else if (
    coinAddress ==
    "0xd0e89b2af5e4910726fbcd8b8dd37bb79b29e5f83f7491bca830e94f7f226d29::eth::ETH"
  ) {
    symbol = "suiETH";
  } else if (
    coinAddress ==
    "0xaf8cd5edc19c4512f4259f0bee101a40d41ebed738ade5874359610ef8eeced5::coin::COIN"
  ) {
    symbol = "wETH";
  }

  return symbol;
};

async function getCoinPrice(
  ctx: SuiContext,
  coinAddress: string
): Promise<number> {
  let price =
    (await getPriceByType(SuiNetwork.MAIN_NET, coinAddress, ctx.timestamp)) ||
    0;

  if (price === 0) {
    try {
      const response = await fetch(
        `https://aggregator-api-stage-d18441a1781f.naviprotocol.io/coins/price?coinType=${coinAddress}`
      );
      const data = await response.json();
      if (data.data.list.length > 0) {
        price = data.data.list[0].value || 0;
      } else {
        console.error(
          `No price data available for coinAddress: ${coinAddress}`
        );
      }
    } catch (error) {
      console.error(
        `Error fetching price for coinAddress: ${coinAddress}`,
        error
      );
    }
  }
  console.log(`getCoinPrice: ${coinAddress}, price:${price}`);
  return price;
}

async function swapEventHandler(
  event: aggregator.slippage.SwapEventInstance,
  ctx: SuiContext
) {
  const txDigest = ctx.transaction.digest;
  console.log(`Processing SwapEvent in transaction ${txDigest}`);

  const fromInfo = await getOrCreateCoin(ctx, event.type_arguments[0]);
  const toInfo = await getOrCreateCoin(ctx, event.type_arguments[1]);

  const fromPrice = await getCoinPrice(ctx, event.type_arguments[0]);
  const toPrice = await getCoinPrice(ctx, event.type_arguments[1]);

  let fromValue =
    (fromPrice * Number(event.data_decoded.amount_in)) /
    Math.pow(10, fromInfo.decimal);
  let toValue =
    (toPrice * Number(event.data_decoded.amount_out)) /
    Math.pow(10, toInfo.decimal);

  let usdGap = 0;

  usdGap = Math.abs(fromValue - toValue) / Math.min(fromValue, toValue);
  if (usdGap >= 0.5) {
    if (fromValue > toValue) {
      fromValue = toValue;
    } else {
      toValue = fromValue;
    }
  }

  if (event.data_decoded.amount_out == BigInt(0)) {
    // hot fixed: swap NAVX to USDC
    let NAVX =
      "0xa99b8952d4f7d947ea77fe0ecdcc9e5fc0bcab2841d6e2a5aa00c3044e5544b5::navx::NAVX";
    let USDC =
      "0xdba34672e30cb065b1f93e3ab55318768fd6fef66c15942c9f7cb846e2f900e7::usdc::USDC";
    if (
      (event.type_arguments[0] == NAVX && event.type_arguments[1] == USDC) ||
      (event.type_arguments[0] == USDC && event.type_arguments[1] == NAVX)
    ) {
      fromValue =
        (toPrice * Number(event.data_decoded.amount_in)) /
        Math.pow(10, toInfo.decimal);
      ctx.eventLogger.emit("swapEvent", {
        user: event.sender,
        from: event.type_arguments[1],
        fromSymbol: updateSymbol(toInfo, event.type_arguments[1]),
        target: event.type_arguments[0],
        targetSymbol: updateSymbol(fromInfo, event.type_arguments[0]),
        amount_in: event.data_decoded.amount_in,
        amount_in_number:
          Number(event.data_decoded.amount_in) / Math.pow(10, toInfo.decimal),
        amount_in_usd: Number(fromValue),
        amount_out: 0,
        amount_out_number: 0,
        amount_out_usd: 0,
        min_amount_out: 0,
        referral_code: event.data_decoded.referral_code,
      });
    }
  } else {
    ctx.eventLogger.emit("swapEvent", {
      user: event.sender,
      from: event.type_arguments[0],
      fromSymbol: updateSymbol(fromInfo, event.type_arguments[0]),
      target: event.type_arguments[1],
      targetSymbol: updateSymbol(toInfo, event.type_arguments[1]),
      amount_in: event.data_decoded.amount_in,
      amount_in_number:
        Number(event.data_decoded.amount_in) / Math.pow(10, fromInfo.decimal),
      amount_in_usd: Number(fromValue),
      amount_out: event.data_decoded.amount_out,
      amount_out_number:
        Number(event.data_decoded.amount_out) / Math.pow(10, toInfo.decimal),
      amount_out_usd: Number(toValue),
      min_amount_out: event.data_decoded.min_amount_out,
      referral_code: event.data_decoded.referral_code,
    });
  }

  const balanceChanges = ctx.transaction.balanceChanges;
  if (balanceChanges) {
    for (let i = 0; i < balanceChanges.length; i++) {
      const amount = balanceChanges[i].amount;
      const coinType = balanceChanges[i].coinType;
      /** Owner of the balance change */
      const owner: any = balanceChanges[i].owner as any;
      const ownerAddress = owner.AddressOwner || owner.ObjectOwner;

      if (
        ownerAddress ==
        "0xd56948cebf0a3309e13980126bcc8ef4d7733305cd7b412fa00167d57741984e"
      ) {
        console.log("test owner", ownerAddress);

        const events = ctx.transaction.events;
        console.log("test transactionId", ctx.transaction.digest);

        if (events) {
          for (let j = 0; j < events.length; j++) {
            const txEvent = events[j];
            if (
              txEvent.packageId ==
              "0x88dfe5e893bc9fa984d121e4d0d5b2e873dc70ae430cf5b3228ae6cb199cb32b"
            ) {
              ctx.eventLogger.emit("sponsorTX", {
                suiGas: Math.abs(Number(amount)),
                coinType,
                owner: ownerAddress,
                txHash: ctx.transaction.digest,
                user: txEvent.sender,
                eventType: txEvent.type,
                eventId: txEvent.id,
              });
            }
          }
        }
      }
    }
  }
}

async function OnBehalfOfExSwapWithReferral(
  event: slippage.ExSwapWithReferralEventInstance,
  ctx: SuiContext
) {
  const divisor = Math.pow(10, 9);
  const sender = event.data_decoded.swap_initializer_address;
  const receiver = event.data_decoded.receiver_address;
  const fromCoinPrice = event.data_decoded.from_coin_price;
  const fromCoinPriceNumber =
    Number(event.data_decoded.from_coin_price) / divisor;
  const fromCoinAmount = event.data_decoded.from_coin_amount;
  const fromCoinAmountNumber =
    Number(event.data_decoded.from_coin_amount) / divisor;
  const toCoinPrice = event.data_decoded.to_coin_price;
  const toCoinPriceNumber = Number(event.data_decoded.to_coin_price) / divisor;
  const toCoinAmount = event.data_decoded.to_coin_amount;
  const toCoinAmountNumber =
    Number(event.data_decoded.to_coin_amount) / divisor;
  const rewardsAmount = event.data_decoded.reward_amount;
  const rewardsAmountNumber =
    Number(event.data_decoded.reward_amount) / divisor;
  const rewardsRatio = event.data_decoded.rewards_ratio;
  const referralId = event.data_decoded.referral_id;

  const referralIdStr = referralId.toString();
  const referralName = referralIdToUsernameMap[referralIdStr] || "Unknown";

  let fromValueInUSD = fromCoinPriceNumber * fromCoinAmountNumber;
  let toValueInUSD = toCoinPriceNumber * toCoinAmountNumber;

  let usdGap = 0;

  usdGap =
    Math.abs(fromValueInUSD - toValueInUSD) /
    Math.min(fromValueInUSD, toValueInUSD);
  if (usdGap >= 0.5) {
    if (fromValueInUSD > toValueInUSD) {
      fromValueInUSD = toValueInUSD;
    } else {
      toValueInUSD = fromValueInUSD;
    }
  }

  ctx.eventLogger.emit("swapReferralEvent", {
    sender,
    receiver,
    fromCoinPrice,
    fromCoinAmount,
    toCoinPrice,
    toCoinAmount,
    rewardsAmount,
    fromCoinPriceNumber,
    fromCoinAmountNumber,
    fromValueInUSD,
    toCoinPriceNumber,
    toCoinAmountNumber,
    toValueInUSD,
    rewardsAmountNumber,
    rewardsRatio,
    referralId,
    referralName,
  });
}

async function positiveSlippageEventHandler(
  event: newSlippage.slippage.PositiveSlippageEventInstance,
  ctx: SuiContext
) {
  const txDigest = ctx.transaction.digest;
  console.log(`Processing PositiveSlippageEvent in transaction ${txDigest}`);

  // Configuration constants - from config file (using BigInt to avoid overflow)
  const positiveThreshold = [
    1000000000000n, // 1,000,000,000,000 (1e12)
    10000000000000n, // 10,000,000,000,000 (1e13)
    100000000000000n, // 100,000,000,000,000 (1e14)
    1000000000000000n, // 1,000,000,000,000,000 (1e15)
  ];

  const positiveMaxTake = [
    30n, // 0.3%
    20n, // 0.2%
    15n, // 0.15%
    10n, // 0.1%
  ];

  const fromInfo = await getOrCreateCoin(ctx, event.type_arguments[0]);
  const toInfo = await getOrCreateCoin(ctx, event.type_arguments[1]);

  // Determine threshold index based on contract logic with proper BigInt handling
  const amountInValue = BigInt(event.data_decoded.amount_in_value);
  let thresholdIndex = 0;

  // Find the correct threshold index
  for (let i = 0; i < positiveThreshold.length; i++) {
    if (amountInValue <= positiveThreshold[i]) {
      thresholdIndex = i;
      break;
    }
  }

  // If amountInValue exceeds all thresholds, use the highest threshold (lowest fee rate)
  if (thresholdIndex >= positiveThreshold.length) {
    thresholdIndex = positiveThreshold.length - 1;
    console.log(
      `amountInValue ${amountInValue} exceeds all thresholds, using highest threshold index ${thresholdIndex}`
    );
  }

  // Ensure thresholdIndex is within bounds
  if (thresholdIndex >= positiveThreshold.length) {
    thresholdIndex = positiveThreshold.length - 1;
  }

  // Validate thresholdIndex is valid
  if (thresholdIndex < 0 || thresholdIndex >= positiveThreshold.length) {
    console.error(
      `Invalid thresholdIndex: ${thresholdIndex}, amountInValue: ${amountInValue}`
    );
    return; // Skip processing this event if threshold calculation fails
  }

  // Add detailed debugging information
  console.log(`amountInValue: ${amountInValue}`);
  console.log(`positiveThreshold: ${JSON.stringify(positiveThreshold)}`);
  console.log(`thresholdIndex: ${thresholdIndex}`);
  console.log(`selected threshold: ${positiveThreshold[thresholdIndex]}`);
  console.log(`selected maxTake: ${positiveMaxTake[thresholdIndex]}`);

  // Get maximum allowed take amount (following contract logic) with proper validation
  const maxTakeAmount =
    (Number(positiveMaxTake[thresholdIndex]) *
      Number(event.data_decoded.amount_out)) /
    10000;

  // Calculate actual positive slippage amount
  const positiveSlippage =
    Number(event.data_decoded.amount_out) -
    Number(event.data_decoded.expected_amount_out);

  // Validate positive slippage is positive
  if (positiveSlippage <= 0) {
    console.error(`Invalid positive slippage: ${positiveSlippage}`);
    return;
  }

  // Calculate take amount percentage of positive slippage
  const takePercent =
    (Number(event.data_decoded.take_amount) / positiveSlippage) * 100;

  // Calculate maximum allowed take percentage with validation
  const maxTakePercent = (maxTakeAmount / positiveSlippage) * 100;

  // Validate maxTakePercent is reasonable
  if (maxTakePercent <= 0 || maxTakePercent > 100) {
    console.error(`Invalid maxTakePercent: ${maxTakePercent}`);
    return;
  }

  ctx.eventLogger.emit("positiveSlippageEvent", {
    user: event.sender,
    from: event.type_arguments[0],
    fromSymbol: updateSymbol(fromInfo, event.type_arguments[0]),
    target: event.type_arguments[1],
    targetSymbol: updateSymbol(toInfo, event.type_arguments[1]),

    // Input token information
    amount_in: event.data_decoded.amount_in,
    amount_in_number:
      Number(event.data_decoded.amount_in) / Math.pow(10, fromInfo.decimal),
    amount_in_value: event.data_decoded.amount_in_value,

    // Output token information
    amount_out: event.data_decoded.amount_out,
    amount_out_number:
      Number(event.data_decoded.amount_out) / Math.pow(10, toInfo.decimal),

    // Expected output information
    expected_amount_out: event.data_decoded.expected_amount_out,
    expected_amount_out_number:
      Number(event.data_decoded.expected_amount_out) /
      Math.pow(10, toInfo.decimal),

    // Slippage fee information
    take_amount: event.data_decoded.take_amount,
    take_amount_number:
      Number(event.data_decoded.take_amount) / Math.pow(10, toInfo.decimal),

    // Slippage calculation metrics
    positive_slippage: positiveSlippage,
    positive_slippage_percent:
      (positiveSlippage / Number(event.data_decoded.expected_amount_out)) * 100,
    take_percent: takePercent,

    // Configuration validation information with proper BigInt handling
    threshold_index: thresholdIndex,
    threshold_value: positiveThreshold[thresholdIndex].toString(), // Use string to avoid BigInt overflow
    max_take_amount: maxTakeAmount,
    max_take_percent: maxTakePercent,

    // Transaction information
    txHash: ctx.transaction.digest,
    timestamp: ctx.timestamp,
  });
}

// Original event listeners
aggregator.slippage
  .bind({ startCheckpoint: START_CHECKPOINT })
  .onEventSwapEvent(swapEventHandler, { resourceChanges: true });

slippage
  .bind({ startCheckpoint: START_CHECKPOINT })
  .onEventExSwapWithReferralEvent(OnBehalfOfExSwapWithReferral, {
    resourceChanges: true,
  });

// New PositiveSlippageEvent listener
newSlippage.slippage
  .bind({ startCheckpoint: START_CHECKPOINT })
  .onEventPositiveSlippageEvent(positiveSlippageEventHandler, {
    resourceChanges: true,
  });

async function handleDcaOrderCreated(
  event: dca.order_registry.OrderCreatedInstance,
  ctx: SuiContext
) {
  const data = event.data_decoded;
  const [fromCoin, toCoin] = await Promise.all([
    getCoinContext(ctx, data.from_coin_type),
    getCoinContext(ctx, data.to_coin_type),
  ]);

  const depositedAmountNumber = toDecimalAmount(
    data.deposited_amount,
    fromCoin.decimals
  );
  const minAmountOutNumber = toDecimalAmount(
    data.min_amount_out,
    toCoin.decimals
  );
  const maxAmountOutNumber = toDecimalAmount(
    data.max_amount_out,
    toCoin.decimals
  );

  ctx.eventLogger.emit("dcaOrderCreated", {
    txHash: ctx.transaction.digest,
    sender: event.sender,
    order_id: data.order_id,
    gap_duration_ms: data.gap_duration_ms,
    gap_frequency: data.gap_frequency,
    gap_unit: data.gap_unit,
    order_num: data.order_num,
    cliff_duration_ms: data.cliff_duration_ms,
    cliff_frequency: data.cliff_frequency,
    cliff_unit: data.cliff_unit,
    min_amount_out: data.min_amount_out,
    min_amount_out_number: minAmountOutNumber,
    min_amount_out_usd: toUsdValue(minAmountOutNumber, toCoin.price),
    max_amount_out: data.max_amount_out,
    max_amount_out_number: maxAmountOutNumber,
    max_amount_out_usd: toUsdValue(maxAmountOutNumber, toCoin.price),
    deposited_amount: data.deposited_amount,
    deposited_amount_number: depositedAmountNumber,
    deposited_amount_usd: toUsdValue(depositedAmountNumber, fromCoin.price),
    from_coin_type: fromCoin.type,
    from_symbol: fromCoin.symbol,
    to_coin_type: toCoin.type,
    to_symbol: toCoin.symbol,
    created_at_ms: data.created_at_ms,
  });
}

async function handleDcaOrderFilled(
  event: dca.order_registry.OrderFilledInstance,
  ctx: SuiContext
) {
  const data = event.data_decoded;
  const [fromCoin, toCoin] = await Promise.all([
    getCoinContext(ctx, data.from_coin_type),
    getCoinContext(ctx, data.to_coin_type),
  ]);

  const borrowedNumber = toDecimalAmount(
    data.amount_in_borrowed,
    fromCoin.decimals
  );
  const spentNumber = toDecimalAmount(
    data.amount_in_spent,
    fromCoin.decimals
  );
  const amountOutNumber = toDecimalAmount(data.amount_out, toCoin.decimals);
  const protocolFeeNumber = toDecimalAmount(
    data.protocol_fee_charged,
    toCoin.decimals
  );

  ctx.eventLogger.emit("dcaOrderFilled", {
    txHash: ctx.transaction.digest,
    sender: event.sender,
    order_id: data.order_id,
    cycle_number: data.cycle_number,
    fulfilled_time_ms: data.fulfilled_time_ms,
    from_coin_type: fromCoin.type,
    from_symbol: fromCoin.symbol,
    to_coin_type: toCoin.type,
    to_symbol: toCoin.symbol,
    amount_in_borrowed: data.amount_in_borrowed,
    amount_in_borrowed_number: borrowedNumber,
    amount_in_borrowed_usd: toUsdValue(borrowedNumber, fromCoin.price),
    amount_in_spent: data.amount_in_spent,
    amount_in_spent_number: spentNumber,
    amount_in_spent_usd: toUsdValue(spentNumber, fromCoin.price),
    amount_out: data.amount_out,
    amount_out_number: amountOutNumber,
    amount_out_usd: toUsdValue(amountOutNumber, toCoin.price),
    protocol_fee_charged: data.protocol_fee_charged,
    protocol_fee_charged_number: protocolFeeNumber,
    protocol_fee_charged_usd: toUsdValue(protocolFeeNumber, toCoin.price),
  });
}

async function handleDcaOrderFinished(
  event: dca.order_registry.OrderFinishedInstance,
  ctx: SuiContext
) {
  const data = event.data_decoded;
  const [fromCoin, toCoin] = await Promise.all([
    getCoinContext(ctx, data.from_coin_type),
    getCoinContext(ctx, data.to_coin_type),
  ]);

  const amountInReturnedNumber = toDecimalAmount(
    data.amount_in_returned,
    fromCoin.decimals
  );

  ctx.eventLogger.emit("dcaOrderFinished", {
    txHash: ctx.transaction.digest,
    sender: event.sender,
    order_id: data.order_id,
    amount_in_returned: data.amount_in_returned,
    amount_in_returned_number: amountInReturnedNumber,
    amount_in_returned_usd: toUsdValue(amountInReturnedNumber, fromCoin.price),
    from_coin_type: fromCoin.type,
    from_symbol: fromCoin.symbol,
    to_coin_type: toCoin.type,
    to_symbol: toCoin.symbol,
    is_early_terminated: data.is_early_terminated,
  });
}

async function handleDcaCycleRefunded(
  event: dca.order_registry.CycleRefundedInstance,
  ctx: SuiContext
) {
  const data = event.data_decoded;
  const coin = await getCoinContext(ctx, data.token_type);
  const amountNumber = toDecimalAmount(data.amount, coin.decimals);

  ctx.eventLogger.emit("dcaCycleRefunded", {
    txHash: ctx.transaction.digest,
    sender: event.sender,
    order_id: data.order_id,
    user: data.user,
    token_type: coin.type,
    token_symbol: coin.symbol,
    amount: data.amount,
    amount_number: amountNumber,
    amount_usd: toUsdValue(amountNumber, coin.price),
    cycle_number: data.cycle_number,
    refunded_at_ms: data.refunded_at_ms,
  });
}

async function handleDcaPayoutSent(
  event: dca.order_registry.PayoutSentInstance,
  ctx: SuiContext
) {
  const data = event.data_decoded;
  const coin = await getCoinContext(ctx, data.token_type);
  const amountNumber = toDecimalAmount(data.amount, coin.decimals);

  ctx.eventLogger.emit("dcaPayoutSent", {
    txHash: ctx.transaction.digest,
    sender: event.sender,
    order_id: data.order_id,
    user: data.user,
    token_type: coin.type,
    token_symbol: coin.symbol,
    amount: data.amount,
    amount_number: amountNumber,
    amount_usd: toUsdValue(amountNumber, coin.price),
    cycle_number: data.cycle_number,
    sent_at_ms: data.sent_at_ms,
  });
}

dca.order_registry
  .bind({ startCheckpoint: START_CHECKPOINT })
  .onEventOrderCreated(handleDcaOrderCreated, { resourceChanges: true })
  .onEventOrderFilled(handleDcaOrderFilled, { resourceChanges: true })
  .onEventOrderFinished(handleDcaOrderFinished, { resourceChanges: true })
  .onEventCycleRefunded(handleDcaCycleRefunded, { resourceChanges: true })
  .onEventPayoutSent(handleDcaPayoutSent, { resourceChanges: true });
