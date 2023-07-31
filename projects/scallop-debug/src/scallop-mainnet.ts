import { getPriceByType } from "@sentio/sdk/utils";
import { ChainId } from "@sentio/chain";
import { SuiNetwork, SuiObjectProcessor } from "@sentio/sdk/sui";

import {
  borrow,
  deposit_collateral,
  flash_loan,
  liquidate,
  mint,
  open_obligation,
  redeem,
  repay,
  withdraw_collateral,
} from "./types/sui/0xefe8b36d5b2e43728cc323298626b83177803521d195cfb11e15b910e892fddf.js";
import {
  borrowEventHandler,
  borrowFlashloanEventHandler,
  collateralDepositEventHandler,
  collateralWithdrawEventHandler,
  liquidateEventHandler,
  mintEventHandler,
  obligationCreatedEventHandler,
  redeemEventHandler,
  repayEventHandler,
} from "./event-handlers.js";

import {
  market_query,
  obligation_query,
} from "./types/sui/0xbd4f1adbef14cf6ddf31cf637adaa7227050424286d733dc44e6fd3318fc6ba3.js";
import {
  collateralDataEventHandler,
  debtDataEventHandler,
  marketCollateralDataEventHandler,
  marketDataEventHandler,
  marketPoolDataEventHandler,
  obligationDataEventHandler,
} from "./query-handlers.js";
import { BigDecimal } from "@sentio/sdk";

export const COINS = ["SUI", "USDC"];
export const DECIMAL_USDC = 6;
export const DECIMAL_SUI = 9;
const MARKET_ID =
  "0xa757975255146dc9686aa823b7838b507f315d704f428cbadad2f4ea061939d9";
const MARKET_QUERY =
  "0xa757975255146dc9686aa823b7838b507f315d704f428cbadad2f4ea061939d9";

// import { SuiKit, SuiTxBlock } from "@scallop-io/sui-kit";
// import { ScallopClient } from "@scallop-io/sui-scallop-sdk";

// export const metricsMap = new Map<string, number>();

//------------- Event Logs---------------//
// add collateral deposit and withdraw events (Collateral)
deposit_collateral
  .bind({
    startCheckpoint: 7970000n,
  })
  .onEventCollateralDepositEvent(collateralDepositEventHandler);
withdraw_collateral
  .bind({
    startCheckpoint: 7970000n,
  })
  .onEventCollateralWithdrawEvent(collateralWithdrawEventHandler);

// add borrow and repay events (Borrowing)
borrow
  .bind({
    startCheckpoint: 7970000n,
  })
  .onEventBorrowEvent(borrowEventHandler);
repay
  .bind({
    startCheckpoint: 7970000n,
  })
  .onEventRepayEvent(repayEventHandler);

//add obligation created and liquidate events (Common)
open_obligation
  .bind({
    startCheckpoint: 7970000n,
  })
  .onEventObligationCreatedEvent(obligationCreatedEventHandler);
liquidate
  .bind({
    startCheckpoint: 7970000n,
  })
  .onEventLiquidateEvent(liquidateEventHandler);

// add mint and redeem events (Lending)
mint
  .bind({
    startCheckpoint: 7970000n,
  })
  .onEventMintEvent(mintEventHandler);
redeem
  .bind({
    startCheckpoint: 7970000n,
  })
  .onEventRedeemEvent(redeemEventHandler);

// add borrow and repay flashloan events (Flashloan)
flash_loan
  .bind({
    startCheckpoint: 7970000n,
  })
  .onEventBorrowFlashLoanEvent(borrowFlashloanEventHandler)
  .onEventRepayFlashLoanEvent(borrowFlashloanEventHandler);

// add market & obligation query
market_query
  .bind({
    startCheckpoint: 7970000n,
  })
  .onEventMarketData(marketDataEventHandler)
  .onEventCollateralData(marketCollateralDataEventHandler)
  .onEventPoolData(marketPoolDataEventHandler);

obligation_query
  .bind({
    startCheckpoint: 7970000n,
  })
  .onEventObligationData(obligationDataEventHandler)
  .onEventCollateralData(collateralDataEventHandler)
  .onEventDebtData(debtDataEventHandler);

