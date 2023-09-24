import { Counter, Gauge } from "@sentio/sdk";
import { ERC20Processor } from "@sentio/sdk/eth/builtin";
import {
  DPPFactory,
  DPPFactoryContext,
  DPPFactoryProcessor,
  NewDPPEvent,
} from "./types/eth/dppfactory.js";
import { EthChainId } from "@sentio/sdk/eth";

const transferHandler = async function (
  event: NewDPPEvent,
  ctx: DPPFactoryContext
) {
  ctx.eventLogger.emit("newDPP", {
    distinctId: event.args.dpp,
    dpp: event.args.dpp,
    message: `New DPP ${event.args.dpp}`,
  });
};

DPPFactoryProcessor.bind({
  address: "0xd24153244066f0afa9415563bfc7ba248bfb7a51",
  network: EthChainId.POLYGON,
}).onEventNewDPP(transferHandler);
