import { getPriceByType } from '@sentio/sdk/utils'
import { mint, redeem, borrow, repay } from './types/sui/scallop.js'
import { startCheckpoint } from './utils/index.js'
import { emitBorrowEvent, emitDepositEvent, emitRepayEvent, emitWithdrawEvent } from './utils/events.js'
import { SuiNetwork } from '@sentio/sdk/sui'

const project = 'scallop'

mint.bind({ startCheckpoint }).onEventMintEvent(async (evt, ctx) => {
  const { deposit_asset, deposit_amount } = evt.data_decoded
  await emitDepositEvent(ctx, {
    project,
    coinType: deposit_asset.name,
    amount: deposit_amount,
  })
})

redeem.bind({ startCheckpoint }).onEventRedeemEvent(async (evt, ctx) => {
  const { withdraw_asset, withdraw_amount } = evt.data_decoded
  await emitWithdrawEvent(ctx, {
    project,
    coinType: withdraw_asset.name,
    amount: withdraw_amount,
  })
})

borrow.bind({ startCheckpoint }).onEventBorrowEvent(async (evt, ctx) => {
  const { asset, amount } = evt.data_decoded
  await emitBorrowEvent(ctx, {
    project,
    coinType: asset.name,
    amount,
  })
})

repay.bind({ startCheckpoint }).onEventRepayEvent(async (evt, ctx) => {
  const { asset, amount } = evt.data_decoded
  await emitRepayEvent(ctx, {
    project,
    coinType: asset.name,
    amount,
  })
})
