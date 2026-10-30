// @ts-nocheck

import { Counter, Gauge } from "@sentio/sdk";
import { SuiNetwork } from "@sentio/sdk/sui"
import { spot_dex } from "./types/sui/swap.js";
import { getCoinTypeFriendlyName, getPairFriendlyName, getPoolInfo } from "./helpers/swap-helpers.js";

/* Swap metrics */

// [Counter] Total No.Of Swap txns
const SwapTxnCounter = Counter.register("SwapTxnCounter");
// [Counter] Cumulative Volume.
const SwapVolumeDollarCounter = Counter.register("SwapVolumeDollarCounter");
// [Gauge] Dollar Value of every Swap at that time.
const SwapVolumeDollarGauge = Gauge.register("SwapVolumeDollarGauge");
// [Gauge] No. Of Token X traded in each swap
const SwapVolumeTokenXGauge = Gauge.register("SwapVolumeTokenXGauge");
// [Gauge] No. Of Token Y traded in each swap
const SwapVolumeTokenYGauge = Gauge.register("SwapVolumeTokenYGauge");
// [Gauge] Sentio price of A in dollar.
const PriceAToB = Gauge.register("PriceAToB");
// [Gauge] Sentio price of B in dollar.
const PriceBToA = Gauge.register("PriceBToA");

/* LP metrics */

// [Counter] Total no. of remove LP txns
const RemoveLPTxnCounter = Counter.register("RemoveLPTxnCounter");
// [Counter] Total no. of add LP txns
const AddLPTxnCounter = Counter.register("AddLPTxnCounter");
// [Counter] of current token X balance in pool, derived from both add and remove LP events counting.
const TokenXBalanceCounter = Counter.register("TokenXBalanceCounter");
// [Counter] of current token Y balance in pool, derived from both add and remove LP events counting.
const TokenYBalanceCounter = Counter.register("TokenYBalanceCounter");
// [Gauge] Dollar value of Liquidity added or removed in every txn (both tokens combined)
const DollarInflowOutflowGauge = Gauge.register("DollarInflowOutflowGauge");
// [Gauge] Amount of tokens X added or remove in an LP event.
const TokenXInflowOutflowGauge = Gauge.register("TokenXInflowOutflowGauge");
// [Gauge] Amount of tokens Y added or remove in an LP event.
const TokenYInflowOutflowGauge = Gauge.register("TokenYInflowOutflowGauge");

