import { AccountEventTracker, aptos, Counter, Gauge } from "@sentio/sdk";

import { amm } from './types/aptos/auxexchange'
import { liquidity_pool } from "./types/aptos/liquidswap";
import { stake_router } from "./types/aptos/tortuga";
import { toBigDecimal } from "@sentio/sdk/lib/utils/conversion";
import { BigDecimal } from "@sentio/sdk/lib/core/big-decimal";
import {Exporter} from "@sentio/sdk/lib/core/exporter";

const commonOptions = { sparse:  false }

const liquidityAdd = new Counter("liquidity_add_num", commonOptions)
const liquidityRemoved = new Counter("liquidity_remove_num", commonOptions)
const swap = new Counter("swap_num", commonOptions)

const stake = new Counter("stake_num", commonOptions)
const stakeAmount = new Counter("stake_amount", commonOptions)
const unstake = new Counter("unstake_num", commonOptions)
const unstakeAmount = new Counter("unstake_amount", commonOptions)
const claim = new Counter("claim_num", commonOptions)
const claimAmount = new Counter("claim_amount", commonOptions)

const vol = new Gauge("vol", commonOptions)
const tvl = new Counter("tvl", commonOptions)

const accountTracker = AccountEventTracker.register("users")

const APT = '0x1::aptos_coin::AptosCoin'
const tAPT = '0x84d7aeef42d38a5ffc3ccef853e1b82e4958659d16a7de736a29c55fbbeb0114::staked_aptos_coin::StakedAptosCoin'

// tortuga
stake_router.bind()
  .onEventStakeEvent((evt, ctx) => {
    accountTracker.trackEvent(ctx, { distinctId: ctx.transaction.sender})
    stakeAmount.add(ctx, scaleDown(evt.data_typed.amount), { coin: "APT"})
    stakeAmount.add(ctx, scaleDown(evt.data_typed.t_apt_coins), { coin: "tAPT"})
    stake.add(ctx, 1)
  })
  .onEventUnstakeEvent((evt, ctx) => {
    accountTracker.trackEvent(ctx, { distinctId: ctx.transaction.sender})
    unstakeAmount.add(ctx, scaleDown(evt.data_typed.amount), { coin: "APT"})
    unstakeAmount.add(ctx, scaleDown(evt.data_typed.t_apt_coins), { coin: "tAPT"})
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
    }
  })
  .onEventLiquidityRemovedEvent(async (evt, ctx) => {
    if (isAptTAptPair(evt.type_arguments[0], evt.type_arguments[1])) {
      accountTracker.trackEvent(ctx, { distinctId: ctx.transaction.sender})
      liquidityRemoved.add(ctx, 1, { protocol: "liquidswap"})
      tvl.sub(ctx, scaleDown(evt.data_typed.returned_x_val), { coin: getSymbol(evt.type_arguments[0]), protocol: "liquidswap"} )
      tvl.sub(ctx, scaleDown(evt.data_typed.returned_y_val), { coin: getSymbol(evt.type_arguments[1]), protocol: "liquidswap"} )
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

      vol.record(ctx, scaleDown(evt.data_typed.x_in + evt.data_typed.x_out), { coin: getSymbol(evt.type_arguments[0]), protocol: "liquidswap"})
      vol.record(ctx, scaleDown(evt.data_typed.y_in + evt.data_typed.y_out), { coin: getSymbol(evt.type_arguments[1]), protocol: "liquidswap"})
    }
  })

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