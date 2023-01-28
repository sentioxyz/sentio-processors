import { AccountEventTracker, Counter, Gauge } from "@sentio/sdk";

import { amm } from './types/aptos/auxexchange'
import { liquidity_pool } from "./types/aptos/liquidswap";
import { stake_router } from "./types/aptos/tortuga";
import { toBigDecimal } from "@sentio/sdk/lib/utils/conversion";
import { BigDecimal } from "@sentio/sdk/lib/core/big-decimal";
import { AptosAccountProcessor, TYPE_REGISTRY, TypedMoveResource } from "@sentio/sdk-aptos";
import { coin, optional_aggregator } from "@sentio/sdk-aptos/lib/builtin/0x1";

const commonOptions = { sparse:  false }

const supply = new Gauge("total_supply", commonOptions)

const liquidityAdd = new Counter("liquidity_add_num", commonOptions)
const liquidityRemoved = new Counter("liquidity_remove_num", commonOptions)
const swap = new Counter("swap_num", commonOptions)

const stake = new Counter("stake_num", commonOptions)
const stakeAmount = new Counter("stake_amount", commonOptions)
const lastStakeAmount = new Gauge("last_stake_amount", commonOptions)

const unstake = new Counter("unstake_num", commonOptions)
const unstakeAmount = new Counter("unstake_amount", commonOptions)
const claim = new Counter("claim_num", commonOptions)
const claimAmount = new Counter("claim_amount", commonOptions)

const vol = Gauge.register("vol", commonOptions)
const tvl = Counter.register("tvl", commonOptions)

const accountTracker = AccountEventTracker.register("users")

const APT = '0x1::aptos_coin::AptosCoin'
const tAPT = '0x84d7aeef42d38a5ffc3ccef853e1b82e4958659d16a7de736a29c55fbbeb0114::staked_aptos_coin::StakedAptosCoin'
const coinInfoType = `0x1::coin::CoinInfo<${tAPT}>`

// tortuga
stake_router.bind()
  .onEventStakeEvent((evt, ctx) => {
    accountTracker.trackEvent(ctx, { distinctId: ctx.transaction.sender})
    const amount = scaleDown(evt.data_typed.amount)
    stakeAmount.add(ctx, amount, { coin: "APT"})
    stakeAmount.add(ctx, scaleDown(evt.data_typed.t_apt_coins), { coin: "tAPT"})
    if (evt.data_typed.amount > 0n) {
      lastStakeAmount.record(ctx, amount, {coin: "APT"})
      lastStakeAmount.record(ctx, scaleDown(evt.data_typed.t_apt_coins), { coin: "tAPT"})
    }
    // if (amount.gt(1000)) {
    ctx.logger.info("stake " + amount + " APT", { type: "stake", amount: amount.toNumber()})
    // }
    stake.add(ctx, 1)
  })
  .onEventUnstakeEvent((evt, ctx) => {
    accountTracker.trackEvent(ctx, { distinctId: ctx.transaction.sender})
    const amount = scaleDown(evt.data_typed.amount)
    unstakeAmount.add(ctx, amount, { coin: "APT"})
    unstakeAmount.add(ctx, scaleDown(evt.data_typed.t_apt_coins), { coin: "tAPT"})
    // if (amount.gt(1000) ) {
    ctx.logger.info("unstake apt " + amount + "APT", { type: "unstake", amount: amount.toNumber()})
    // }
    unstake.add(ctx, 1)
  })
  .onEventClaimEvent((evt, ctx) => {
    accountTracker.trackEvent(ctx, { distinctId: ctx.transaction.sender})
    claimAmount.add(ctx, scaleDown(evt.data_typed.amount), { coin: "APT"})
    claim.add(ctx, 1)
  })

