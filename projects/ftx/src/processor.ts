import { AccountEventTracker, aptos, Counter, Gauge } from "@sentio/sdk";
import { aptos_coin, coin, managed_coin, resource_account, aptos_account } from "@sentio/sdk/lib/builtin/aptos/0x1";

import { DEFAULT_MAINNET_LIST, RawCoinInfo } from "@manahippo/coin-list/dist/list";
import { scaleDown } from "@sentio-processor/common/dist/aptos/coin";

const coinInfoMap = new Map<string, RawCoinInfo>()

for (const x of DEFAULT_MAINNET_LIST) {
  coinInfoMap.set(x.token_type.type, x)
}

const APT_DECIMAL = 8
const FTX_ADDRESS = "0x779c7c22193a9510f564e92747e1815f386d73877ed9f1720a03b5632ca1f460"

const fromFTX = Counter.register("from_tx_counter", { sparse: true })
const fromFTXAmount = Counter.register("from_tx_amount_cume", { sparse: true })

const toFTX = Counter.register("to_tx_counter", { sparse: true })
const toFTXAmount = Counter.register("to_tx_amount_cume", { sparse: true })

const total = Counter.register("total_transfer", { sparse: true })

coin.bind()
  .onEntryTransfer((call, ctx) => {
    if (call.type_arguments[0] == "0x84d7aeef42d38a5ffc3ccef853e1b82e4958659d16a7de736a29c55fbbeb0114::staked_aptos_coin::StakedAptosCoin") {
      const from = ctx.transaction.sender
      const to = call.arguments_typed[0]
      const amount = scaleDown(call.arguments_typed[1], APT_DECIMAL)
      if (amount.gt(10)) {
        if (from == FTX_ADDRESS) {
          fromFTX.add(ctx,1, {to: to, symbol: "tAPT"})
          fromFTXAmount.add(ctx, amount, {to: to, symbol: "tAPT"})
        }
        if (to == FTX_ADDRESS) {
          toFTX.add(ctx,1, {from: from, symbol: "tAPT"})
          toFTXAmount.add(ctx, amount, {from: from, symbol: "tAPT"})
        }
      }
      total.add(ctx, 1, {symbol: "tAPT"})
    }
  })
  // .onEventDepositEvent((evt, ctx) => {
  //   if (evt.guid.account_address === FTX_ADDRESS) {{
  //     ctx.meter.Counter("in_tx_amount_cume").add(scaleDown(evt.data_typed.amount, APT_DECIMAL), { from: ctx.transaction.sender })
  //   }}
  // })
  // .onEventWithdrawEvent((evt, ctx) => {
  //   if (evt.guid.account_address === FTX_ADDRESS) {{
  //     ctx.meter.Counter("out_tx_amount_cume").add(scaleDown(evt.data_typed.amount, APT_DECIMAL), { from: ctx.transaction.sender })
  //   }}
  // })
  //

aptos_account.bind()
    .onEntryTransfer((call, ctx) => {
      const from = ctx.transaction.sender
      const to = call.arguments_typed[0]
      const amount = scaleDown(call.arguments_typed[1], APT_DECIMAL)

      if (amount.gt(10)) {
        if (from == FTX_ADDRESS) {
          fromFTX.add(ctx,1, {to: to, symbol: "APT"})
          fromFTXAmount.add(ctx, amount, {to: to, symbol: "APT"})
        }
        if (to == FTX_ADDRESS) {
          toFTX.add(ctx,1, {from: from, symbol: "APT"})
          toFTXAmount.add(ctx, amount, {from: from, symbol: "APT"})
        }
      }
      total.add(ctx, 1, {symbol: "APT"})
    })