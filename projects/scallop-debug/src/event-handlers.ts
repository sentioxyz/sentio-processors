import { SuiContext, SuiNetwork } from "@sentio/sdk/sui";
import { LogLevel, BigDecimal } from "@sentio/sdk";
import { ChainId } from "@sentio/chain";
import {
  borrow,
  repay,
  deposit_collateral,
  withdraw_collateral,
  mint,
  redeem,
  liquidate,
  open_obligation,
  flash_loan,
} from "./types/sui/0xefe8b36d5b2e43728cc323298626b83177803521d195cfb11e15b910e892fddf.js";
import { DECIMAL_SUI, DECIMAL_USDC } from "./scallop-mainnet.js";
import { getPriceByType } from "@sentio/sdk/utils";
import { EthChainId } from "@sentio/sdk/eth";

// Common Event Helper
const handleEvent = async (
  event: any,
  ctx: SuiContext,
  type: string,
  senderKey: string,
  amountKey: string,
  coinTypeKey: string,
  additionalLogProps = {},
  additionalMetricProps = {}
) => {
  // parse data
  const sender = event.data_decoded[senderKey];
  const amount = event.data_decoded[amountKey];
  const coinType = event.data_decoded[coinTypeKey];
  const coinSymbol = coinType.name.split("::")[2];

  //Update metrics
  const txCountMetric = `${type}_tx_count`;
  ctx.meter.Counter(txCountMetric).add(1, {
    type: type,
    env: "mainnet",
    project: "scallop",
    ...additionalMetricProps,
  });
  // if (metricsMap.has(txCountMetric)) {
  //   const txCount = metricsMap.get(txCountMetric) || 0;
  //   metricsMap.set(txCountMetric, txCount + 1);
  // } else {
  //   metricsMap.set(txCountMetric, 1);
  // }

  let amountMetric = `total_${type}_amount_`;
  let realAmount = new BigDecimal(0);
  switch (coinSymbol) {
    case "SUI":
      amountMetric += "sui";
      realAmount = BigInt(amount).scaleDown(DECIMAL_SUI);
      break;
    case "COIN":
      amountMetric += "usdc";
      realAmount = BigInt(amount).scaleDown(DECIMAL_USDC);
      break;
    default:
      break;
  }
  ctx.meter.Counter(amountMetric).add(realAmount, {
    type: type,
    coin: coinSymbol,
    env: "mainnet",
    project: "scallop",
  });
  // if (metricsMap.has(amountMetric)) {
  //   const totalAmount = metricsMap.get(amountMetric)!;
  //   metricsMap.set(amountMetric, totalAmount + realAmount.toNumber());
  // } else {
  //   metricsMap.set(amountMetric, realAmount.toNumber());
  // }
  //get market price
  let suiPrice;
  let ethUsdcPrice;
  const suiAddress = "0x2::sui::SUI";
  const ethUsdcAddress = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48";

  try {
    suiPrice = await getPriceByType(
      SuiNetwork.MAIN_NET,
      suiAddress,
      ctx.timestamp
    );
    ethUsdcPrice = await getPriceByType(
      EthChainId.ETHEREUM,
      ethUsdcAddress,
      ctx.timestamp
    );
  } catch (error) {
    console.log("Error at getPriceByType():", error);
  }
  if (!suiPrice) suiPrice = 0
  if (!ethUsdcPrice) ethUsdcPrice = 0

  ctx.meter.Gauge("sui_price").record(suiPrice, {
    token: "sui",
    type: "price",
    env: "mainnet",
    project: "scallop",
  });
  ctx.meter.Gauge("usdc_price").record(ethUsdcPrice, {
    token: "usdc",
    type: "price",
    env: "mainnet",
    project: "scallop",
  });

  // emit event log
  ctx.eventLogger.emit(`${type.charAt(0).toUpperCase() + type.slice(1)}Event`, {
    distinctId: sender,
    sender,
    coinType,
    amount,
    env: "mainnet",
    severity: LogLevel.INFO,
    message: `${type.charAt(0).toUpperCase() + type.slice(1)
      } ${realAmount} ${coinSymbol}`,
    project: "scallop",
    ...additionalLogProps,
  });
};

