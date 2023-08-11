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
  repayFlashloanEventHandler,
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
import { SuiNetwork, SuiObjectProcessor } from "@sentio/sdk/sui";

const START_CHECKPOINT = 7970000n;

const MARKET_ID =
  "0xa757975255146dc9686aa823b7838b507f315d704f428cbadad2f4ea061939d9";
// const MARKET_QUERY =
//   "0xa757975255146dc9686aa823b7838b507f315d704f428cbadad2f4ea061939d9";
// import { SuiKit, SuiTxBlock } from "@scallop-io/sui-kit";
// import { Scallop } from "@scallop-io/sui-scallop-sdk";
const Scallop = require("@scallop-io/sui-scallop-sdk");

//------------- Event Logs---------------//
// add collateral deposit and withdraw events (Collateral)
deposit_collateral
  .bind({ startCheckpoint: START_CHECKPOINT })
  .onEventCollateralDepositEvent(collateralDepositEventHandler);
withdraw_collateral
  .bind({ startCheckpoint: START_CHECKPOINT })
  .onEventCollateralWithdrawEvent(collateralWithdrawEventHandler);

// add borrow and repay events (Borrowing)
borrow
  .bind({ startCheckpoint: START_CHECKPOINT })
  .onEventBorrowEvent(borrowEventHandler);
repay
  .bind({ startCheckpoint: START_CHECKPOINT })
  .onEventRepayEvent(repayEventHandler);

//add obligation created and liquidate events (Common)
open_obligation
  .bind({ startCheckpoint: START_CHECKPOINT })
  .onEventObligationCreatedEvent(obligationCreatedEventHandler);
liquidate
  .bind({ startCheckpoint: START_CHECKPOINT })
  .onEventLiquidateEvent(liquidateEventHandler);

// add mint and redeem events (Lending)
mint
  .bind({ startCheckpoint: START_CHECKPOINT })
  .onEventMintEvent(mintEventHandler);
redeem
  .bind({ startCheckpoint: START_CHECKPOINT })
  .onEventRedeemEvent(redeemEventHandler);

// add borrow and repay flashloan events (Flashloan)
flash_loan
  .bind({ startCheckpoint: START_CHECKPOINT })
  .onEventBorrowFlashLoanEvent(borrowFlashloanEventHandler)
  .onEventRepayFlashLoanEvent(repayFlashloanEventHandler);

// add market & obligation query
market_query
  .bind({ startCheckpoint: START_CHECKPOINT })
  .onEventMarketData(marketDataEventHandler)
  .onEventCollateralData(marketCollateralDataEventHandler)
  .onEventPoolData(marketPoolDataEventHandler);

obligation_query
  .bind({ startCheckpoint: START_CHECKPOINT })
  .onEventObligationData(obligationDataEventHandler)
  .onEventCollateralData(collateralDataEventHandler)
  .onEventDebtData(debtDataEventHandler);

//---------------- onTimeInterval---------------//
// Update market metrics every 10 mins
SuiObjectProcessor.bind({
  objectId: MARKET_ID,
  network: SuiNetwork.MAIN_NET,
  startCheckpoint: START_CHECKPOINT,
}).onTimeInterval(
  async (self, _, ctx) => {
    try {
      const scallopSDK = new Scallop({
        // secretKey: process.env.SECRET_KEY,
        networkType: "mainnet",
      });
      const client = await scallopSDK.createScallopClient();
      const marketData = await client.queryMarket();
      console.info("marketData:", marketData);

      //Update metrics
      // for (const metric of metricsMap.entries()) {
      //   const coinSymbol = metric[0].split("_")[3].toUpperCase();
      //   const metricName = metric[0].substring(0, metric[0].lastIndexOf("_")); // "net_xxx_amount";
      //   const metricValue = metric[1];
      //   ctx.meter.Gauge(metricName).record(metricValue, {
      //     type: "net_amount",
      //     coin_symbol: coinSymbol,
      //     env: "mainnet",
      //     project: "scallop",
      //   });
      //   // console.log(
      //   //   `[${ctx.timestamp.toISOString()}]size(${metricsMap.size}):
      //   //   ${metricName}-<${metricValue}> (${coinSymbol})`
      //   // );
      // }
    } catch (error) {
      console.log("error: ", error);
    }
  },
  10,
  10,
  undefined,
  { owned: false }
);
