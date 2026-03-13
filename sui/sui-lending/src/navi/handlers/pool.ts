import { SuiContext } from '@sentio/sdk/sui'
import { event } from '../../types/sui/navi.js'
import { SYMBOL_MAP } from '../constants.js'
import { emitRawEvent } from '../../utils/events.js'

export function registerPoolHandlers(processor: event) {
  // --- Pool events ---

  processor
    .onEventPoolCreate(async (evt: event.PoolCreateInstance, ctx: SuiContext) => {
      const { creator, coin_type, pool_id, market_id } = evt.data_decoded
      emitRawEvent(ctx, 'pool_create', {
        creator,
        coin_type,
        pool_id,
        market_id: market_id.toString(),
      })
    })

    .onEventPoolDeposit(async (evt: event.PoolDepositInstance, ctx: SuiContext) => {
      const { sender, amount, pool, market_id } = evt.data_decoded
      emitRawEvent(ctx, 'pool_deposit', {
        sender,
        amount: amount.toString(),
        pool,
        market_id: market_id.toString(),
      })
    })

    .onEventPoolWithdraw(async (evt: event.PoolWithdrawInstance, ctx: SuiContext) => {
      const { sender, recipient, amount, pool, market_id } = evt.data_decoded
      emitRawEvent(ctx, 'pool_withdraw', {
        sender,
        recipient,
        amount: amount.toString(),
        pool,
        market_id: market_id.toString(),
      })
    })

    .onEventPoolWithdrawReserve(async (evt: event.PoolWithdrawReserveInstance, ctx: SuiContext) => {
      const { sender, recipient, amount, before, after, pool, poolId, market_id } = evt.data_decoded
      emitRawEvent(ctx, 'pool_withdraw_reserve', {
        sender,
        recipient,
        amount: amount.toString(),
        before: before.toString(),
        after: after.toString(),
        pool,
        poolId,
        market_id: market_id.toString(),
      })
    })

    .onEventPoolBalanceRegister(async (evt: event.PoolBalanceRegisterInstance, ctx: SuiContext) => {
      const { sender, amount, new_amount, pool, market_id } = evt.data_decoded
      emitRawEvent(ctx, 'pool_balance_register', {
        sender,
        amount: amount.toString(),
        new_amount: new_amount.toString(),
        pool,
        market_id: market_id.toString(),
      })
    })

  // --- Pool Manager events (no market_id, use manager_id) ---

    .onEventFundUpdated(async (evt: event.FundUpdatedInstance, ctx: SuiContext) => {
      const d = evt.data_decoded
      emitRawEvent(ctx, 'fund_updated', {
        original_sui_amount: d.original_sui_amount.toString(),
        current_sui_amount: d.current_sui_amount.toString(),
        vsui_balance_amount: d.vsui_balance_amount.toString(),
        target_sui_amount: d.target_sui_amount.toString(),
        manager_id: d.manager_id,
      })
    })

    .onEventStakingTreasuryWithdrawn(async (evt: event.StakingTreasuryWithdrawnInstance, ctx: SuiContext) => {
      const d = evt.data_decoded
      emitRawEvent(ctx, 'staking_treasury_withdrawn', {
        taken_vsui_balance_amount: d.taken_vsui_balance_amount.toString(),
        equal_sui_balance_amount: d.equal_sui_balance_amount.toString(),
        manager_id: d.manager_id,
      })
    })

  // --- State event ---

    .onEventStateUpdated(async (evt: event.StateUpdatedInstance, ctx: SuiContext) => {
      const d = evt.data_decoded
      emitRawEvent(ctx, 'state_updated', {
        user: d.user,
        asset: d.asset,
        asset_symbol: SYMBOL_MAP[d.asset] ?? 'unknown',
        user_supply_balance: d.user_supply_balance.toString(),
        user_borrow_balance: d.user_borrow_balance.toString(),
        new_supply_index: d.new_supply_index.toString(),
        new_borrow_index: d.new_borrow_index.toString(),
        market_id: d.market_id.toString(),
      })
    })

  // --- Reward Claimed ---

    .onEventRewardClaimed(async (evt: event.RewardClaimedInstance, ctx: SuiContext) => {
      const d = evt.data_decoded
      emitRawEvent(ctx, 'reward_claimed', {
        distinctId: d.user,
        user: d.user,
        total_claimed: d.total_claimed.toString(),
        coin_type: d.coin_type,
        rule_ids: d.rule_ids,
        rule_indices: d.rule_indices.map((i: bigint) => i.toString()),
        market_id: d.market_id.toString(),
      })
    })
}
