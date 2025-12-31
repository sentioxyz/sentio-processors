import { EthChainId } from "@sentio/sdk/eth";
import { ERC20Processor } from "@sentio/sdk/eth/builtin";


ERC20Processor.bind({
  address: "0x0bb304225860664687d5789397bf760e9bdae294",
  network: EthChainId.BSC
})
  .onEventTransfer(async (event, ctx) => {
    ctx.eventLogger.emit("Transfer", {
      distinctId: event.args.from,
      from: event.args.from,
      to: event.args.to,
      value: Number(event.args.value) / 10 ** 18
    })
  })
