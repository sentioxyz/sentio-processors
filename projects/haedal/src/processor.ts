import { SuiObjectProcessorTemplate, SuiNetwork, SuiObjectProcessor, SuiObjectContext } from "@sentio/sdk/sui"
import { Gauge } from "@sentio/sdk";

import { staking } from "./types/sui/haedal.js";

export const volOptions = {
  sparse: true
}

const total_staked_sui = Gauge.register("total_staked_sui", volOptions);

const formatNumber = (amount: number, n: number) => {
  return Math.floor(amount * Math.pow(10, n)) / Math.pow(10, n)
}

const formatSUI = (amount: number) => {
  return amount / Math.pow(10, 9)
}

const stakingObjectId = '0x47b224762220393057ebf4f70501b6e657c3e56684737568439a04f80849b2ca'

const lastData = {
  rate: 0,
  reward: 0
}

staking.bind({
  address: '0xbde4ba4c2e274a60ce15c1cfff9e5c42e41654ac8b6d906a57efa4bd3c29f47d',
  network: SuiNetwork.MAIN_NET,
})
  .onEventUserClaimed(async (event, ctx) => {
    ctx.meter.Counter("claim_counter").add(1, { project: "haedal" })
    ctx.meter.Counter("claim_amount").add(formatSUI(Number(event.data_decoded.sui_amount)), { project: "haedal" })
    ctx.eventLogger.emit("UserClaimed", {
      sui_amount: formatSUI(Number(event.data_decoded.sui_amount)),
      owner: event.data_decoded.owner,
    })
  })
  .onEventUserStaked(async (event, ctx) => {
    ctx.meter.Counter("stake_counter").add(1, { project: "haedal" })
    ctx.meter.Counter("stake_sui_amount").add(formatSUI(Number(event.data_decoded.sui_amount)), { project: "haedal" })
    ctx.meter.Counter("haSUI_total_supply_history").add(formatSUI(Number(event.data_decoded.st_amount)), { project: "haedal" })
    ctx.eventLogger.emit("UserStaked", { amount: formatSUI(Number(event.data_decoded.st_amount)) })

  })
  .onEventUserNormalUnstaked(async (event, ctx) => {
    ctx.meter.Counter("normal_unstaked_counter").add(1, { project: "haedal" })
    ctx.meter.Counter("normal_unstaked_sui_amount").add(formatSUI(Number(event.data_decoded.sui_amount)), { project: "haedal" })
    ctx.meter.Counter("haSUI_total_supply_history").sub(formatSUI(Number(event.data_decoded.st_amount)), { project: "haedal" })
  })
  .onEventSuiRewardsUpdated(async (event, ctx) => {
    if (Number(event.data_decoded.new) > lastData.reward) {
      lastData.reward = Number(event.data_decoded.new)
    }
    ctx.meter.Gauge('total_rewards_history').record(formatSUI(lastData.reward), { project: "haedal" })

  })
  .onEventExchangeRateUpdated(async (event, ctx) => {
    if (Number(event.data_decoded.new) > lastData.rate) {
      lastData.rate = Number(event.data_decoded.new)
    }
    ctx.meter.Gauge('haSUI:SUI_rate_history').record(formatNumber(lastData.rate / Math.pow(10, 6), 4), { project: "haedal" })
  })




SuiObjectProcessor.bind({
  objectId: stakingObjectId,
  network: SuiNetwork.MAIN_NET
})
  .onTimeInterval(async (self, _, ctx) => {
    try {
      const res = await ctx.coder.decodedType(self, staking.Staking.type())
      ctx.meter.Gauge('haSUI_supply').record(formatSUI(Number(res!.stsui_supply)), { project: "haedal" })
      ctx.meter.Gauge('live_validators').record(res!.validators.length, { project: "haedal" })

      total_staked_sui.record(ctx, res!.unclaimed_sui_amount, { kind: "unclaimed_sui_amount" })
      total_staked_sui.record(ctx, res!.total_staked, { kind: "total_staked" })
      total_staked_sui.record(ctx, res!.total_rewards, { kind: "total_rewards" })
      total_staked_sui.record(ctx, res!.total_protocol_fees, { kind: "total_protocol_fees" })
      total_staked_sui.record(ctx, res!.uncollected_protocol_fees, { kind: "uncollected_protocol_fees" })
      total_staked_sui.record(ctx, res!.total_unstaked, { kind: "total_unstaked" })
    }
    catch (e) {
      console.log(`${e.message} error at ${JSON.stringify(self)}`)
    }
  }, 1000, 240, undefined, { owned: false })