// Update market metrics every 10 mins
// SuiObjectProcessor.bind({
//   objectId: MARKET_ID,
//   network: SuiNetwork.MAIN_NET,
//   startCheckpoint: 7970000n,
// }).onTimeInterval(
//   async (self, _, ctx) => {
//     const suiAddress = "0x2::sui::SUI";
//     const ethUsdcAddress = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48";
//     try {
//       // console.log(`Interval-Begin: Metrics<${metricsMap.size}>`, [
//       //   ...metricsMap.entries(),
//       // ]);
//       //get market price
//       const suiPrice =
//         (await getPriceByType(
//           SuiNetwork.MAIN_NET,
//           suiAddress,
//           ctx.timestamp
//         )) || 0;
//       const ethUsdcPrice =
//         (await getPriceByType(
//           ChainId.ETHEREUM,
//           ethUsdcAddress,
//           ctx.timestamp
//         )) || 0;
//       console.log(
//         `[${ctx.timestamp.toISOString()}: SUI $<${suiPrice}>, eUSDC $<${ethUsdcPrice}>`
//       );

//       // //compute total borrowing amount
//       // const totalSuiBorrowAmount =
//       //   metricsMap.get("total_borrow_amount_sui") || 0;
//       // const totalSuiRepayAmount = metricsMap.get("total_repay_amount_sui") || 0;
//       // const totalSuiBorrowingAmount = Math.max(
//       //   0,
//       //   totalSuiBorrowAmount - totalSuiRepayAmount
//       // );
//       // console.log(
//       //   `Metrics<${metricsMap.size}>, SUI amt<${totalSuiBorrowingAmount}>: borrow<${totalSuiBorrowAmount}>, repay<${totalSuiRepayAmount}>`
//       // );
//       // const totalUsdcBorrowAmount =
//       //   metricsMap.get("total_borrow_amount_usdc") || 0;
//       // const totalUsdcRepayAmount =
//       //   metricsMap.get("total_repay_amount_usdc") || 0;
//       // const totalUsdcBorrowingAmount = Math.max(
//       //   0,
//       //   totalUsdcBorrowAmount - totalUsdcRepayAmount
//       // );
//       // console.log(
//       //   `Metrics<${metricsMap.size}>, USDC amt<${totalUsdcBorrowingAmount}>: borrow<${totalUsdcBorrowAmount}>, repay<${totalUsdcRepayAmount}>`
//       // );
//       // const totalBorrowingValue =
//       //   totalSuiBorrowingAmount * suiPrice +
//       //   totalUsdcBorrowingAmount * ethUsdcPrice;
//       // console.log(`Total Borrowing Value<${totalBorrowingValue}>`);

//       // //Update metrics
//       // ctx.meter
//       //   .Gauge("total_borrowing_amount_sui")
//       //   .record(totalSuiBorrowingAmount, {
//       //     token: "sui",
//       //     type: "total_amount",
//       //     env: "mainnet",
//       //     project: "scallop",
//       //   });
//       // ctx.meter
//       //   .Gauge("total_borrowing_amount_usdc")
//       //   .record(totalUsdcBorrowingAmount, {
//       //     token: "usdc",
//       //     type: "total_amount",
//       //     env: "mainnet",
//       //     project: "scallop",
//       //   });
//       // ctx.meter.Gauge("total_borrowing_value").record(totalBorrowingValue, {
//       //   type: "total_value",
//       //   env: "mainnet",
//       //   project: "scallop",
//       // });

//       // //compute total lending amount
//       // const totalSuiMintAmount = metricsMap.get("total_mint_amount_sui") || 0;
//       // const totalSuiRedeemAmount =
//       //   metricsMap.get("total_redeem_amount_sui") || 0;
//       // const totalSuiLendingAmount = Math.max(
//       //   0,
//       //   totalSuiMintAmount - totalSuiRedeemAmount
//       // );
//       // console.log(
//       //   `Metrics<${metricsMap.size}>, SUI amt<${totalSuiLendingAmount}>: mint<${totalSuiMintAmount}>, redeem<${totalSuiRedeemAmount}>`
//       // );
//       // const totalUsdcMintAmount = metricsMap.get("total_mint_amount_usdc") || 0;
//       // const totalUsdcRedeemAmount =
//       //   metricsMap.get("total_redeem_amount_usdc") || 0;
//       // const totalUsdcLendingAmount = Math.max(
//       //   0,
//       //   totalUsdcMintAmount - totalUsdcRedeemAmount
//       // );
//       // console.log(
//       //   `Metrics<${metricsMap.size}>, USDC amt<${totalUsdcLendingAmount}>: mint<${totalUsdcMintAmount}>, redeem<${totalUsdcRedeemAmount}>`
//       // );
//       // const totalLendingValue =
//       //   totalSuiLendingAmount * suiPrice +
//       //   totalUsdcLendingAmount * ethUsdcPrice;
//       // console.log(`Total Lending Value<${totalLendingValue}>`);

