import { AccountEventTracker, Counter } from "@sentio/sdk";

import { amm } from './types/aptos/auxexchange'
import { liquidity_pool } from "./types/aptos/liquidswap";
import { stake_router } from "./types/aptos/tortuga";

const commonOptions = { sparse:  false }
const liquidityAdd = new Counter("event_liquidity_add", commonOptions)
const liquidityRemoved = new Counter("event_liquidity_remove", commonOptions)
const swap = new Counter("event_swap", commonOptions)
const stake = new Counter("event_stake", commonOptions)
const unstake = new Counter("event_unstake", commonOptions)
const claim = new Counter("event_claim", commonOptions)

const accountTracker = AccountEventTracker.register("users")

stake_router.bind()
  .onEventStakeEvent((evt, ctx) => {
    accountTracker.trackEvent(ctx, { distinctId: ctx.transaction.sender})
    stake.add(ctx, 1)
  })
  .onEventUnstakeEvent((evt, ctx) => {
    accountTracker.trackEvent(ctx, { distinctId: ctx.transaction.sender})
    unstake.add(ctx, 1)
  })
  .onEventClaimEvent((evt, ctx) => {
    accountTracker.trackEvent(ctx, { distinctId: ctx.transaction.sender})
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
  if (coinx === '0x84d7aeef42d38a5ffc3ccef853e1b82e4958659d16a7de736a29c55fbbeb0114::staked_aptos_coin::StakedAptosCoin' && coiny === '0x1::aptos_coin::AptosCoin') {
    return true
  }
  return coiny === '0x84d7aeef42d38a5ffc3ccef853e1b82e4958659d16a7de736a29c55fbbeb0114::staked_aptos_coin::StakedAptosCoin' && coinx === '0x1::aptos_coin::AptosCoin';
}

