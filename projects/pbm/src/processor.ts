import { EthChainId } from "@sentio/sdk/eth";
import { MerchantPaymentEvent, PbmContext, PbmProcessor, TransferBatchEvent, TransferSingleEvent } from "./types/eth/pbm.js";

const PBM_CONTRACT_ADDR = "0xD2D74e2136D60A3c0D252C6dE4102a82f2511DEF"


const merchantPaymentEventHandler = async (event: MerchantPaymentEvent, ctx: PbmContext) => {
  const tokenIds = event.args.tokenIds
  for (let i = 0; i < tokenIds.length; i++) {
    ctx.eventLogger.emit("merchantPaymentEvent", {
      distinctId: event.args.from,
      from: event.args.from,
      to: event.args.to,
      tokenId: tokenIds[i],
      amount: event.args.amounts[i],
      ERC20Token: event.args.ERC20Token,
      ERC20TokenValue: event.args.ERC20TokenValue,
      batchIndex: i,
      batchLength: tokenIds.length
    })
  }
}

const transferSingleEventHandler = async (event: TransferSingleEvent, ctx: PbmContext) => {
  ctx.eventLogger.emit("transferSingleEvent", {
    distinctId: event.args.from,
    operator: event.args.operator,
    from: event.args.from,
    to: event.args.to,
    id: event.args.id,
    value: event.args.value
  })
}

const transferBatchEventHandler = async (event: TransferBatchEvent, ctx: PbmContext) => {
  const ids = event.args.ids
  //@ts-ignore
  const values = event.args[4]
  for (let i = 0; i < ids.length; i++) {
    ctx.eventLogger.emit("transferBatchEvent", {
      distinctId: event.args.from,
      operator: event.args.operator,
      from: event.args.from,
      to: event.args.to,
      id: ids[i],
      value: values[i],
      batchIndex: i,
      batchLength: ids.length
    })
  }
}


PbmProcessor.bind({
  address: PBM_CONTRACT_ADDR,
  network: EthChainId.POLYGON
})
  .onEventMerchantPayment(merchantPaymentEventHandler)
  .onEventTransferSingle(transferSingleEventHandler)
  .onEventTransferBatch(transferBatchEventHandler)