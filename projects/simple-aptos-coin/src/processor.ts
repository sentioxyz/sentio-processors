import { findNewCoinBalances, whitelistTokens } from "@sentio/sdk/aptos/ext";
import { account, coin, type_info } from "@sentio/sdk/aptos/builtin/0x1";

const TOKEN = "0x73eb84966be67e4697fc5ae75173ca6c35089e802650f75422ab49a8729704ec::coin::DooDoo"

const fetchOption = { allEvents: false, resourceChanges: true }
coin.bind({
  startVersion: 369045160,
}).onEventDepositEvent(async (evt, ctx) => {
  const balance = findNewCoinBalances(evt, ctx.transaction, TOKEN)
  if (balance) {
    ctx.eventLogger.emit("change", {
      distinctId: evt.guid.account_address,
      token: TOKEN,
      amount: evt.data_decoded.amount,
      balance: balance,
      account: evt.guid.account_address
    })
  }
}, fetchOption)
  .onEventWithdrawEvent(async (evt, ctx) => {
    const balance = findNewCoinBalances(evt, ctx.transaction, TOKEN)
    if (balance) {
      ctx.eventLogger.emit("change", {
        distinctId: evt.guid.account_address,
        token: TOKEN,
        amount: -evt.data_decoded.amount,
        balance: balance.value,
        account: evt.guid.account_address
      })
    }
  }, fetchOption)
