import { token } from '@sentio/sdk/aptos/builtin/0x3'

token.bind()
    .onEventWithdrawEvent(
    (evt, ctx) => {
      if (evt.data_decoded.id.token_data_id.name === 'Pontem Space Pirates') {
        ctx.eventTracker.track("Withdraw", { distinctId: evt.guid.account_address, evt })
      }
    }
).onEventWithdrawEvent((evt, ctx) => {
  if (evt.data_decoded.id.token_data_id.name === 'Pontem Space Pirates') {
    ctx.eventTracker.track("Deposit", { distinctId: evt.guid.account_address, evt })
  }
})