//       // //Update metrics
//       // ctx.meter
//       //   .Gauge("total_lending_amount_sui")
//       //   .record(totalSuiLendingAmount, {
//       //     token: "sui",
//       //     type: "total_amount",
//       //     env: "mainnet",
//       //     project: "scallop",
//       //   });
//       // ctx.meter
//       //   .Gauge("total_lending_amount_usdc")
//       //   .record(totalUsdcLendingAmount, {
//       //     token: "usdc",
//       //     type: "total_amount",
//       //     env: "mainnet",
//       //     project: "scallop",
//       //   });
//       // ctx.meter.Gauge("total_lending_value").record(totalLendingValue, {
//       //   type: "total_value",
//       //   env: "mainnet",
//       //   project: "scallop",
//       // });

//       // //compute total collateral amount
//       // const totalSuiDepositAmount =
//       //   metricsMap.get("total_collateral_deposit_amount_sui") || 0;
//       // const totalSuiWithdrawAmount =
//       //   metricsMap.get("total_collateral_withdraw_amount_sui") || 0;
//       // const totalSuiCollateralAmount = Math.max(
//       //   0,
//       //   totalSuiDepositAmount - totalSuiWithdrawAmount
//       // );
//       // console.log(
//       //   `Metrics<${metricsMap.size}>, SUI amt<${totalSuiCollateralAmount}>: deposit<${totalSuiDepositAmount}>, withdraw<${totalSuiWithdrawAmount}>`
//       // );
//       // const totalUsdcDepositAmount =
//       //   metricsMap.get("total_collateral_deposit_amount_usdc") || 0;
//       // const totalUsdcWithdrawAmount =
//       //   metricsMap.get("total_collateral_withdraw_amount_usdc") || 0;
//       // const totalUsdcCollateralAmount = Math.max(
//       //   0,
//       //   totalUsdcDepositAmount - totalUsdcWithdrawAmount
//       // );
//       // console.log(
//       //   `Metrics<${metricsMap.size}>, USDC amt<${totalUsdcCollateralAmount}>: deposit<${totalUsdcDepositAmount}>, withdraw<${totalUsdcWithdrawAmount}>`
//       // );
//       // const totalCollateralValue =
//       //   totalSuiCollateralAmount * suiPrice +
//       //   totalUsdcCollateralAmount * ethUsdcPrice;
//       // console.log(`Total Collateral Value<${totalCollateralValue}>`);

//       // //Update metrics
//       // ctx.meter
//       //   .Gauge("total_collateral_amount_sui")
//       //   .record(totalSuiCollateralAmount, {
//       //     token: "sui",
//       //     type: "total_amount",
//       //     env: "mainnet",
//       //     project: "scallop",
//       //   });
//       // ctx.meter
//       //   .Gauge("total_collateral_amount_usdc")
//       //   .record(totalUsdcCollateralAmount, {
//       //     token: "usdc",
//       //     type: "total_amount",
//       //     env: "mainnet",
//       //     project: "scallop",
//       //   });
//       // ctx.meter.Gauge("total_collateral_value").record(totalCollateralValue, {
//       //   type: "total_value",
//       //   env: "mainnet",
//       //   project: "scallop",
//       // });

//       // const totalSupplyValue = totalCollateralValue + totalLendingValue;
//       // console.log(`Total Supply Value<${totalSupplyValue}>`);
//       // const tvl = Math.max(0, totalSupplyValue - totalBorrowingValue);
//       // console.log(`Total Value Locked<${tvl}>`);
//       // ctx.meter.Gauge("total_supply_value").record(totalSupplyValue, {
//       //   type: "total_value",
//       //   env: "mainnet",
//       //   project: "scallop",
//       // });
//       // ctx.meter.Gauge("tvl").record(tvl, {
//       //   type: "total_value",
//       //   env: "mainnet",
//       //   project: "scallop",
//       // });
//       // console.log(`Interval-End: Metrics<${metricsMap.size}>`, [
//       //   ...metricsMap.entries(),
//       // ]);
//     } catch (error) {
//       console.log("error: ", error);
//     }
//   },
//   10,
//   10,
//   undefined,
//   { owned: false }
// );
