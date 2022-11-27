import { StarNFTProcessor, StarNFTContext, ApprovalForAllEvent, TransferEvent } from './types/starnft'

const BSC_ADDR = "0xf2e0ac05157a2843c53c6295c0edea6c9ac65c72"
const ARB_ADDR = "0xD6e5E55e342236D4044Fd071E710b7545d9e45DE"

async function handleApproval(evt: ApprovalForAllEvent, ctx: StarNFTContext) {
  const operator = evt.args.operator
  ctx.meter.Counter("approval_for_all_count").add(1)
  ctx.meter.Gauge("approval_for_all_gauge").record(1, {operator: operator})
}

async function handleTransfer(evt: TransferEvent, ctx: StarNFTContext){
  ctx.meter.Counter("transfer_counter").add(1)
  ctx.meter.Gauge("transfer_gauge").record(1)
}

StarNFTProcessor.bind({ address: BSC_ADDR, network: 56 })
.onEventApprovalForAll(handleApproval)
.onEventTransfer(handleTransfer)

StarNFTProcessor.bind({ address: ARB_ADDR, network: 42161 })
.onEventApprovalForAll(handleApproval)
.onEventTransfer(handleTransfer)

