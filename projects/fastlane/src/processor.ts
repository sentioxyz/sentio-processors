import { Counter, Gauge } from "@sentio/sdk";
import { ERC20Processor } from "@sentio/sdk/eth/builtin";
import {
  FastLaneAuctionHandlerContext,
  FastLaneAuctionHandlerProcessor,
  RelayFlashBidEvent,
} from "./types/eth/fastlaneauctionhandler.js";
import { EthChainId } from "@sentio/sdk/eth";

const handleFlashBid = async (
  event: RelayFlashBidEvent,
  ctx: FastLaneAuctionHandlerContext
) => {
  ctx.eventLogger.emit("bid", {
    distinctId: event.args.searcherContractAddress,
    oppTxHash: event.args.oppTxHash,
    validator: event.args.validator,
    amount: event.args.amount.scaleDown(18),
  });
};

FastLaneAuctionHandlerProcessor.bind({
  address: "0xf5df545113dee4df10f8149090aa737ddc05070a",
  network: EthChainId.POLYGON,
}).onEventRelayFlashBid(handleFlashBid);
