import { BigDecimal } from "@sentio/sdk";
import { VaultContext, VaultProcessor } from "./types/eth/vault.js";
import { getPriceByType, token } from "@sentio/sdk/utils";
import { EthChainId } from "@sentio/sdk/eth";

VaultProcessor.bind({
  address: "0xBA12222222228d8Ba445958a75a0704d566BF2C8",
  startBlock: 51976090,
  network: EthChainId.POLYGON,
}).onEventSwap(
  async (evt, ctx) => {
    // console.log("has event", ctx.blockNumber)
    try {
      let [tokens, reserves, lastChangeBlock] =
        await ctx.contract.getPoolTokens(evt.args.poolId, {
          blockTag: ctx.blockNumber,
          chainId: EthChainId.POLYGON,
        });
      ctx.eventLogger.emit("Swap", {
        distinctId: evt.args.poolId,
        tokenIn: evt.args.tokenIn,
        tokenOut: evt.args.tokenOut,
        txnTo: ctx.transaction!.to,
        poolID: evt.args.poolId,
      });
    } catch (e) {
      // ctx.contract.provider.
      console.log(ctx.blockNumber, e);
      throw e;
    }
  },
  undefined,
  {
    transaction: true,
  }
);
