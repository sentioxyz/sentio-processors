import { EthChainId } from "@sentio/sdk/eth";
import { TomoContext, TomoProcessor, TradeEvent } from "./types/eth/tomo.js";
import { ethers } from "ethers"
import { scaleDown } from "@sentio/sdk";

const TOMO_CONTRACT = "0x9E813d7661D7B56CBCd3F73E958039B208925Ef8"
const tradeEventHandler = async (event: TradeEvent, ctx: TomoContext) => {
  ctx.eventLogger.emit("tradeEvent", {
    distinctId: event.args.tradeEvent.trader,
    eventIndex: event.args.tradeEvent.eventIndex,
    ts: event.args.tradeEvent.ts,
    trader: event.args.tradeEvent.trader,
    subject: ethers.toUtf8String(event.args.tradeEvent.subject),
    isBuy: event.args.tradeEvent.isBuy.toString(),
    buyAmount: event.args.tradeEvent.buyAmount,
    ethAmount: scaleDown(event.args.tradeEvent.ethAmount, 18),
    traderBalance: event.args.tradeEvent.traderBalance,
    supply: event.args.tradeEvent.supply,
    totalReward: event.args.tradeEvent.totalReward,
    coin_symbol: "eth"
  })
}


TomoProcessor.bind({
  address: TOMO_CONTRACT,
  network: EthChainId.LINEA
})
  .onEventTrade(tradeEventHandler)