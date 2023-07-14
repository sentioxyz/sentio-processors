import { FortuneProcessor, FortuneContext } from "./types/eth/fortune.js";
import { EthChainId } from "@sentio/sdk/eth";
import { BankProcessor } from "./types/eth/bank.js";
import { ResourcesProcessor } from "./types/eth/resources.js";
import { PlatformRewardsProcessor } from "./types/eth/platformrewards.js";
import { BarracksProcessor } from "./types/eth/barracks.js";

export const FORTUNE_ADDR = "0xaf02d78f39c0002d14b95a3be272da02379aff21"
export const BANK_ADDR = "0x1e16aa4bb965478df310e8444cd18fa56603a25f"
export const RESOURCES_ADDR = "0xce3f4e59834b5b52b301e075c5b3d427b6884b3d"
export const PLATFORM_REWARDS_ADDR = "0x0dC2ad723068B2D1ACab5083fce36E15818BABBB"
export const BARRACKS_ADDR = "0xfde081acb68ac6bb7b7702deba49d99b081bd1ef"

const GaugeStakedFortune = async (_: any, ctx: FortuneContext) => {
  const stakedAtBank = Number(await ctx.contract.balanceOf(BANK_ADDR)) / 10 ** 18
  const stakedAtBarracks = Number(await ctx.contract.balanceOf(BARRACKS_ADDR)) / 10 ** 18
  ctx.meter.Gauge("staked").record(stakedAtBank, { at: "Bank" })
  ctx.meter.Gauge("staked").record(stakedAtBarracks, { at: "Barracks" })
}


const UserEventHandler = async (event: any, ctx: any) => {
  ctx.eventLogger.emit(event.name, {
    distinctId: event.args.user
  })
}

const NoUserArgEventHandler = async (event: any, ctx: any) => {
  try {
    const hash = event.transactionHash
    const tx = (await ctx.contract.provider.getTransaction(hash))!
    const from = tx.from
    ctx.eventLogger.emit(event.name, {
      distinctId: from
    })
  }
  catch (e) {
    console.log(e.message, `Get tx from error at ${ctx.transactionHash}`)
  }
}


FortuneProcessor.bind({
  address: FORTUNE_ADDR,
  network: EthChainId.CRONOS,
  //startBlock: 9247000
})
  .onEventTransfer(async (event, ctx) => {
    ctx.eventLogger.emit("transfer", {
      distinctId: event.args.from
    })
  })
  .onTimeInterval(GaugeStakedFortune, 60, 1440)


BankProcessor.bind({
  address: BANK_ADDR,
  network: EthChainId.CRONOS,
  //startBlock: 9247000
})
  .onEventStaked(UserEventHandler)
  .onEventUnstaked(UserEventHandler)
  .onEventAccountOpened(UserEventHandler)
  .onEventAccountClosed(UserEventHandler)
  .onEventAccountUpdate(UserEventHandler)
  .onEventIndexChanged(UserEventHandler)

ResourcesProcessor.bind({
  address: RESOURCES_ADDR,
  network: EthChainId.CRONOS,
  //startBlock: 9247000
})
  .onEventMintRequestSuccess(NoUserArgEventHandler)


PlatformRewardsProcessor.bind({
  address: PLATFORM_REWARDS_ADDR,
  network: EthChainId.CRONOS,
  //startBlock: 9247000
})
  .onEventWithdrawn(UserEventHandler)
  .onEventSpent(UserEventHandler)
  .onEventCompounded(UserEventHandler)

BarracksProcessor.bind({
  address: PLATFORM_REWARDS_ADDR,
  network: EthChainId.CRONOS,
  //startBlock: 9247000
})
  .onEventStaked(UserEventHandler)
  .onEventUnstaked(UserEventHandler)
