import { Counter, Gauge } from "@sentio/sdk";

import { amm } from './types/aptos/auxexchange.js'
import { liquidity_pool } from "./types/aptos/liquidswap.js";
import { stake_router } from "./types/aptos/tortuga.js";
import { BigDecimal } from "@sentio/sdk";
import { AptosAccountProcessor, defaultMoveCoder, TypedMoveResource } from "@sentio/sdk/aptos";
import { coin, optional_aggregator } from "@sentio/sdk/aptos/builtin/0x1";
// import { AccountEventTracker } from "@sentio/sdk";

const commonOptions = { sparse:  false }

const supply = Gauge.register("total_supply", commonOptions)

const liquidityAdd = Counter.register("liquidity_add_num", commonOptions)
const liquidityRemoved = Counter.register("liquidity_remove_num", commonOptions)
const swap = Counter.register("swap_num", commonOptions)

const stake = Counter.register("stake_num", commonOptions)
const stakeAmount = Counter.register("stake_amount", commonOptions)
const lastStakeAmount = Gauge.register("last_stake_amount", commonOptions)

const unstake = Counter.register("unstake_num", commonOptions)
const unstakeAmount = Counter.register("unstake_amount", commonOptions)
const claim = Counter.register("claim_num", commonOptions)
const claimAmount = Counter.register("claim_amount", commonOptions)

const vol = Gauge.register("vol", commonOptions)
const tvl = Counter.register("tvl", commonOptions)

// const accountTracker = AccountEventTracker.register("users")

const APT = '0x1::aptos_coin::AptosCoin'
const tAPT = '0x84d7aeef42d38a5ffc3ccef853e1b82e4958659d16a7de736a29c55fbbeb0114::staked_aptos_coin::StakedAptosCoin'
const coinInfoType = `0x1::coin::CoinInfo<${tAPT}>`

// tortuga
stake_router.bind()
  .onEventStakeEvent((evt, ctx) => {
    ctx.eventLogger.emit("user event", { distinctId: ctx.transaction.sender})
    const amount = scaleDown(evt.data_decoded.amount)
    stakeAmount.add(ctx, amount, { coin: "APT"})
    stakeAmount.add(ctx, scaleDown(evt.data_decoded.t_apt_coins), { coin: "tAPT"})
    if (evt.data_decoded.amount > 0n) {
      lastStakeAmount.record(ctx, amount, {coin: "APT"})
      lastStakeAmount.record(ctx, scaleDown(evt.data_decoded.t_apt_coins), { coin: "tAPT"})
    }
    // if (amount.gt(1000)) {
    ctx.eventLogger.emit("stake", { message: "stake " + amount + " APT", type: "stake", amount: amount.toNumber()})
    // }
    stake.add(ctx, 1)
  })
  .onEventUnstakeEvent((evt, ctx) => {
    ctx.eventLogger.emit("user event",  { distinctId: ctx.transaction.sender})
    const amount = scaleDown(evt.data_decoded.amount)
    unstakeAmount.add(ctx, amount, { coin: "APT"})
    unstakeAmount.add(ctx, scaleDown(evt.data_decoded.t_apt_coins), { coin: "tAPT"})
    // if (amount.gt(1000) ) {
    ctx.eventLogger.emit("unstake", { message: "unstake apt " + amount + "APT", type: "unstake", amount: amount.toNumber()})
    // }
    unstake.add(ctx, 1)
  })
  .onEventClaimEvent((evt, ctx) => {
    ctx.eventLogger.emit("user event", { distinctId: ctx.transaction.sender})
    claimAmount.add(ctx, scaleDown(evt.data_decoded.amount), { coin: "APT"})
    claim.add(ctx, 1)
  })