spot_dex
  .bind({
    address:
      "0xa0eba10b173538c8fecca1dff298e488402cc9ff374f8a12ca7758eebe830b66",
    network: SuiNetwork.MAIN_NET,
    startCheckpoint: 100000n,
  })
  .onEventSwapEvent(async (event, ctx) => {
    const { amount_in, amount_out, pool_id, user, reserve_x, reserve_y } = event.data_decoded;
    const [coinTypeSwapped] = event.type_arguments;

    const poolInfo = await getPoolInfo(ctx, pool_id);

    if (pool_id !== "0x897f66772935ef417426c2ca4d55a399972a7dea38585ea610d7a3f7481482b1" && poolInfo) {
      const {
        coinTypeA,
        coinTypeB,
        priceA,
        priceB,
        scaleX,
        scaleY,
        reserveX,
        reserveY,
      } = poolInfo;

      const isAToB = coinTypeA === coinTypeSwapped;

      console.log(
        coinTypeA,
        coinTypeB,
        coinTypeSwapped,
        isAToB,
        priceA,
        priceB
      );

      const amountIn = Number(amount_in) / (isAToB ? scaleX : scaleY);
      const amountOut = Number(amount_out) / (isAToB ? scaleY : scaleX);

      const dollarIn = amountIn * (isAToB ? priceA! : priceB!);
      const dollarOut = amountOut * (!isAToB ? priceA! : priceB!);

      ctx.eventLogger.emit("SwapEvent", {
        poolId: pool_id,
        user: user,
        amountIn: amountIn,
        amountOut: amountOut,
        dollarIn: dollarIn,
        dollarOut: dollarOut,
        coinTypeSwapped: coinTypeSwapped,
        typeX: coinTypeA,
        typeY: coinTypeB,
      });

      let swapMetadata = {
        pair: getPairFriendlyName(coinTypeA, coinTypeB),
        coin_symbol:
          isAToB
            ? getCoinTypeFriendlyName(coinTypeA)
            : getCoinTypeFriendlyName(coinTypeB)
      };

      SwapTxnCounter.add(ctx, 1, swapMetadata);
      SwapVolumeDollarCounter.add(ctx, dollarIn, swapMetadata);
      SwapVolumeDollarGauge.record(ctx, dollarIn, swapMetadata);

      if (isAToB) {
        // x metrics
        SwapVolumeTokenXGauge.record(ctx, amountIn, swapMetadata);
        TokenXBalanceCounter.add(ctx, Number(amountIn), { coin_symbol: getCoinTypeFriendlyName(coinTypeA), pair: getPairFriendlyName(coinTypeA, coinTypeB) });
        TokenXInflowOutflowGauge.record(ctx, Number(amountIn), { coin_symbol: getCoinTypeFriendlyName(coinTypeA), pair: getPairFriendlyName(coinTypeA, coinTypeB) });
        // y metrics
        TokenYBalanceCounter.sub(ctx, Number(amountOut), { coin_symbol: getCoinTypeFriendlyName(coinTypeB), pair: getPairFriendlyName(coinTypeA, coinTypeB) });
        TokenYInflowOutflowGauge.record(ctx, -Number(amountOut), { coin_symbol: getCoinTypeFriendlyName(coinTypeB), pair: getPairFriendlyName(coinTypeA, coinTypeB) });
      } else {
        // y metrics
        SwapVolumeTokenYGauge.record(ctx, amountIn, swapMetadata);
        TokenYBalanceCounter.add(ctx, Number(amountIn), { coin_symbol: getCoinTypeFriendlyName(coinTypeB), pair: getPairFriendlyName(coinTypeA, coinTypeB) });
        TokenYInflowOutflowGauge.record(ctx, Number(amountIn), { coin_symbol: getCoinTypeFriendlyName(coinTypeB), pair: getPairFriendlyName(coinTypeA, coinTypeB) });
        // x metrics
        TokenXBalanceCounter.sub(ctx, Number(amountOut), { coin_symbol: getCoinTypeFriendlyName(coinTypeA), pair: getPairFriendlyName(coinTypeA, coinTypeB) });
        TokenXInflowOutflowGauge.record(ctx, -Number(amountOut), { coin_symbol: getCoinTypeFriendlyName(coinTypeA), pair: getPairFriendlyName(coinTypeA, coinTypeB) });
      }

      PriceAToB.record(ctx, reserveY / reserveX, { coin_symbol: getCoinTypeFriendlyName(coinTypeA) });
      PriceBToA.record(ctx, reserveX / reserveY, { coin_symbol: getCoinTypeFriendlyName(coinTypeB) });
    }
  })
  .onEventLiquidityAddedEvent(async (event, ctx) => {
    const { pool_id, liquidity_provider, amount_x, amount_y, lsp_minted } = event.data_decoded;
    const poolInfo = await getPoolInfo(ctx, pool_id);

    if (pool_id !== "0x897f66772935ef417426c2ca4d55a399972a7dea38585ea610d7a3f7481482b1" && poolInfo) {
      const {
        coinTypeA,
        coinTypeB,
        priceA,
        priceB,
        scaleX,
        scaleY,
        reserveX,
        reserveY,
      } = poolInfo;
      console.log(pool_id, liquidity_provider, amount_x, amount_y);

      const dollarX = (Number(amount_x) * priceA!) / scaleX;
      const dollarY = (Number(amount_y) * priceB!) / scaleY;

      ctx.eventLogger.emit("LiquidityAddedEvent", {
        poolId: pool_id,
        typeX: coinTypeA,
        typeY: coinTypeB,
        user: liquidity_provider,
        amountX: Number(amount_x) / scaleX,
        amountY: Number(amount_y) / scaleY,
        dollarX,
        dollarY,
        lsp_minted
      });

      let lpMetadata = {
        pair: getPairFriendlyName(coinTypeA, coinTypeB)
      };

      AddLPTxnCounter.add(ctx, 1, lpMetadata);
      TokenXBalanceCounter.add(ctx, Number(amount_x) / scaleX, { coin_symbol: getCoinTypeFriendlyName(coinTypeA), pair: getPairFriendlyName(coinTypeA, coinTypeB) });
      TokenYBalanceCounter.add(ctx, Number(amount_y) / scaleY, { coin_symbol: getCoinTypeFriendlyName(coinTypeB), pair: getPairFriendlyName(coinTypeA, coinTypeB) });

      DollarInflowOutflowGauge.record(ctx, dollarX + dollarY, lpMetadata);
      TokenXInflowOutflowGauge.record(ctx, Number(amount_x) / scaleX, { coin_symbol: getCoinTypeFriendlyName(coinTypeA), pair: getPairFriendlyName(coinTypeA, coinTypeB) });
      TokenYInflowOutflowGauge.record(ctx, Number(amount_y) / scaleY, { coin_symbol: getCoinTypeFriendlyName(coinTypeB), pair: getPairFriendlyName(coinTypeA, coinTypeB) });
    }
  })
  .onEventLiquidityRemovedEvent(async (event, ctx) => {
    const { pool_id, liquidity_provider, amount_x, amount_y, lsp_burned } = event.data_decoded;
    const poolInfo = await getPoolInfo(ctx, pool_id);

    if (pool_id !== "0x897f66772935ef417426c2ca4d55a399972a7dea38585ea610d7a3f7481482b1" && poolInfo) {
      const {
        coinTypeA,
        coinTypeB,
        priceA,
        priceB,
        scaleX,
        scaleY,
        reserveX,
        reserveY,
      } = poolInfo;
      console.log(pool_id, liquidity_provider, amount_x, amount_y);

      const dollarX = (Number(amount_x) * priceA!) / scaleX;
      const dollarY = (Number(amount_y) * priceB!) / scaleY;

      ctx.eventLogger.emit("LiquidityRemovedEvent", {
        poolId: pool_id,
        typeX: coinTypeA,
        typeY: coinTypeB,
        user: liquidity_provider,
        amountX: Number(amount_x) / scaleX,
        amountY: Number(amount_y) / scaleY,
        dollarX,
        dollarY,
        lsp_burned
      });

      let lpMetadata = {
        pair: getPairFriendlyName(coinTypeA, coinTypeB)
      };
      RemoveLPTxnCounter.add(ctx, 1, lpMetadata);
      TokenXBalanceCounter.sub(ctx, Number(amount_x) / scaleX, { coin_symbol: getCoinTypeFriendlyName(coinTypeA), pair: getPairFriendlyName(coinTypeA, coinTypeB) });
      TokenYBalanceCounter.sub(ctx, Number(amount_y) / scaleY, { coin_symbol: getCoinTypeFriendlyName(coinTypeB), pair: getPairFriendlyName(coinTypeA, coinTypeB) });

      DollarInflowOutflowGauge.record(ctx, -(dollarX + dollarY), lpMetadata);
      TokenXInflowOutflowGauge.record(ctx, -(Number(amount_x) / scaleX), { coin_symbol: getCoinTypeFriendlyName(coinTypeA), pair: getPairFriendlyName(coinTypeA, coinTypeB) });
      TokenYInflowOutflowGauge.record(ctx, -(Number(amount_y) / scaleY), { coin_symbol: getCoinTypeFriendlyName(coinTypeB), pair: getPairFriendlyName(coinTypeA, coinTypeB) });


    }
  }).onEventPoolUpdatedEvent(async (event, ctx) => {
    const { pool_id, lp_fee_percent, protocol_fee_percent, is_stable, scaleX, scaleY } = event.data_decoded;
    ctx.eventLogger.emit("PoolConfigUpdatedEvent", {
      poolId: pool_id,
      lp_fee_percent: Number(lp_fee_percent) / 1000000,
      protocol_fee_percent: Number(protocol_fee_percent) / 1000000,
      is_stable: is_stable
    });
  }).onTransactionBlock(async (block, ctx) => {
    const timestamp = ctx.timestamp;
  })
