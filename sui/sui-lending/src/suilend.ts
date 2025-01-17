import { lending_market } from './types/sui/suilend.js'
import { startCheckpoint } from './utils/index.js'
import { emitBorrowEvent, emitDepositEvent, emitRepayEvent, emitWithdrawEvent } from './utils/events.js'
import { SuiContext } from '@sentio/sdk/sui'

const project = 'suilend'

async function onEvent(
  evt:
    | lending_market.DepositEventInstance
    | lending_market.WithdrawEventInstance
    | lending_market.BorrowEventInstance
    | lending_market.RepayEventInstance,
  ctx: SuiContext,
  eventName: 'deposit' | 'withdraw' | 'borrow' | 'repay',
) {
  const { coin_type } = evt.data_decoded
  const amount =
    'ctoken_amount' in evt.data_decoded ? evt.data_decoded.ctoken_amount : evt.data_decoded.liquidity_amount
  const fn = {
    deposit: emitDepositEvent,
    withdraw: emitWithdrawEvent,
    borrow: emitBorrowEvent,
    repay: emitRepayEvent,
  }[eventName]
  await fn(ctx, {
    project,
    coinType: coin_type.name,
    amount,
  })
}

lending_market
  .bind({ startCheckpoint })
  .onEventDepositEvent(async (evt, ctx) => {
    return onEvent(evt, ctx, 'deposit')
  })
  .onEventWithdrawEvent(async (evt, ctx) => {
    return onEvent(evt, ctx, 'withdraw')
  })
  .onEventBorrowEvent(async (evt, ctx) => {
    return onEvent(evt, ctx, 'borrow')
  })
  .onEventRepayEvent(async (evt, ctx) => {
    return onEvent(evt, ctx, 'repay')
  })
