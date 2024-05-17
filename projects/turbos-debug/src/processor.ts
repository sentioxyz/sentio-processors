import {
  SuiObjectProcessor,
  SuiContext,
  SuiObjectContext,
  SuiObjectProcessorTemplate,
} from "@sentio/sdk/sui";
import * as constant from "./constant-turbos.js";
import { SuiNetwork } from "@sentio/sdk/sui";
import * as helper from "./helper/turbos-clmm-helper.js";
import { Gauge, BigDecimal } from "@sentio/sdk";
import axios from "axios";

import { pool, pool_factory, position_manager } from "./types/sui/turbos.js";
import {
  getCurrentTickStatus,
  MAX_TICK_INDEX,
  MIN_TICK_INDEX,
} from "./helper/turbos-clmm-helper.js";
import { getPriceByType } from "@sentio/sdk/utils";
const address = constant.CLMM_MAINNET;
const network = SuiNetwork.MAIN_NET;

export const volRewardOptions = {
  sparse: true,
  aggregationConfig: {
    intervalInMinutes: [60],
    // discardOrigin: false
  },
};
const day_reward_amount = Gauge.register("day_reward_amount", volRewardOptions);

export const volOptions = {
  sparse: true,
};

const price_a_gauge = Gauge.register("price_a", volOptions);
const price_b_gauge = Gauge.register("price_b", volOptions);

// pool_factory
//   .bind({
//     address,
//     network,
//     startCheckpoint: 1500000n,
//   })
//   .onEventPoolCreatedEvent(async (event, ctx) => {
//     ctx.meter.Counter("create_pool_counter").add(1);
//     const account = event.data_decoded.account;
//     const fee_protocol = event.data_decoded.fee_protocol;
//     const pool = event.data_decoded.pool;
//     const tick_spacing = event.data_decoded.tick_spacing;
//     const fee = event.data_decoded.fee;
//     const sqrt_price = event.data_decoded.sqrt_price;

//     ctx.eventLogger.emit("CreatePoolEvent", {
//       distinctId: account,
//       account,
//       fee_protocol,
//       pool,
//       tick_spacing,
//       fee,
//       sqrt_price,
//     });

//     await helper.getOrCreatePool(ctx, pool);

//     template.bind(
//       {
//         objectId: pool,
//       },
//       ctx
//     );
//   });
interface CacheValue {
  promise: Promise<any>,
  updateTime: number
}

let cachePool: Map<string, CacheValue> = new Map()


function roundToHalfHour(date: Date): Date {
  const roundedDate = new Date(date);
  const minutes = date.getMinutes();
  const roundedMinutes = minutes < 30 ? 0 : 30;

  roundedDate.setMinutes(roundedMinutes);
  roundedDate.setSeconds(0);
  roundedDate.setMilliseconds(0);

  return roundedDate;
}

export async function getTurbosPool(pool: string) {
  if (!pool) {
    return {
      error: true,
    };
  }
  console.log("entering get pool try catch")

  const now = new Date(Date.now())

  // if (cachePool[pool]
  //   && now - cachePool[pool].updateTime < 1000 * 60 * 30
  // ) {
  //   return {
  //     data: cachePool[pool].data,
  //   };
  // }

  const key = pool + roundToHalfHour(now)
  console.log('Current Date:', now);
  console.log('Rounded Date:', roundToHalfHour(now));

  let value = cachePool.get(key)
  if (!value) {
    const promise = axios.get(
      `https://api.turbos.finance/pools/ids?ids=${pool}`
    )
    value = {
      promise,
      updateTime: Date.now()
    }

    cachePool.set(key, value)

  }

  // processing
  try {
    const response = await value.promise
    if (!response) {
      console.log(`response error ${key}, pools ${pool} res ${response} value`)
    }
    console.log("get data success", response.data.data[0].slice(0.50))
    return {
      data: response.data.data[0],
    }
  } catch (e) {
    console.log(
      `catch error ${key}, pools ${pool} res ${e} value`
    )
  }

  return {
    error: true
  }

}



pool
  .bind({
    address,
    network,
    startCheckpoint: 29829807n,
  })
  .onEventSwapEvent(async (event, ctx) => {
    // if (flag) {
    //   flag = false
    // }
    // else { return }

    ctx.meter.Counter("swap_counter").add(1);
    const pool = event.data_decoded.pool;


    console.log(JSON.stringify(event).slice(0, 50), ctx.timestamp)
    const turbosPool = await getTurbosPool(pool)
    // if (!turbosPool || turbosPool.error) {
    //   console.log("turbosPool undefined", ctx.timestamp)
    // }
    // else {
    //   console.log("turbosPool", JSON.stringify(turbosPool).slice(0, 50), ctx.timestamp)
    // }

    // await helper.calculateTokenValue_USD(ctx, pool, ctx.timestamp);
  })
