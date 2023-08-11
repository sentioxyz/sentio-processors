import { SuiContext } from "@sentio/sdk/sui";
import { LogLevel, BigDecimal } from "@sentio/sdk";
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

const COIN_DECIMALS = new Map<string, number>([
  ["SUI", 9],
  ["CETUS", 9],
  ["USDC", 6],
  ["USDT", 6],
  ["ETH", 8],
  ["SOL", 8],
  ["APT", 8],
  ["BTC", 8],
]);
const WORMHOLE_COINS = new Map<string, string>([
  ["5d4b302506645c37ff133b98c4b50a5ae14841659738d6d733d59d0d217a93bf", "USDC"],
  ["c060006111016b8a020ad5b33834984a437aaa7d3c74c18e09a95d48aceab08c", "USDT"],
  ["af8cd5edc19c4512f4259f0bee101a40d41ebed738ade5874359610ef8eeced5", "ETH"],
  ["b7844e289a8410e50fb3ca48d69eb9cf29e27d223ef90353fe1bd8e27ff8f3f8", "SOL"],
  ["3a5143bb1196e3bcdfab6203d1683ae29edd26294fc8bfeafe4aaa9d2704df37", "APT"],
  ["027792d9fed7f9844eb4839566001bb6f6cb4804f66aa2da6fe1ee242d896881", "BTC"],
]);

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
  try {
    // parse data
    const sender = event.data_decoded[senderKey];
    const amount = event.data_decoded[amountKey];
    const coinType = event.data_decoded[coinTypeKey];
    const coinRawSymbol = coinType.name.split("::")[2];
    let coinSymbol = coinRawSymbol.toUpperCase();

    // compute real amount
    let amountCounter = `total_${type}_amount_`;
    let realAmount = new BigDecimal(0);
    let coinDecimal = COIN_DECIMALS.get(coinSymbol) || 8;
    switch (coinRawSymbol) {
      // case "SUI":
      //   amountCounter += "sui";
      //   realAmount = BigInt(amount).scaleDown(coinDecimal);
      //   break;
      case "COIN":
        const coinContract = coinType.name.split("::")[0];
        coinSymbol = WORMHOLE_COINS.get(coinContract) || "COIN";
        coinDecimal = COIN_DECIMALS.get(coinSymbol) || 8;

        amountCounter += coinSymbol.toLowerCase();
        realAmount = BigInt(amount).scaleDown(coinDecimal);
        break;
      default:
        amountCounter += coinSymbol.toLowerCase();
        realAmount = BigInt(amount).scaleDown(coinDecimal);
        break;
    }

    //Update metrics
    const txCountMetric = `${type}_tx_count`;
    ctx.meter.Counter(txCountMetric).add(1, {
      type: type,
      env: "mainnet",
      project: "scallop",
      ...additionalMetricProps,
    });

    ctx.meter.Counter(amountCounter).add(realAmount, {
      type: type,
      coin: coinRawSymbol,
      coin_symbol: coinSymbol,
      env: "mainnet",
      project: "scallop",
    });

    const amountGauge = `${type}_amount`;
    ctx.meter.Gauge(amountGauge).record(realAmount, {
      type: type,
      coin: coinRawSymbol,
      coin_symbol: coinSymbol,
      env: "mainnet",
      project: "scallop",
    });

    // Saving Net Amount
    let netAmountMetrix = "";
    switch (type) {
      case "borrow":
        netAmountMetrix = "net_borrowing_amount";
        ctx.meter.Counter(netAmountMetrix).add(realAmount, {
          type: "net_amount",
          coin_symbol: coinSymbol,
          env: "mainnet",
          project: "scallop",
        });
        break;
      case "repay":
        netAmountMetrix = "net_borrowing_amount";
        ctx.meter.Counter(netAmountMetrix).sub(realAmount, {
          type: "net_amount",
          coin_symbol: coinSymbol,
          env: "mainnet",
          project: "scallop",
        });
        break;
      case "collateral_deposit":
        netAmountMetrix = "net_collateral_amount";
        ctx.meter.Counter(netAmountMetrix).add(realAmount, {
          type: "net_amount",
          coin_symbol: coinSymbol,
          env: "mainnet",
          project: "scallop",
        });
        break;

      case "collateral_withdraw":
        netAmountMetrix = "net_collateral_amount";
        ctx.meter.Counter(netAmountMetrix).sub(realAmount, {
          type: "net_amount",
          coin_symbol: coinSymbol,
          env: "mainnet",
          project: "scallop",
        });
        break;
        break;
      case "mint":
        netAmountMetrix = "net_lending_amount";
        ctx.meter.Counter(netAmountMetrix).add(realAmount, {
          type: "net_amount",
          coin_symbol: coinSymbol,
          env: "mainnet",
          project: "scallop",
        });
        break;
      case "redeem":
        netAmountMetrix = "net_lending_amount";
        ctx.meter.Counter(netAmountMetrix).sub(realAmount, {
          type: "net_amount",
          coin_symbol: coinSymbol,
          env: "mainnet",
          project: "scallop",
        });
        break;
      case "borrow_flashloan":
        netAmountMetrix = "net_flashloan_amount";
        ctx.meter.Counter(netAmountMetrix).add(realAmount, {
          type: "net_amount",
          coin_symbol: coinSymbol,
          env: "mainnet",
          project: "scallop",
        });
        break;
      case "repay_flashloan":
        netAmountMetrix = "net_flashloan_amount";
        ctx.meter.Counter(netAmountMetrix).sub(realAmount, {
          type: "net_amount",
          coin_symbol: coinSymbol,
          env: "mainnet",
          project: "scallop",
        });
        break;
    }

    // emit event log
    ctx.eventLogger.emit(
      `${type.charAt(0).toUpperCase() + type.slice(1)}Event`,
      {
        distinctId: sender,
        sender,
        coinType,
        coin_symbol: coinSymbol,
        amount_real: realAmount,
        amount,
        env: "mainnet",
        severity: LogLevel.INFO,
        message: `${
          type.charAt(0).toUpperCase() + type.slice(1)
        } ${realAmount} ${coinSymbol}(${coinRawSymbol})`,
        project: "scallop",
        ...additionalLogProps,
      }
    );
  } catch (err) {
    console.error(`Error on handleEvent(${type}): `, err);
  }
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
  await handleEvent(
    event,
    ctx,
    "borrow_flashloan",
    "borrower",
    "amount",
    "asset"
  );
};

export const repayFlashloanEventHandler = async (
  event: flash_loan.RepayFlashLoanEventInstance,
  ctx: SuiContext
) => {
  await handleEvent(
    event,
    ctx,
    "repay_flashloan",
    "borrower",
    "amount",
    "asset"
  );
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
  await handleEvent(
    event,
    ctx,
    "mint",
    "minter",
    "deposit_amount",
    "deposit_asset",
    {
      mintType: event.data_decoded.mint_asset,
      mintAmount: event.data_decoded.mint_amount,
    }
  );
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
