import { SuiContext } from "@sentio/sdk/sui";
import {
  market_query,
  obligation_query,
} from "./types/sui/0xbd4f1adbef14cf6ddf31cf637adaa7227050424286d733dc44e6fd3318fc6ba3.js";
import { LogLevel } from "@sentio/sdk";

export const collateralDataEventHandler = async (
  event: obligation_query.CollateralDataInstance,
  ctx: SuiContext
) => {
  // parse data
  const type = event.data_decoded.type;
  const amount = event.data_decoded.amount;
  // const coinSymbol = type.name.split("::")[2];

  // emit event log
  ctx.eventLogger.emit("CollateralDataEvent", {
    type,
    amount,
    env: "mainnet",
    severity: LogLevel.INFO, // optional
    message: `CollateralData ${type} ${amount}`, // optional, enable for better text search
    project: "scallop",
  });
};

export const debtDataEventHandler = async (
  event: obligation_query.DebtDataInstance,
  ctx: SuiContext
) => {
  // parse data
  const type = event.data_decoded.type;
  const amount = event.data_decoded.amount;
  // const coinSymbol = type.name.split("::")[2];

  // emit event log
  ctx.eventLogger.emit("DebtDataEvent", {
    type,
    amount,
    env: "mainnet",
    severity: LogLevel.INFO, // optional
    message: `DebtData ${type} ${amount}`, // optional, enable for better text search
    project: "scallop",
  });
};

export const obligationDataEventHandler = async (
  event: obligation_query.ObligationDataInstance,
  ctx: SuiContext
) => {
  // parse data
  const debts = event.data_decoded.debts;
  for (let i = 0; i < debts.length; i++) {
    const debt = debts[i];
    const type = debt.type;
    const amount = debt.amount;

    // emit event log
    ctx.eventLogger.emit("ObligationDataEvent-Debt", {
      // distinctId: sender,
      i,
      type,
      debt,
      amount,

      env: "mainnet",
      severity: LogLevel.INFO, // optional
      message: `Obligation Data Debt: ${type}, ${debt}, ${amount}`, // optional, enable for better text search
      project: "scallop",
    });
  }
  const collaterals = event.data_decoded.collaterals;
  for (let i = 0; i < collaterals.length; i++) {
    const collateral = collaterals[i];
    const type = collateral.type;
    const amount = collateral.amount;

    // emit event log
    ctx.eventLogger.emit("ObligationDataEvent-Collateral", {
      // distinctId: sender,
      i,
      type,
      amount,

      env: "mainnet",
      severity: LogLevel.INFO, // optional
      message: `Obligation Data Collateral: ${type}, ${amount}`, // optional, enable for better text search
      project: "scallop",
    });
  }
};

export const marketCollateralDataEventHandler = async (
  event: market_query.CollateralDataInstance,
  ctx: SuiContext
) => {
  // parse data
  const collateral = event.data_decoded;
  const type = collateral.type;
  const collateralFactor = collateral.collateralFactor;
  const liquidationFactor = collateral.liquidationFactor;
  const liquidationPanelty = collateral.liquidationPanelty;
  const liquidationDiscount = collateral.liquidationDiscount;
  const liquidationReserveFactor = collateral.liquidationReserveFactor;
  const maxCollateralAmount = collateral.maxCollateralAmount;
  const totalCollateralAmount = collateral.totalCollateralAmount;

  // emit event log
  ctx.eventLogger.emit("MarketCollateralDataEvent", {
    type,
    collateralFactor,
    liquidationFactor,
    liquidationPanelty,
    liquidationDiscount,
    liquidationReserveFactor,
    maxCollateralAmount,
    totalCollateralAmount,
    env: "mainnet",
    severity: LogLevel.INFO, // optional
    message: `MarketCollateralData ${type} ${totalCollateralAmount}`, // optional, enable for better text search
    project: "scallop",
  });
};

export const marketPoolDataEventHandler = async (
  event: market_query.PoolDataInstance,
  ctx: SuiContext
) => {
  // parse data
  const pool = event.data_decoded;
  const type = pool.type;
  const cash = pool.cash;
  const debt = pool.debt;
  const reserve = pool.reserve;
  const reserveFactor = pool.reserveFactor;
  const interestRate = pool.interestRate;
  const lastUpdated = pool.lastUpdated;
  const borrowWeight = pool.borrowWeight;
  const borrowIndex = pool.borrowIndex;
  const marketCoinSupply = pool.marketCoinSupply;

  // emit event log
  ctx.eventLogger.emit("MarketPoolDataEvent", {
    type,
    cash,
    debt,
    reserve,
    reserveFactor,
    interestRate,
    lastUpdated,
    borrowWeight,
    borrowIndex,
    marketCoinSupply,
    env: "mainnet",
    severity: LogLevel.INFO, // optional
    message: `MarketPoolData ${type} ${reserve}`, // optional, enable for better text search
    project: "scallop",
  });
};

export const marketDataEventHandler = async (
  event: market_query.MarketDataInstance,
  ctx: SuiContext
) => {
  // parse data
  const pools = event.data_decoded.pools;
  for (let i = 0; i < pools.length; i++) {
    const pool = pools[i];
    const type = pool.type;
    const cash = pool.cash;
    const debt = pool.debt;
    const reserve = pool.reserve;
    const reserveFactor = pool.reserveFactor;
    const interestRate = pool.interestRate;
    const lastUpdated = pool.lastUpdated;
    const borrowWeight = pool.borrowWeight;
    const borrowIndex = pool.borrowIndex;
    const marketCoinSupply = pool.marketCoinSupply;

    //Update metrics
    ctx.meter.Counter(`market_pool_${i}_tx_count`).add(1, {
      type: "market_pool",
      env: "mainnet",
      project: "scallop",
    });

    // emit event log
    ctx.eventLogger.emit("MarketDataEvent-Pool", {
      // distinctId: sender,
      i,
      type,
      cash,
      debt,
      reserve,
      reserveFactor,
      interestRate,
      lastUpdated,
      borrowWeight,
      borrowIndex,
      marketCoinSupply,

      env: "mainnet",
      severity: LogLevel.INFO, // optional
      message: `Market Data Pool: ${type}, ${cash}, ${debt}, ${reserve}`, // optional, enable for better text search
      project: "scallop",
    });
  }
  const collaterals = event.data_decoded.collaterals;
  for (let i = 0; i < collaterals.length; i++) {
    const collateral = collaterals[i];
    const type = collateral.type;
    const collateralFactor = collateral.collateralFactor;
    const liquidationFactor = collateral.liquidationFactor;
    const liquidationPanelty = collateral.liquidationPanelty;
    const liquidationDiscount = collateral.liquidationDiscount;
    const liquidationReserveFactor = collateral.liquidationReserveFactor;
    const maxCollateralAmount = collateral.maxCollateralAmount;
    const totalCollateralAmount = collateral.totalCollateralAmount;

    //Update metrics
    ctx.meter.Counter(`market_collateral_${i}_tx_count`).add(1, {
      type: "market_collateral",
      env: "mainnet",
      project: "scallop",
    });

    // emit event log
    ctx.eventLogger.emit("MarketDataEvent-Collateral", {
      // distinctId: sender,
      i,
      type,
      collateralFactor,
      liquidationFactor,
      liquidationPanelty,
      liquidationDiscount,
      liquidationReserveFactor,
      maxCollateralAmount,
      totalCollateralAmount,

      env: "mainnet",
      severity: LogLevel.INFO, // optional
      message: `Market Data Collateral: ${type}, ${totalCollateralAmount}`, // optional, enable for better text search
      project: "scallop",
    });
  }
};
