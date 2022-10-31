import { AccountEventTracker, Counter } from "@sentio/sdk";

import { amm } from './types/aptos/auxexchange'
import { liquidity_pool } from "./types/aptos/liquidswap";
import { stake_router } from "./types/aptos/tortuga";
import { toBigDecimal } from "@sentio/sdk/lib/utils/conversion";

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

const accountTracker = AccountEventTracker.register("users")

const APT = '0x1::aptos_coin::AptosCoin'
const tAPT = '0x84d7aeef42d38a5ffc3ccef853e1b82e4958659d16a7de736a29c55fbbeb0114::staked_aptos_coin::StakedAptosCoin'

stake_router.bind()
  .onEventStakeEvent((evt, ctx) => {
    accountTracker.trackEvent(ctx, { distinctId: ctx.transaction.sender})
    stakeAmount.add(ctx, scaleDown(APT, evt.data_typed.amount), { coin: "apt"})
    stakeAmount.add(ctx, scaleDown(tAPT, evt.data_typed.t_apt_coins), { coin: "tapt"})
    stake.add(ctx, 1)
  })
  .onEventUnstakeEvent((evt, ctx) => {
    accountTracker.trackEvent(ctx, { distinctId: ctx.transaction.sender})
    unstakeAmount.add(ctx, scaleDown(APT, evt.data_typed.amount), { coin: "apt"})
    unstakeAmount.add(ctx, scaleDown(tAPT, evt.data_typed.t_apt_coins), { coin: "tapt"})
    unstake.add(ctx, 1)
  })
  .onEventClaimEvent((evt, ctx) => {
    accountTracker.trackEvent(ctx, { distinctId: ctx.transaction.sender})
    claimAmount.add(ctx, scaleDown(tAPT, evt.data_typed.amount), { coin: "apt"})
    claim.add(ctx, 1)
  })

amm.bind({startVersion: 299999})
  .onEventAddLiquidityEvent(async (evt, ctx) => {
    if (isAptTAptPair(evt.data_typed.x_coin_type, evt.data_typed.y_coin_type)) {
      accountTracker.trackEvent(ctx, { distinctId: ctx.transaction.sender})
      liquidityAdd.add(ctx, 1, { protocol: "aux"})
    }
  })
  .onEventRemoveLiquidityEvent(async (evt, ctx) => {
    if (isAptTAptPair(evt.data_typed.x_coin_type, evt.data_typed.y_coin_type)) {
      accountTracker.trackEvent(ctx, { distinctId: ctx.transaction.sender})
      liquidityRemoved.add(ctx, 1, { protocol: "aux"})
    }
  })
  .onEventSwapEvent(async (evt, ctx) => {
    if (isAptTAptPair(evt.data_typed.in_coin_type, evt.data_typed.out_coin_type)) {
      accountTracker.trackEvent(ctx, { distinctId: ctx.transaction.sender})
      swap.add(ctx,1, { protocol: "aux"})
    }
  })

liquidity_pool.bind({startVersion: 299999})
  .onEventLiquidityAddedEvent(async (evt, ctx) => {
    if (isAptTAptPair(evt.type_arguments[0], evt.type_arguments[1])) {
      accountTracker.trackEvent(ctx, { distinctId: ctx.transaction.sender})
      liquidityAdd.add(ctx, 1, { protocol: "liquidswap"})
    }
  })
  .onEventLiquidityRemovedEvent(async (evt, ctx) => {
    if (isAptTAptPair(evt.type_arguments[0], evt.type_arguments[1])) {
      accountTracker.trackEvent(ctx, { distinctId: ctx.transaction.sender})
      liquidityRemoved.add(ctx, 1, { protocol: "liquidswap"})
    }
  })
  .onEventSwapEvent(async (evt, ctx) => {
    if (isAptTAptPair(evt.type_arguments[0], evt.type_arguments[1])) {
      accountTracker.trackEvent(ctx, { distinctId: ctx.transaction.sender})
      swap.add(ctx,1, { protocol: "liquidswap"})
    }
  })

function isAptTAptPair(coinx: string, coiny: string): boolean {
  if (coinx === tAPT && coiny === APT) {
    return true
  }
  return coiny === tAPT && coinx === APT;
}

function scaleDown(coin: string, amount: bigint) {
  if (coin === tAPT || coin === APT) {
    return toBigDecimal(amount).div(8)
  }
  throw Error("wrong coin")
}