import { SuiContext } from '@sentio/sdk/sui'
import { event } from '../../types/sui/navi.js'
import { getCoinTypeForReserve, PROJECT, SYMBOL_MAP, DECIMAL_MAP } from '../constants.js'
import { emitMarketLendingEvent, emitRawEvent } from '../../utils/events.js'

export function registerCoreLendingHandlers(processor: event) {
  processor
    .onEventDepositEvent(async (evt: event.DepositEventInstance, ctx: SuiContext) => {
      const { reserve, sender, amount, market_id } = evt.data_decoded
      await emitMarketLendingEvent(ctx, {
        project: PROJECT,
        coinType: getCoinTypeForReserve(market_id, reserve),
        amount, sender, market_id,
      }, 'deposit')
    })

    .onEventDepositOnBehalfOfEvent(async (evt: event.DepositOnBehalfOfEventInstance, ctx: SuiContext) => {
      const { reserve, sender, user, amount, market_id } = evt.data_decoded
      await emitMarketLendingEvent(ctx, {
        project: PROJECT,
        coinType: getCoinTypeForReserve(market_id, reserve),
        amount, sender, market_id, user,
      }, 'deposit_on_behalf')
    })

    .onEventWithdrawEvent(async (evt: event.WithdrawEventInstance, ctx: SuiContext) => {
      const { reserve, sender, to, amount, market_id } = evt.data_decoded
      await emitMarketLendingEvent(ctx, {
        project: PROJECT,
        coinType: getCoinTypeForReserve(market_id, reserve),
        amount, sender, market_id, to,
      }, 'withdraw')
    })

    .onEventBorrowEvent(async (evt: event.BorrowEventInstance, ctx: SuiContext) => {
      const { reserve, sender, amount, market_id } = evt.data_decoded
      await emitMarketLendingEvent(ctx, {
        project: PROJECT,
        coinType: getCoinTypeForReserve(market_id, reserve),
        amount, sender, market_id,
      }, 'borrow')
    })

    .onEventRepayEvent(async (evt: event.RepayEventInstance, ctx: SuiContext) => {
      const { reserve, sender, amount, market_id } = evt.data_decoded
      await emitMarketLendingEvent(ctx, {
        project: PROJECT,
        coinType: getCoinTypeForReserve(market_id, reserve),
        amount, sender, market_id,
      }, 'repay')
    })

    .onEventRepayOnBehalfOfEvent(async (evt: event.RepayOnBehalfOfEventInstance, ctx: SuiContext) => {
      const { reserve, sender, user, amount, market_id } = evt.data_decoded
      await emitMarketLendingEvent(ctx, {
        project: PROJECT,
        coinType: getCoinTypeForReserve(market_id, reserve),
        amount, sender, market_id, user,
      }, 'repay_on_behalf')
    })

    .onEventLiquidationCallEvent(async (evt: event.LiquidationCallEventInstance, ctx: SuiContext) => {
      const { reserve, sender, liquidate_user, liquidate_amount, market_id } = evt.data_decoded
      emitRawEvent(ctx, 'liquidation_call', {
        sender,
        liquidate_user,
        reserve,
        reserve_symbol: SYMBOL_MAP[reserve] ?? 'unknown',
        liquidate_amount: liquidate_amount.toString(),
        market_id: market_id.toString(),
      })
    })

    .onEventLiquidationEvent(async (evt: event.LiquidationEventInstance, ctx: SuiContext) => {
      const d = evt.data_decoded
      emitRawEvent(ctx, 'liquidation', {
        sender: d.sender,
        user: d.user,
        collateral_asset: d.collateral_asset,
        collateral_symbol: SYMBOL_MAP[d.collateral_asset] ?? 'unknown',
        collateral_price: d.collateral_price.toString(),
        collateral_amount: d.collateral_amount.toString(),
        collateral_decimals: DECIMAL_MAP[d.collateral_asset] ?? 9,
        treasury: d.treasury.toString(),
        debt_asset: d.debt_asset,
        debt_symbol: SYMBOL_MAP[d.debt_asset] ?? 'unknown',
        debt_price: d.debt_price.toString(),
        debt_amount: d.debt_amount.toString(),
        debt_decimals: DECIMAL_MAP[d.debt_asset] ?? 9,
        market_id: d.market_id.toString(),
      })
    })
}
