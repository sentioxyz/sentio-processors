import { Event } from '@sentio/sdk'
import { AptosContext } from '@sentio/sdk/aptos'
import { controller } from './types/aptos/aries.js'
import { AptosCoinList } from '@sentio/sdk/aptos/ext'

async function recordEvent(
  evt:
    | controller.AddLPShareEventInstance
    | controller.RedeemLPShareEventInstance
    | controller.RemoveLPShareEventInstance
    | controller.DepositEventInstance
    | controller.WithdrawEventInstance
    | controller.BeginFlashLoanEventInstance
    | controller.EndFlashLoanEventInstance
    | controller.SwapEventInstance
    | controller.ClaimRewardEventInstance,
  ctx: AptosContext,
  name: string,
  distinctId?: string
) {
  const coinInfo = await AptosCoinList.getCoinInfo(evt.type_arguments[0])
  const payload: Event<any> = { distinctId, symbol: coinInfo.symbol }
  for (const [key, value] of Object.entries(evt.data_decoded)) {
    if (key.includes('amount') && typeof value == 'bigint') {
      payload[key] = value.scaleDown(coinInfo.decimals)
    } else {
      payload[key] = value
    }
  }
  ctx.eventLogger.emit(name, payload)
}

controller
  .bind()
  .onEventAddLPShareEvent((evt, ctx) => recordEvent(evt, ctx, 'add-lp-share', evt.data_decoded.user_addr))
  .onEventRedeemLPShareEvent((evt, ctx) => recordEvent(evt, ctx, 'redeem-lp-share', evt.data_decoded.user_addr))
  .onEventRemoveLPShareEvent((evt, ctx) => recordEvent(evt, ctx, 'remove-lp-share', evt.data_decoded.user_addr))
  .onEventDepositEvent((evt, ctx) => recordEvent(evt, ctx, 'deposit', evt.data_decoded.sender))
  .onEventWithdrawEvent((evt, ctx) => recordEvent(evt, ctx, 'withdraw', evt.data_decoded.sender))
  .onEventBeginFlashLoanEvent((evt, ctx) => recordEvent(evt, ctx, 'begin-flash-loan', evt.data_decoded.user_addr))
  .onEventEndFlashLoanEvent((evt, ctx) => recordEvent(evt, ctx, 'end-flash-loan', evt.data_decoded.user_addr))
  .onEventSwapEvent((evt, ctx) => recordEvent(evt, ctx, 'swap', evt.data_decoded.sender))
  .onEventClaimRewardEvent((evt, ctx) => recordEvent(evt, ctx, 'claim-reward', evt.data_decoded.user_addr))
