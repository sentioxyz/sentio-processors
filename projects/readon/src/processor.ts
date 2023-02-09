import { StarNFTProcessor, StarNFTContext, ApprovalForAllEvent, TransferEvent } from './types/eth/starnft.js'
import { ReadOnArchiveProcessor, ReadOnArchiveContext, TransferEvent as ReadOnTransferEvent } from './types/eth/readonarchive.js'

const BSC_ADDR = "0xf2e0ac05157a2843c53c6295c0edea6c9ac65c72"
const ARB_ADDR = "0xD6e5E55e342236D4044Fd071E710b7545d9e45DE"
const READON_ARCHIVE_ADDR = "0x6b2641bb98ca944f8806652626f7513fcdc13816"

async function handleApproval(evt: ApprovalForAllEvent, ctx: StarNFTContext) {
  const operator = evt.args.operator
  ctx.meter.Counter("approval_for_all_count").add(1)
  ctx.meter.Gauge("approval_for_all_gauge").record(1, {operator: operator})
}

async function handleTransfer(evt: TransferEvent, ctx: StarNFTContext){
  ctx.meter.Counter("transfer_counter").add(1)
  ctx.meter.Gauge("transfer_gauge").record(1)
}

async function handleReadonTransfer(evt: ReadOnTransferEvent, ctx: ReadOnArchiveContext){
  ctx.meter.Counter("readon_transfer_counter").add(1)
  ctx.meter.Gauge("readon_transfer_gauge").record(1)
}

StarNFTProcessor.bind({ address: BSC_ADDR, network: 56 })
.onEventApprovalForAll(handleApproval)
.onEventTransfer(handleTransfer)

StarNFTProcessor.bind({ address: ARB_ADDR, network: 42161 })
.onEventApprovalForAll(handleApproval)
.onEventTransfer(handleTransfer)

ReadOnArchiveProcessor.bind( {address: READON_ARCHIVE_ADDR, network: 42161})
.onEventTransfer(handleReadonTransfer)


