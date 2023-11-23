import { Counter, Gauge } from "@sentio/sdk";
import { ERC20Processor } from "@sentio/sdk/eth/builtin";
import { Vyper_contractProcessor } from "./types/eth/vyper_contract.js";
import { EthChainId } from "@sentio/sdk/eth";

Vyper_contractProcessor.bind({
  address: "0x722272D36ef0Da72FF51c5A65Db7b870E2e8D4ee",
  network: EthChainId.POLYGON,
  startBlock: 45552958,
}).onEventPlainPoolDeployed(async (evt, ctx) => {
  ctx.eventLogger.emit("Pool", {
    a: evt.args.A,
  });
});
