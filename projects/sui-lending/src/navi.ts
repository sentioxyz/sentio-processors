import { lending } from './types/sui/navi.js'
import { startCheckpoint } from './utils/index.js'
import { emitBorrowEvent, emitDepositEvent, emitRepayEvent, emitWithdrawEvent } from './utils/events.js'
import { SuiContext } from '@sentio/sdk/sui'

// https://naviprotocol.gitbook.io/navi-protocol-developer-docs/contract-interface/contract-address
const COINS = [
  // 0
  '0x0000000000000000000000000000000000000000000000000000000000000002::sui::SUI',
  '0x5d4b302506645c37ff133b98c4b50a5ae14841659738d6d733d59d0d217a93bf::coin::COIN',
  '0xc060006111016b8a020ad5b33834984a437aaa7d3c74c18e09a95d48aceab08c::coin::COIN',
  '0xaf8cd5edc19c4512f4259f0bee101a40d41ebed738ade5874359610ef8eeced5::coin::COIN',
  '0x06864a6f921804860930db6ddbe2e16acdf8504495ea7481637a1c8b9a8fe54b::cetus::CETUS',
  // 5
  '0x549e8b69270defbfafd4f94e17ec44cdbdd99820b33bda2278dea3b9a32d3f55::cert::CERT',
  '0xbde4ba4c2e274a60ce15c1cfff9e5c42e41654ac8b6d906a57efa4bd3c29f47d::hasui::HASUI',
  '0xa99b8952d4f7d947ea77fe0ecdcc9e5fc0bcab2841d6e2a5aa00c3044e5544b5::navx::NAVX',
]

const project = 'navi'

async function onEvent(
  evt:
    | lending.DepositEventInstance
    | lending.WithdrawEventInstance
    | lending.BorrowEventInstance
    | lending.RepayEventInstance,
  ctx: SuiContext,
  eventName: 'deposit' | 'withdraw' | 'borrow' | 'repay',
) {
  const { reserve, amount } = evt.data_decoded
  const fn = {
    deposit: emitDepositEvent,
    withdraw: emitWithdrawEvent,
    borrow: emitBorrowEvent,
    repay: emitRepayEvent,
  }[eventName]
  const coinType = COINS[reserve]
  if (!coinType) {
    console.warn('Coin not found for reserve', reserve)
    return
  }
  await fn(ctx, {
    project,
    coinType,
    amount,
  })
}

lending
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
