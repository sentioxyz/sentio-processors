// import { pool, pool_factory } from "./types/sui/turbos.js";
import { SuiObjectProcessor, SuiContext, SuiObjectContext, SuiObjectProcessorTemplate } from "@sentio/sdk/sui"
import * as constant from './constant-turbos.js'
import { ChainId, SuiChainId } from "@sentio/sdk"
import * as helper from './helper/turbos-clmm-helper.js'
import { Gauge } from "@sentio/sdk";
import { pool } from "./types/sui/testnet/0x8ba6cdd02f5d1b9ff9970690681c21957d9a6a6fbb74546b2f0cfb16dbff4c25.js"
import { lending } from "./types/sui/testnet/0x8ba6cdd02f5d1b9ff9970690681c21957d9a6a6fbb74546b2f0cfb16dbff4c25.js";

export type LendingEvent = lending.BorrowEventInstance | lending.DepositEventInstance | lending.WithdrawEventInstance | lending.RepayEventInstance

SuiObjectProcessor.bind({
  objectId: "0x5d137ca143af1366db782327d957d8e2afbf10c17b9d45e0f46111e6bcc4e805",
  network: ChainId.SUI_TESTNET,
  startCheckpoint: 3000000n
}).onTimeInterval(async (self, _, ctx) => {
  if (self) {
    try {
      const totalSupply = Number(self.fields.supply_balance.fields.total_supply)
      ctx.meter.Gauge("total_supply").record(totalSupply)

    } catch(e) {
      console.log(e)
    }
  }
})

async function onEvent(event: LendingEvent, ctx: SuiContext) {
  const sender = event.data_decoded.sender
  const amount = event.data_decoded.amount
  const reserve = event.data_decoded.reserve

  const typeArray = event.type.split("::")
  const type = typeArray[typeArray.length - 1]

  ctx.eventLogger.emit("UserInteraction", {
    distinctId: sender,
    sender,
    amount,
    reserve
  })

}

lending.bind()
.onEventBorrowEvent(onEvent)
.onEventDepositEvent(onEvent)
.onEventRepayEvent(onEvent)
.onEventWithdrawEvent(onEvent)