// aux
amm.bind({startVersion: 299999})
  .onEventAddLiquidityEvent(async (evt, ctx) => {
    if (isAptTAptPair(evt.data_typed.x_coin_type, evt.data_typed.y_coin_type)) {
      accountTracker.trackEvent(ctx, { distinctId: ctx.transaction.sender})
      liquidityAdd.add(ctx, 1, { protocol: "aux"})
      tvl.add(ctx, scaleDown(evt.data_typed.x_added_au), { coin: getSymbol(evt.data_typed.x_coin_type), protocol: "aux"} )
      tvl.add(ctx, scaleDown(evt.data_typed.y_added_au), { coin: getSymbol(evt.data_typed.y_coin_type), protocol: "aux"} )
    }
  })
  .onEventRemoveLiquidityEvent(async (evt, ctx) => {
    if (isAptTAptPair(evt.data_typed.x_coin_type, evt.data_typed.y_coin_type)) {
      accountTracker.trackEvent(ctx, { distinctId: ctx.transaction.sender})
      liquidityRemoved.add(ctx, 1, { protocol: "aux"})
      tvl.sub(ctx, scaleDown(evt.data_typed.x_removed_au), { coin: getSymbol(evt.data_typed.x_coin_type), protocol: "aux"} )
      tvl.sub(ctx, scaleDown(evt.data_typed.y_removed_au), { coin: getSymbol(evt.data_typed.y_coin_type), protocol: "aux"} )
    }
  })
  .onEventSwapEvent(async (evt, ctx) => {
    if (isAptTAptPair(evt.data_typed.in_coin_type, evt.data_typed.out_coin_type)) {
      accountTracker.trackEvent(ctx, { distinctId: ctx.transaction.sender})
      swap.add(ctx,1, { protocol: "aux"})

      tvl.add(ctx, scaleDown(evt.data_typed.in_au), { coin: getSymbol(evt.data_typed.in_coin_type), protocol: "aux"} )
      tvl.sub(ctx, scaleDown(evt.data_typed.out_au), { coin: getSymbol(evt.data_typed.out_coin_type), protocol: "aux"} )

      vol.record(ctx, scaleDown(evt.data_typed.in_au), { coin: getSymbol(evt.data_typed.in_coin_type), protocol: "aux"})
      vol.record(ctx, scaleDown(evt.data_typed.out_au), { coin: getSymbol(evt.data_typed.out_coin_type), protocol: "aux"})
    }
  })

