import { EthChainId, GlobalContext, GlobalProcessor } from "@sentio/sdk/eth";
import { ERC20Processor } from "@sentio/sdk/eth/builtin";
import { ERC20Context } from "@sentio/sdk/eth/builtin/erc20";
import { TransactionResponseParams } from "ethers";

const WETH = "0xe44fd7fcb2b1581822d0c862b68222998a0c299a"
const WCRO = "0x5c7f8a570d578ed84e63fdfa7b1ee72deae1ae23"
const VVS = "0x2d03bece6747adc00e1a131bba1469c15fd11e03"

const address1 = "0xeadf7c01da7e93fdb5f16b0aa9ee85f978e89e95".toLowerCase()
const address2 = "0x543F4Db9BD26C9Eb6aD4DD1C33522c966C625774".toLowerCase()
const address3 = "0xE09f3B486c6d45CF7017d5D45DFB3ab35f8a51b8".toLowerCase()


const transferEventHandler = async (event: any, ctx: any) => {
  ctx.eventLogger.emit("transferEvent", {
    distinctId: event.args.from,
    from: event.args.from,
    to: event.args.to,
    value: event.args.value,
  })
}

const transactionHandler = async (tx: TransactionResponseParams, ctx: GlobalContext) => {
  if (tx.from.toLowerCase() == address1 || tx.to?.toLowerCase() == address1) {
    ctx.eventLogger.emit("transferEvent", {
      distinctId: tx.from,
      from: tx.from,
      to: tx.to,
      value: tx.value
    })
  }
}


const filter2_to = ERC20Processor.filters.Transfer(
  null,
  address2
)

const filter2_from = ERC20Processor.filters.Transfer(
  address2,
  null
)

const filter3_to = ERC20Processor.filters.Transfer(
  null,
  address3
)

const filter3_from = ERC20Processor.filters.Transfer(
  address3,
  null
)


ERC20Processor.bind({
  address: WETH,
  network: EthChainId.CRONOS,
  baseLabels: { "symbol": "WETH" }
})
  .onEventTransfer(transferEventHandler, [filter2_from, filter2_to])


ERC20Processor.bind({
  address: WCRO,
  network: EthChainId.CRONOS,
  baseLabels: { "symbol": "WCRO" }

})
  .onEventTransfer(transferEventHandler, [filter3_from, filter3_to])

ERC20Processor.bind({
  address: VVS,
  network: EthChainId.CRONOS,
  baseLabels: { "symbol": "VVS" }
})
  .onEventTransfer(transferEventHandler, [filter3_from, filter3_to])


GlobalProcessor.bind({
  network: EthChainId.CRONOS,
  baseLabels: { "symbol": "CRO" }
})
  .onTransaction(transactionHandler)