// aux
amm.bind({startVersion: 299999})
  .onEventAddLiquidityEvent(async (evt, ctx) => {
    if (isAptTAptPair(evt.data_decoded.x_coin_type, evt.data_decoded.y_coin_type)) {
      ctx.eventLogger.emit("user event",  { distinctId: ctx.transaction.sender})
      liquidityAdd.add(ctx, 1, { protocol: "aux"})
      tvl.add(ctx, scaleDown(evt.data_decoded.x_added_au), { coin: getSymbol(evt.data_decoded.x_coin_type), protocol: "aux"} )
      tvl.add(ctx, scaleDown(evt.data_decoded.y_added_au), { coin: getSymbol(evt.data_decoded.y_coin_type), protocol: "aux"} )
    }
  })
  .onEventRemoveLiquidityEvent(async (evt, ctx) => {
    if (isAptTAptPair(evt.data_decoded.x_coin_type, evt.data_decoded.y_coin_type)) {
      ctx.eventLogger.emit("user event",  { distinctId: ctx.transaction.sender})
      liquidityRemoved.add(ctx, 1, { protocol: "aux"})
      tvl.sub(ctx, scaleDown(evt.data_decoded.x_removed_au), { coin: getSymbol(evt.data_decoded.x_coin_type), protocol: "aux"} )
      tvl.sub(ctx, scaleDown(evt.data_decoded.y_removed_au), { coin: getSymbol(evt.data_decoded.y_coin_type), protocol: "aux"} )
    }
  })
  .onEventSwapEvent(async (evt, ctx) => {
    if (isAptTAptPair(evt.data_decoded.in_coin_type, evt.data_decoded.out_coin_type)) {
      ctx.eventLogger.emit("user event",  { distinctId: ctx.transaction.sender})
      swap.add(ctx,1, { protocol: "aux"})

      tvl.add(ctx, scaleDown(evt.data_decoded.in_au), { coin: getSymbol(evt.data_decoded.in_coin_type), protocol: "aux"} )
      tvl.sub(ctx, scaleDown(evt.data_decoded.out_au), { coin: getSymbol(evt.data_decoded.out_coin_type), protocol: "aux"} )

      vol.record(ctx, scaleDown(evt.data_decoded.in_au), { coin: getSymbol(evt.data_decoded.in_coin_type), protocol: "aux"})
      vol.record(ctx, scaleDown(evt.data_decoded.out_au), { coin: getSymbol(evt.data_decoded.out_coin_type), protocol: "aux"})
    }
  })

