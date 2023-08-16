import { EthChainId } from "@sentio/sdk/eth";
import { CorgiBoostProcessor } from "./types/eth/corgiboost.js";
import { MemeVaultProcessor } from "./types/eth/memevault.js";
import { ERC20Processor } from "@sentio/sdk/eth/builtin";

//CORGIAI VAULT
CorgiBoostProcessor.bind({
  address: "0x6c443D7385320aA73bD0652e87555b52ce009785",
  network: EthChainId.CRONOS
})
  .onEventDeposit(async (event, ctx) => {
    ctx.eventLogger.emit("CorgiAiDeposit", {
      distinctId: event.args.user,
      pid: event.args.pid,
      stakeId: event.args.stakeId,
      amount: Number(event.args.amount) / 10 ** 18,
      weightedAmount: event.args.weightedAmount,
      unlockTimestamp: event.args.unlockTimestamp,
      coin_symbol: "corgiai"
    })
  })
  .onEventWithdraw(async (event, ctx) => {
    ctx.eventLogger.emit("CorgiAiWithdraw", {
      distinctId: event.args.user,
      pid: event.args.pid,
      stakeId: event.args.stakeId,
      amount: Number(event.args.amount) / 10 ** 18,
      weightedAmount: event.args.weightedAmount,
      coin_symbol: "corgiai"
    })
  })
  .onEventUpgrade(async (event, ctx) => {
    const stakeId = Number(event.args.stakeId)
    const oldPidArray = await ctx.contract.getUserStakesByIds(event.args.user, [stakeId], { blockTag: ctx.blockNumber - 1 })
    const oldPid = oldPidArray[0][1]
    const amount = Number(oldPidArray[0][0]) / 10 ** 18

    ctx.eventLogger.emit("CorgiAiUpgrade", {
      distinctId: event.args.user,
      stakeId,
      amount,
      oldPid,
      newPid: Number(event.args.newPid),
      newWeightedAmount: event.args.newWeightedAmount,
      newUnlockTimestamp: event.args.newUnlockTimestamp,
      coin_symbol: "corgiai"
    })
  })
  .onEventClaimReward(async (event, ctx) => {
    ctx.eventLogger.emit("CorgiHarvest", {
      distinctId: event.args.user,
      amount: Number(event.args.amount) / 10 ** 18,
      coin_symbol: "corgiai"
    })
  })
  .onTimeInterval(async (_, ctx) => {
    const poolLength = Number(await ctx.contract.poolLength())
    for (let pid = 0; pid < poolLength; pid++) {
      const poolInfo = await ctx.contract.poolInfo(pid)
      const totalStaked = Number(poolInfo.totalStaked) / 10 ** 18
      ctx.meter.Gauge("locked_amount_gauge").record(totalStaked, {
        pid: pid.toString(),
        coin_symbol: "corgiai"
      })
    }
  })

//DOGE VAULT
MemeVaultProcessor.bind({
  address: "0x42a32bA93E50CDF1A1158b2c18570D3D1B69086c",
  network: EthChainId.CRONOS
})
  .onEventDeposit(async (event, ctx) => {
    ctx.eventLogger.emit("DogeDeposit", {
      distinctId: event.args.user,
      amount: Number(event.args.amount) / 10 ** 8,
      coin_symbol: "doge"
    })
  })
  .onEventWithdraw(async (event, ctx) => {
    ctx.eventLogger.emit("DogeWithdraw", {
      distinctId: event.args.user,
      amount: Number(event.args.amount) / 10 ** 8,
      coin_symbol: "doge"
    })
  })
  .onEventHarvest(async (event, ctx) => {
    ctx.eventLogger.emit("DogeHarvest", {
      distinctId: event.args.user,
      amount: Number(event.args.pendingRewards) / 10 ** 18,
      coin_symbol: "corgiai"
    })
  })

//SHIBA VAULT
MemeVaultProcessor.bind({
  address: "0xbefC5F9d7ecDA0b3528B911C8e3455Cc611e3c61",
  network: EthChainId.CRONOS
})
  .onEventDeposit(async (event, ctx) => {
    ctx.eventLogger.emit("ShibaDeposit", {
      distinctId: event.args.user,
      amount: Number(event.args.amount) / 10 ** 18,
      coin_symbol: "shiba"
    })
  })
  .onEventWithdraw(async (event, ctx) => {
    ctx.eventLogger.emit("ShibaWithdraw", {
      distinctId: event.args.user,
      amount: Number(event.args.amount) / 10 ** 18,
      coin_symbol: "shiba"
    })
  })
  .onEventHarvest(async (event, ctx) => {
    ctx.eventLogger.emit("ShibaHarvest", {
      distinctId: event.args.user,
      amount: Number(event.args.pendingRewards) / 10 ** 18,
      coin_symbol: "corgiai"
    })
  })


//corgiai erc20
ERC20Processor.bind({
  address: "0x6b431B8a964BFcf28191b07c91189fF4403957D0",
  network: EthChainId.CRONOS
})
  .onEventTransfer(async (event, ctx) => {
    ctx.eventLogger.emit("Transfer", {
      distinctId: event.args.from,
      amount: Number(event.args.value) / 10 ** 18,
      from: event.args.from,
      to: event.args.to
    })
    ctx.eventLogger.emit("_debugTransferIn", {
      distinctId: event.args.to,
      amount: Number(event.args.value) / 10 ** 18,
      from: event.args.from,
      to: event.args.to
    })
    ctx.eventLogger.emit("_debugTransferOut", {
      distinctId: event.args.from,
      amount: -Number(event.args.value) / 10 ** 18,
      from: event.args.from,
      to: event.args.to
    })
  })