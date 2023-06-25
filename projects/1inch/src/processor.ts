import { BigDecimal, Counter, Gauge } from "@sentio/sdk";
import { ERC20Processor } from "@sentio/sdk/eth/builtin";
import {
  AggregationRouterV5Processor,
  AggregationRouterV5Context,
} from "./types/eth/aggregationrouterv5.js";
import { getPriceByType, token } from "@sentio/sdk/utils";
import { EthChainId } from "@sentio/sdk/eth";

type TokenWithPrice = {
  token: token.TokenInfo;
  price: BigDecimal;
  scaledAmount: BigDecimal;
};

export const volOptions = {
  sparse: true,
  aggregationConfig: {
    intervalInMinutes: [60],
    // discardOrigin: false
  },
};

// define gauge for trading
const vol = Gauge.register("vol", volOptions);

async function getTokenWithPrice(
  tokenAddr: string,
  chainID: EthChainId,
  timestamp: Date,
  amount: bigint
): Promise<TokenWithPrice | undefined> {
  let tokenInfo: token.TokenInfo;
  try {
    tokenInfo = await token.getERC20TokenInfo(chainID, tokenAddr);
  } catch (e) {
    console.log("get token failed", e, tokenAddr, chainID);
    return undefined;
  }
  let price: any;
  let ret: TokenWithPrice = {
    token: tokenInfo,
    price: BigDecimal(0),
    scaledAmount: BigDecimal(0),
  };
  try {
    price = await getPriceByType(chainID, tokenAddr, timestamp);
    if (isNaN(price)) {
      console.log("price is NaN", tokenAddr, chainID, timestamp);
      return undefined;
    }
    ret.price = BigDecimal(price);
    ret.scaledAmount = amount.scaleDown(tokenInfo.decimal);
    return ret;
  } catch (e) {
    console.log("get price failed", e, tokenAddr, chainID);
  }
  return undefined;
}

AggregationRouterV5Processor.bind({
  address: "0x1111111254EEB25477B68fb85Ed929f73A960582",
  network: EthChainId.POLYGON,
  startBlock: 44269573,
})
  .onCallFillOrderTo(async (call, ctx) => {
    if (call.error) {
      return;
    }
    let makerAsset = await getTokenWithPrice(
      call.args.order_.makerAsset,
      ctx.chainId,
      ctx.timestamp,
      call.args.order_.makingAmount
    );
    if (makerAsset !== undefined) {
      let total = makerAsset.scaledAmount.multipliedBy(makerAsset.price);
      vol.record(ctx, total, { asset: makerAsset.token.symbol });
      ctx.eventLogger.emit("fillOrder", {
        makerAsset: makerAsset.token.symbol,
        total: total,
        distinctId: call.action.from,
      });
    }
    let takerAsset = await getTokenWithPrice(
      call.args.order_.takerAsset,
      ctx.chainId,
      ctx.timestamp,
      call.args.order_.takingAmount
    );
    if (takerAsset !== undefined) {
      let total = takerAsset.scaledAmount.multipliedBy(takerAsset.price);
      vol.record(ctx, total, { asset: takerAsset.token.symbol });
      ctx.eventLogger.emit("fillOrder", {
        takerAsset: takerAsset.token.symbol,
        total: total,
        distinctId: call.action.from,
      });
    }
  })
  .onCallFillOrderRFQTo(async (call, ctx) => {
    if (call.error) {
      return;
    }
    let makerAsset = await getTokenWithPrice(
      call.args.order.makerAsset,
      ctx.chainId,
      ctx.timestamp,
      call.args.order.makingAmount
    );
    if (makerAsset !== undefined) {
      let total = makerAsset.scaledAmount.multipliedBy(makerAsset.price);
      vol.record(ctx, total, { asset: makerAsset.token.symbol });
    }
    let takerAsset = await getTokenWithPrice(
      call.args.order.takerAsset,
      ctx.chainId,
      ctx.timestamp,
      call.args.order.takingAmount
    );
    if (takerAsset !== undefined) {
      let total = takerAsset.scaledAmount.multipliedBy(takerAsset.price);
      vol.record(ctx, total, { asset: takerAsset.token.symbol });
    }
  });