// liquidswap
liquidity_pool.bind({startVersion: 299999})
  .onEventLiquidityAddedEvent(async (evt, ctx) => {
    if (isAptTAptPair(evt.type_arguments[0], evt.type_arguments[1])) {
      accountTracker.trackEvent(ctx, { distinctId: ctx.transaction.sender})
      liquidityAdd.add(ctx, 1, { protocol: "liquidswap"})
      tvl.add(ctx, scaleDown(evt.data_typed.added_x_val), { coin: getSymbol(evt.type_arguments[0]), protocol: "liquidswap"} )
      tvl.add(ctx, scaleDown(evt.data_typed.added_y_val), { coin: getSymbol(evt.type_arguments[1]), protocol: "liquidswap"} )

      // ctx.logger.info("liquidswap add", {
      //   x_out: scaleDown(evt.data_typed.added_x_val).toNumber(),
      //   y_out: scaleDown(evt.data_typed.added_y_val).toNumber(),
      //   coinx: getSymbol(evt.type_arguments[0]),
      //   coiny: getSymbol(evt.type_arguments[1]),
      //   user: ctx.transaction.sender
      // })
    }
  })
  .onEventLiquidityRemovedEvent(async (evt, ctx) => {
    if (isAptTAptPair(evt.type_arguments[0], evt.type_arguments[1])) {
      accountTracker.trackEvent(ctx, { distinctId: ctx.transaction.sender})
      liquidityRemoved.add(ctx, 1, { protocol: "liquidswap"})
      tvl.sub(ctx, scaleDown(evt.data_typed.returned_x_val), { coin: getSymbol(evt.type_arguments[0]), protocol: "liquidswap"} )
      tvl.sub(ctx, scaleDown(evt.data_typed.returned_y_val), { coin: getSymbol(evt.type_arguments[1]), protocol: "liquidswap"} )
      //
      // ctx.logger.info("liquidswap remove", {
      //   x_out: scaleDown(evt.data_typed.returned_x_val).toNumber(),
      //   y_out: scaleDown(evt.data_typed.returned_y_val).toNumber(),
      //   coinx: getSymbol(evt.type_arguments[0]),
      //   coiny: getSymbol(evt.type_arguments[1]),
      //   user: ctx.transaction.sender
      // })
    }
  })
  .onEventSwapEvent(async (evt, ctx) => {
    if (isAptTAptPair(evt.type_arguments[0], evt.type_arguments[1])) {
      accountTracker.trackEvent(ctx, { distinctId: ctx.transaction.sender})
      swap.add(ctx,1, { protocol: "liquidswap"})

      tvl.add(ctx, scaleDown(evt.data_typed.x_in), { coin: getSymbol(evt.type_arguments[0]), protocol: "liquidswap"} )
      tvl.sub(ctx, scaleDown(evt.data_typed.x_out), { coin: getSymbol(evt.type_arguments[0]), protocol: "liquidswap"} )
      tvl.add(ctx, scaleDown(evt.data_typed.y_in), { coin: getSymbol(evt.type_arguments[1]), protocol: "liquidswap"} )
      tvl.sub(ctx, scaleDown(evt.data_typed.y_out), { coin: getSymbol(evt.type_arguments[1]), protocol: "liquidswap"} )
      //
      // ctx.logger.info("liquidswap swap", {
      //   x_in: scaleDown(evt.data_typed.x_in).toNumber(),
      //   x_out: scaleDown(evt.data_typed.x_out).toNumber(),
      //   y_in: scaleDown(evt.data_typed.y_in).toNumber(),
      //   y_out: scaleDown(evt.data_typed.y_out).toNumber(),
      //   coinx: getSymbol(evt.type_arguments[0]),
      //   coiny: getSymbol(evt.type_arguments[1]),
      //   user: ctx.transaction.sender
      // })

      vol.record(ctx, scaleDown(evt.data_typed.x_in + evt.data_typed.x_out), { coin: getSymbol(evt.type_arguments[0]), protocol: "liquidswap"})
      vol.record(ctx, scaleDown(evt.data_typed.y_in + evt.data_typed.y_out), { coin: getSymbol(evt.type_arguments[1]), protocol: "liquidswap"})
    }
  })
    .onEventFlashloanEvent(async (evt, ctx) => {
      if (isAptTAptPair(evt.type_arguments[0], evt.type_arguments[1])) {
        accountTracker.trackEvent(ctx, { distinctId: ctx.transaction.sender})
        swap.add(ctx,1, { protocol: "liquidswap"})

        tvl.add(ctx, scaleDown(evt.data_typed.x_in), { coin: getSymbol(evt.type_arguments[0]), protocol: "liquidswap"} )
        tvl.sub(ctx, scaleDown(evt.data_typed.x_out), { coin: getSymbol(evt.type_arguments[0]), protocol: "liquidswap"} )
        tvl.add(ctx, scaleDown(evt.data_typed.y_in), { coin: getSymbol(evt.type_arguments[1]), protocol: "liquidswap"} )
        tvl.sub(ctx, scaleDown(evt.data_typed.y_out), { coin: getSymbol(evt.type_arguments[1]), protocol: "liquidswap"} )

        ctx.logger.info("liquidswap flashloan for " + scaleDown(evt.data_typed.x_in).toString(), {
          x_in: scaleDown(evt.data_typed.x_in).toNumber(),
          x_out: scaleDown(evt.data_typed.x_out).toNumber(),
          y_in: scaleDown(evt.data_typed.y_in).toNumber(),
          y_out: scaleDown(evt.data_typed.y_out).toNumber(),
          coinx: getSymbol(evt.type_arguments[0]),
          coiny: getSymbol(evt.type_arguments[1]),
          user: ctx.transaction.sender
        })

        vol.record(ctx, scaleDown(evt.data_typed.x_in + evt.data_typed.x_out), { coin: getSymbol(evt.type_arguments[0]), protocol: "liquidswap"})
        vol.record(ctx, scaleDown(evt.data_typed.y_in + evt.data_typed.y_out), { coin: getSymbol(evt.type_arguments[1]), protocol: "liquidswap"})
      }
    })

AptosAccountProcessor.bind({address: "0x84d7aeef42d38a5ffc3ccef853e1b82e4958659d16a7de736a29c55fbbeb0114"})
    .onTimeInterval(async (resources, ctx) => {
      const coinInfoRes = TYPE_REGISTRY.filterAndDecodeResources<coin.CoinInfo<any>>(coin.CoinInfo.TYPE_QNAME, resources)
      if (coinInfoRes.length === 0) {
        return
      }
      const coinInfo = coinInfoRes[0].data_typed

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
  return toBigDecimal(amount).div(DIVIDER)
}

function getSymbol(type: string) {
  if (type === APT) {
    return "APT"
  } else if (type === tAPT) {
    return "tAPT"
  }
  throw Error("bug")
}