// Handlers
export const borrowEventHandler = async (
  event: borrow.BorrowEventInstance,
  ctx: SuiContext
) => {
  await handleEvent(event, ctx, "borrow", "borrower", "amount", "asset");
};

export const repayEventHandler = async (
  event: repay.RepayEventInstance,
  ctx: SuiContext
) => {
  await handleEvent(event, ctx, "repay", "repayer", "amount", "asset");
};

// add flashloan handlers
export const borrowFlashloanEventHandler = async (
  event: flash_loan.BorrowFlashLoanEventInstance,
  ctx: SuiContext
) => {
  await handleEvent(event, ctx, "borrow_flashloan", "borrower", "amount", "asset");
};

export const repayFlashloanEventHandler = async (
  event: flash_loan.RepayFlashLoanEventInstance,
  ctx: SuiContext
) => {
  await handleEvent(event, ctx, "repay_flashloan", "borrower", "amount", "asset");
};

export const collateralWithdrawEventHandler = async (
  event: withdraw_collateral.CollateralWithdrawEventInstance,
  ctx: SuiContext
) => {
  await handleEvent(
    event,
    ctx,
    "collateral_withdraw",
    "taker",
    "withdraw_amount",
    "withdraw_asset"
  );
};

export const collateralDepositEventHandler = async (
  event: deposit_collateral.CollateralDepositEventInstance,
  ctx: SuiContext
) => {
  await handleEvent(
    event,
    ctx,
    "collateral_deposit",
    "provider",
    "deposit_amount",
    "deposit_asset"
  );
};

export const redeemEventHandler = async (
  event: redeem.RedeemEventInstance,
  ctx: SuiContext
) => {
  await handleEvent(
    event,
    ctx,
    "redeem",
    "redeemer",
    "withdraw_amount",
    "withdraw_asset",
    {
      burnType: event.data_decoded.burn_asset,
      burnAmount: event.data_decoded.burn_amount,
    }
  );
};

export const mintEventHandler = async (
  event: mint.MintEventInstance,
  ctx: SuiContext
) => {
  await handleEvent(event, ctx, "mint", "minter", "deposit_amount", "deposit_asset", {
    mintType: event.data_decoded.mint_asset,
    mintAmount: event.data_decoded.mint_amount,
  });
};

export const obligationCreatedEventHandler = async (
  event: open_obligation.ObligationCreatedEventInstance,
  ctx: SuiContext
) => {
  //Update metrics
  ctx.meter.Counter("obligation_created_tx_count").add(1, {
    type: "obligation_created",
    env: "mainnet",
    project: "scallop",
  });

  // emit event log
  ctx.eventLogger.emit("ObligationCreatedEvent", {
    distinctId: event.data_decoded.sender,
    sender: event.data_decoded.sender,
    obligation: event.data_decoded.obligation,
    obligationKey: event.data_decoded.obligation_key,
    env: "mainnet",
    severity: LogLevel.INFO,
    message: `Obligation ${event.data_decoded.obligation} Created`,
    project: "scallop",
  });
};

export const liquidateEventHandler = async (
  event: liquidate.LiquidateEventInstance,
  ctx: SuiContext
) => {
  // update metrics
  ctx.meter.Counter("liquidate_tx_count").add(1, {
    type: "liquidate",
    env: "mainnet",
    project: "scallop",
  });

  // emit event log
  ctx.eventLogger.emit("LiquidateEvent", {
    distinctId: event.data_decoded.liquidator,
    sender: event.data_decoded.liquidator,
    obligation: event.data_decoded.obligation,
    debtType: event.data_decoded.debt_type,
    collateralType: event.data_decoded.collateral_type,
    repayOnBehalf: event.data_decoded.repay_on_behalf,
    repayRevenue: event.data_decoded.repay_revenue,
    liqAmount: event.data_decoded.liq_amount,
    env: "mainnet",
    severity: LogLevel.INFO,
    message: `Liquidate ${event.data_decoded.obligation}`,
    project: "scallop",
  });
};
