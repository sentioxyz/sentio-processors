import { EthChainId } from "@sentio/sdk/eth";
import { BindSubjectEvent, RewardClaimedEvent, SubjectRewardSetEvent, TomoContext, TomoProcessor, TradeEvent } from "./types/eth/tomo.js";
import { ethers } from "ethers"
import { scaleDown } from "@sentio/sdk";
import { DepositedEvent, EntryPointContext, EntryPointProcessor } from "./types/eth/entrypoint.js";

const TOMO_CONTRACT = "0x9E813d7661D7B56CBCd3F73E958039B208925Ef8"
const ENTRY_POINT_CONTRACT = "0x5ff137d4b0fdcd49dca30c7cf57e578a026d2789"

const tradeEventHandler = async (event: TradeEvent, ctx: TomoContext) => {
  ctx.eventLogger.emit("tradeEvent", {
    distinctId: event.args.tradeEvent.trader,
    eventIndex: event.args.tradeEvent.eventIndex,
    ts: event.args.tradeEvent.ts,
    trader: event.args.tradeEvent.trader,
    subject: ethers.decodeBytes32String(ethers.zeroPadBytes(ethers.stripZerosLeft(event.args.tradeEvent.subject), 32)),
    subjectBytes32: event.args.tradeEvent.subject,
    // subjectOwner,
    isBuy: event.args.tradeEvent.isBuy.toString(),
    buyAmount: event.args.tradeEvent.buyAmount,
    ethAmount: scaleDown(event.args.tradeEvent.ethAmount, 18),
    traderBalance: event.args.tradeEvent.traderBalance,
    supply: event.args.tradeEvent.supply,
    totalReward: event.args.tradeEvent.totalReward,
    coin_symbol: "eth"
  })
}

const bindSubjectEventHandler = async (event: BindSubjectEvent, ctx: TomoContext) => {
  ctx.eventLogger.emit("bindSubject", {
    eventIndex: event.args.eventIndex,
    ts: event.args.ts,
    subject: ethers.decodeBytes32String(ethers.zeroPadBytes(ethers.stripZerosLeft(event.args.subject), 32)),
    subjectBytes32: event.args.subject,
    owner: event.args.owner
  })
}

const rewardClaimedEventHandler = async (event: RewardClaimedEvent, ctx: TomoContext) => {
  ctx.eventLogger.emit("rewardClaimedEvent", {
    distinctId: event.args.claimEvent.sender,
    eventIndex: event.args.claimEvent.eventIndex,
    ts: event.args.claimEvent.ts,
    sender: event.args.claimEvent.sender,
    subject: ethers.decodeBytes32String(ethers.zeroPadBytes(ethers.stripZerosLeft(event.args.claimEvent.subject), 32)),
    subjectBytes32: event.args.claimEvent.subject,
    claimedIndex: event.args.claimEvent.claimedIndex,
    reward: scaleDown(event.args.claimEvent.reward, 18)
  })
}

const subjectRewardSetEventHandler = async (event: SubjectRewardSetEvent, ctx: TomoContext) => {
  ctx.eventLogger.emit("subjectRewardSetEvent", {
    distinctId: event.args.rewardEvent.owner,
    eventIndex: event.args.rewardEvent.eventIndex,
    ts: event.args.rewardEvent.ts,
    subject: ethers.decodeBytes32String(ethers.zeroPadBytes(ethers.stripZerosLeft(event.args.rewardEvent.subject), 32)),
    subjectBytes32: event.args.rewardEvent.subject,
    owner: event.args.rewardEvent.owner,
    snapshotReward: event.args.rewardEvent.snapshotReward,
    rewardPercent: event.args.rewardEvent.rewardPercent,
    totalReward: event.args.rewardEvent.totalReward
  })
}

TomoProcessor.bind({
  address: TOMO_CONTRACT,
  network: EthChainId.LINEA
})
  .onEventTrade(tradeEventHandler)
  .onEventBindSubject(bindSubjectEventHandler)
  .onEventRewardClaimed(rewardClaimedEventHandler)
  .onEventSubjectRewardSet(subjectRewardSetEventHandler)


