import { SuiNetwork } from "@sentio/sdk/sui";
import { pool } from "./types/sui/0x1eabed72c53feb3805120a081dc15963c204dc8d091542592abaf7a35689b2fb.js";
import { _omnilending } from "./types/sui/index.js";
import { CLMM_MAINNET, LENDING, SWAP } from "./helper/address.js";
import { calculateSwapVol_USD, getOrCreatePool } from "./helper/swap.js";
import { lending_logic, user_manager } from "./types/sui/omnilending.js";
import {
  CALL_TYPE_TO_NAME,
  LENDING_DECIMALS,
  TOKEN_ID_TO_SYMBOL,
} from "./helper/lending.js";
import { getPriceBySymbol } from "@sentio/sdk/utils";

pool
  .bind({
    address: CLMM_MAINNET,
    network: SuiNetwork.MAIN_NET,
  })
  .onEventSwapEvent(async (event, ctx) => {
    if (ctx.transaction.events[0].packageId == SWAP) {
      console.log("Add OmniSwap Event:", ctx.transaction.digest)
      ctx.meter.Counter("swap_counter").add(1, { project: "omniswap" });
      const pool = event.data_decoded.pool;
      const poolInfo = await getOrCreatePool(ctx, pool);
      const symbol_a = poolInfo.symbol_a;
      const symbol_b = poolInfo.symbol_b;
      const atob = event.data_decoded.atob;
      const decimal_a = poolInfo.decimal_a;
      const decimal_b = poolInfo.decimal_b;
      const pairName = poolInfo.pairName;
      const amount_in =
        Number(event.data_decoded.amount_in) /
        Math.pow(10, atob ? decimal_a : decimal_b);
      const amount_out =
        Number(event.data_decoded.amount_out) /
        Math.pow(10, atob ? decimal_b : decimal_a);

      const usd_volume = await calculateSwapVol_USD(
        poolInfo.type,
        amount_in,
        amount_out,
        atob,
        ctx.timestamp
      );

      ctx.eventLogger.emit("SwapEvent", {
        project: "omniswap",
        distinctId: ctx.transaction.transaction.data.sender,
        pool,
        amount_in,
        amount_out,
        usd_volume,
        pairName,
        message: `Swap ${amount_in} ${
          atob ? symbol_a : symbol_b
        } to ${amount_out} ${
          atob ? symbol_b : symbol_a
        }. USD value: ${usd_volume} in Pool ${pairName} `,
      });

      ctx.meter
        .Gauge("swap_vol_gauge")
        .record(usd_volume, { pairName, project: "omniswap" });
      ctx.meter
        .Counter("swap_vol_counter")
        .add(usd_volume, { pairName, project: "omniswap" });
    }
  });

lending_logic
  .bind({
    address: LENDING,
    network: SuiNetwork.MAIN_NET,
  })
  .onEventLendingCoreExecuteEvent(async (event, ctx) => {
    ctx.meter.Counter("lending_counter").add(1, { project: "omnilending" });

    console.log("Add Lending Event:", ctx.transaction.digest)

    const call_type = event.data_decoded.call_type;
    const pool_id = event.data_decoded.pool_id;
    const symbol = TOKEN_ID_TO_SYMBOL.get(pool_id) as string;
    const price = await getPriceBySymbol(symbol, ctx.timestamp);
    const amount = event.data_decoded.amount;
    const user_id = event.data_decoded.user_id;
    const value =
      (Number(amount) / Math.pow(10, LENDING_DECIMALS)) * Number(price);
    const call_name = CALL_TYPE_TO_NAME.get(call_type) as string;

    if (call_type == 0) {
      ctx.meter
        .Counter("lending_tvl_counter")
        .add(value, { token: symbol, project: "omnilending" });
    }

    if (call_type == 1) {
      ctx.meter
        .Counter("lending_tvl_counter")
        .sub(value, { token: symbol, project: "omnilending" });
    }

    ctx.eventLogger.emit("LendingEvent", {
      project: "omnilending",
      distinctId: ctx.transaction.transaction.data.sender,
      user_id,
      call_name,
      symbol,
      amount,
      value,
      message: `User ${user_id} ${call_name} ${amount} ${symbol} with value ${value} USD`,
    });
  });

user_manager
  .bind({
    address: LENDING,
    network: SuiNetwork.MAIN_NET,
  })
  .onEventBindUser(async (event, ctx) => {
    console.log("Add Lending Event:", ctx.transaction.digest)
    ctx.meter.Counter("lending_counter").add(1, { project: "omnilending" });
  })
  .onEventUnbindUser(async (event, ctx) => {
    console.log("Add Lending Event:", ctx.transaction.digest)
    ctx.meter.Counter("lending_counter").add(1, { project: "omnilending" });
  });
