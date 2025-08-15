import { StarNFTProcessor, StarNFTContext, ApprovalForAllEvent, TransferEvent } from './types/eth/starnft.js'
import { ReadOnArchiveProcessor, ReadOnArchiveContext, TransferEvent as ReadOnTransferEvent } from './types/eth/readonarchive.js'
import { CattoProcessor, CattoContext, TransferEvent as CattoTransferEvent,  } from './types/eth/catto.js'
import { EthChainId } from "@sentio/sdk/eth";

const BSC_ADDR = "0xf2e0ac05157a2843c53c6295c0edea6c9ac65c72"
const ARB_ADDR = "0xD6e5E55e342236D4044Fd071E710b7545d9e45DE"
const READON_ARCHIVE_ADDR = "0x6b2641bb98ca944f8806652626f7513fcdc13816"
const CATTO_ADDR = "0x802a3009d53c5df2a21f008f39a0d8322840f16b"

async function handleApproval(evt: ApprovalForAllEvent, ctx: StarNFTContext) {
  const operator = evt.args.operator
  ctx.meter.Counter("approval_for_all_count").add(1)
  ctx.meter.Gauge("approval_for_all_gauge").record(1, {operator: operator})
}

async function handleTransfer(evt: TransferEvent, ctx: StarNFTContext){
  ctx.meter.Counter("transfer_counter").add(1)
  ctx.meter.Gauge("transfer_gauge").record(1)
}

async function handleCattoTransfer(evt: CattoTransferEvent, ctx: CattoContext){
  ctx.meter.Counter("transfer_catto_counter").add(1)
  ctx.meter.Gauge("transfer_catto_gauge").record(1)
  ctx.eventLogger.emit("Transfer", {
    distinctId: evt.args.to,
    to:evt.args.to,
    from:evt.args.from,
    tokenId: evt.args.tokenId,
    message: evt.args.from + " transferred Token" + evt.args.tokenId + " to " + evt.args.to
  })
  if (evt.args.to !== "0x0000000000000000000000000000000000000000") {
    ctx.eventLogger.emit("Holder", {
      distinctId: evt.args.to,
      value: 1,
    })
  }

  if (evt.args.from !== "0x0000000000000000000000000000000000000000") {
    ctx.eventLogger.emit("Holder", {
      distinctId: evt.args.from,
      value: -1,
    })
  }
}

async function handleReadonTransfer(evt: ReadOnTransferEvent, ctx: ReadOnArchiveContext){
  ctx.meter.Counter("readon_transfer_counter").add(1)
  ctx.meter.Gauge("readon_transfer_gauge").record(1)
}

async function cattoOnBlock(_:any, ctx: CattoContext) {
  ctx.meter.Gauge("catto_total_supply").record(await ctx.contract.totalSupply())
}

StarNFTProcessor.bind({ address: BSC_ADDR, network: EthChainId.BSC })
.onEventApprovalForAll(handleApproval)
.onEventTransfer(handleTransfer)

StarNFTProcessor.bind({ address: ARB_ADDR, network: EthChainId.ARBITRUM })
.onEventApprovalForAll(handleApproval)
.onEventTransfer(handleTransfer)

CattoProcessor.bind({ address: CATTO_ADDR, network: EthChainId.ARBITRUM })
.onEventTransfer(handleCattoTransfer)
.onBlockInterval(cattoOnBlock)

ReadOnArchiveProcessor.bind( {address: READON_ARCHIVE_ADDR, network: EthChainId.ARBITRUM})
.onEventTransfer(handleReadonTransfer)