// liquidswap
liquidity_pool.bind({startVersion: 299999})
  .onEventLiquidityAddedEvent(async (evt, ctx) => {
    if (isAptTAptPair(evt.type_arguments[0], evt.type_arguments[1])) {
      ctx.eventLogger.emit("user event",  { distinctId: ctx.transaction.sender})
      liquidityAdd.add(ctx, 1, { protocol: "liquidswap"})
      tvl.add(ctx, scaleDown(evt.data_decoded.added_x_val), { coin: getSymbol(evt.type_arguments[0]), protocol: "liquidswap"} )
      tvl.add(ctx, scaleDown(evt.data_decoded.added_y_val), { coin: getSymbol(evt.type_arguments[1]), protocol: "liquidswap"} )

      // ctx.logger.info("liquidswap add", {
      //   x_out: scaleDown(evt.data_decoded.added_x_val).toNumber(),
      //   y_out: scaleDown(evt.data_decoded.added_y_val).toNumber(),
      //   coinx: getSymbol(evt.type_arguments[0]),
      //   coiny: getSymbol(evt.type_arguments[1]),
      //   user: ctx.transaction.sender
      // })
    }
  })
  .onEventLiquidityRemovedEvent(async (evt, ctx) => {
    if (isAptTAptPair(evt.type_arguments[0], evt.type_arguments[1])) {
      ctx.eventLogger.emit("user event", { distinctId: ctx.transaction.sender})
      liquidityRemoved.add(ctx, 1, { protocol: "liquidswap"})
      tvl.sub(ctx, scaleDown(evt.data_decoded.returned_x_val), { coin: getSymbol(evt.type_arguments[0]), protocol: "liquidswap"} )
      tvl.sub(ctx, scaleDown(evt.data_decoded.returned_y_val), { coin: getSymbol(evt.type_arguments[1]), protocol: "liquidswap"} )
      //
      // ctx.logger.info("liquidswap remove", {
      //   x_out: scaleDown(evt.data_decoded.returned_x_val).toNumber(),
      //   y_out: scaleDown(evt.data_decoded.returned_y_val).toNumber(),
      //   coinx: getSymbol(evt.type_arguments[0]),
      //   coiny: getSymbol(evt.type_arguments[1]),
      //   user: ctx.transaction.sender
      // })
    }
  })
  .onEventSwapEvent(async (evt, ctx) => {
    if (isAptTAptPair(evt.type_arguments[0], evt.type_arguments[1])) {
      ctx.eventLogger.emit("user event", { distinctId: ctx.transaction.sender})
      swap.add(ctx,1, { protocol: "liquidswap"})

      tvl.add(ctx, scaleDown(evt.data_decoded.x_in), { coin: getSymbol(evt.type_arguments[0]), protocol: "liquidswap"} )
      tvl.sub(ctx, scaleDown(evt.data_decoded.x_out), { coin: getSymbol(evt.type_arguments[0]), protocol: "liquidswap"} )
      tvl.add(ctx, scaleDown(evt.data_decoded.y_in), { coin: getSymbol(evt.type_arguments[1]), protocol: "liquidswap"} )
      tvl.sub(ctx, scaleDown(evt.data_decoded.y_out), { coin: getSymbol(evt.type_arguments[1]), protocol: "liquidswap"} )
      //
      // ctx.logger.info("liquidswap swap", {
      //   x_in: scaleDown(evt.data_decoded.x_in).toNumber(),
      //   x_out: scaleDown(evt.data_decoded.x_out).toNumber(),
      //   y_in: scaleDown(evt.data_decoded.y_in).toNumber(),
      //   y_out: scaleDown(evt.data_decoded.y_out).toNumber(),
      //   coinx: getSymbol(evt.type_arguments[0]),
      //   coiny: getSymbol(evt.type_arguments[1]),
      //   user: ctx.transaction.sender
      // })

      vol.record(ctx, scaleDown(evt.data_decoded.x_in + evt.data_decoded.x_out), { coin: getSymbol(evt.type_arguments[0]), protocol: "liquidswap"})
      vol.record(ctx, scaleDown(evt.data_decoded.y_in + evt.data_decoded.y_out), { coin: getSymbol(evt.type_arguments[1]), protocol: "liquidswap"})
    }
  })
    .onEventFlashloanEvent(async (evt, ctx) => {
      if (isAptTAptPair(evt.type_arguments[0], evt.type_arguments[1])) {
        ctx.eventLogger.emit("user event", { distinctId: ctx.transaction.sender})
        swap.add(ctx,1, { protocol: "liquidswap"})

        tvl.add(ctx, scaleDown(evt.data_decoded.x_in), { coin: getSymbol(evt.type_arguments[0]), protocol: "liquidswap"} )
        tvl.sub(ctx, scaleDown(evt.data_decoded.x_out), { coin: getSymbol(evt.type_arguments[0]), protocol: "liquidswap"} )
        tvl.add(ctx, scaleDown(evt.data_decoded.y_in), { coin: getSymbol(evt.type_arguments[1]), protocol: "liquidswap"} )
        tvl.sub(ctx, scaleDown(evt.data_decoded.y_out), { coin: getSymbol(evt.type_arguments[1]), protocol: "liquidswap"} )

        ctx.eventLogger.emit("flashloan", { message: "liquidswap flashloan for " + scaleDown(evt.data_decoded.x_in).toString(),
          x_in: scaleDown(evt.data_decoded.x_in).toNumber(),
          x_out: scaleDown(evt.data_decoded.x_out).toNumber(),
          y_in: scaleDown(evt.data_decoded.y_in).toNumber(),
          y_out: scaleDown(evt.data_decoded.y_out).toNumber(),
          coinx: getSymbol(evt.type_arguments[0]),
          coiny: getSymbol(evt.type_arguments[1]),
          user: ctx.transaction.sender
        })

        vol.record(ctx, scaleDown(evt.data_decoded.x_in + evt.data_decoded.x_out), { coin: getSymbol(evt.type_arguments[0]), protocol: "liquidswap"})
        vol.record(ctx, scaleDown(evt.data_decoded.y_in + evt.data_decoded.y_out), { coin: getSymbol(evt.type_arguments[1]), protocol: "liquidswap"})
      }
    })

AptosAccountProcessor.bind({address: "0x84d7aeef42d38a5ffc3ccef853e1b82e4958659d16a7de736a29c55fbbeb0114"})
    .onTimeInterval(async (resources, ctx) => {
      const coinInfoRes = defaultMoveCoder().filterAndDecodeResources<coin.CoinInfo<any>>(coin.CoinInfo.TYPE_QNAME, resources)
      if (coinInfoRes.length === 0) {
        return
      }
      const coinInfo = coinInfoRes[0].data_decoded

      const aggOption = (coinInfo.supply.vec as optional_aggregator.OptionalAggregator[])[0]
      if (aggOption.integer.vec.length) {
        const intValue = (aggOption.integer.vec[0] as optional_aggregator.Integer)

        supply.record(ctx, scaleDown(intValue.value))
      } else {
        console.error("no supply for tAPT found")
      }

    }, 60, 12 * 60, coinInfoType)


function isAptTAptPair(coinx: string, coiny: string): boolean {
  if (coinx === tAPT && coiny === APT) {
    return true
  }
  return coiny === tAPT && coinx === APT;
}

const DIVIDER = BigDecimal(10).pow(8)
function scaleDown(amount: bigint) {
  return amount.asBigDecimal().div(DIVIDER)
}

function getSymbol(type: string) {
  if (type === APT) {
    return "APT"
  } else if (type === tAPT) {
    return "tAPT"
  }
  throw Error("bug")
}