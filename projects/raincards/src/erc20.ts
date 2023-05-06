import { MintEvent, BurnEvent, TransferEvent, TransferEventFilter } from "./types/eth/fiattokenv2.js"
import { FiatTokenV2Context, FiatTokenV2Processor } from "./types/eth/fiattokenv2.js"
import { scaleDown } from '@sentio/sdk'

const USDC_PROXY = "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48"
const RAINCARD = "0x318ea64575feA5333c845bccEb5A6211952283AD".toLowerCase()
const DECIMAL = 6


const tranferEventHandler = async function(event: TransferEvent, ctx: FiatTokenV2Context) {
  ctx.meter.Counter("transfer_count").add(1)
  const amount = scaleDown(event.args.value, DECIMAL)
  const from = event.args.from
  ctx.meter.Counter("transfer_amount").add(amount)
  ctx.eventLogger.emit("depositors", {
    distinctId: from,
    message: `${from} deposited ${amount} USDC`
  })
}

const filter = FiatTokenV2Processor.filters.Transfer(
  undefined,
  RAINCARD
)

FiatTokenV2Processor.bind({address: USDC_PROXY, startBlock: 16049488})
  .onEventTransfer(tranferEventHandler, filter)