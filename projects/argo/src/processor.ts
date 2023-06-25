import { Counter, Gauge } from '@sentio/sdk'
import { ERC20Processor } from '@sentio/sdk/eth/builtin'
import { AtlantisRacingProcessor } from './types/eth/atlantisracing.js'
import { AtlantisGemstonesProcessor } from './types/eth/atlantisgemstones.js'
import { AtlantisPlanetExpeditionProcessor } from './types/eth/atlantisplanetexpedition.js'
import { AtlantisPlanetsProcessor } from './types/eth/atlantisplanets.js'
import { AtlantisSpaceshipsProcessor } from './types/eth/atlantisspaceships.js'
import { AtlantisEquipmentsContext, AtlantisEquipmentsProcessor } from './types/eth/atlantisequipments.js'
import { AtlantisMarketplaceProcessor } from './types/eth/atlantismarketplace.js'
import { GoldStardustStakingProcessor } from './types/eth/goldstarduststaking.js'
import { ArgonautsProcessor } from './types/eth/argonauts.js'
import { GoldProcessor } from './types/eth/gold.js'
import { StardustProcessor } from './types/eth/stardust.js'
import { scaleDown } from '@sentio/sdk'
import { EthChainId } from '@sentio/sdk/eth'
import * as config from './constant.js'


const AllEventsHandler = async (event: any, ctx: any) => {
  try {
    const hash = event.transactionHash
    const tx = (await ctx.contract.provider.getTransaction(hash))!
    const from = tx.from
    ctx.eventLogger.emit(event.name, {
      distinctId: from
    })
    ctx.meter.Counter("allEventsCounter").add(1)
  }
  catch (e) {
    console.log(e.message, `Get tx from error at ${ctx.transactionHash}`)
  }
}

async function getGemSupply(ctx: any) {
  let gemSupply = 0
  for (let i = 1; i < 13; i++) {
    try {
      gemSupply = Number(await ctx.contract.totalSupply(i))
      let gemName = ""
      switch (i % 3) {
        case 1:
          gemName = "Fire"
          break
        case 2:
          gemName = "Lightning"
          break
        case 0:
          gemName = "Steel"
          break
      }
      ctx.meter.Gauge("gemSupply").record(gemSupply, { ID: i, gemName, level: Math.floor((i - 1) / 3) + 1 })
    }
    catch (e) {
      console.log(e.message, `Get gemstone totalSupply(${i}) error at ${ctx.transactionHash}`)
    }
  }
}

async function getEquipmentSupply(ctx: any) {
  let equipmentSupply = 0
  // let debugMessage = ""
  for (let i = 1; i < 31; i++) {
    try {
      equipmentSupply = Number(await ctx.contract.totalSupply(i))
      // debugMessage += `\nequipment.totalSupply(${i})=${equipmentSupply}, level ${Math.floor((i - 1) / 3) + 1} `
      ctx.meter.Gauge("equipmentSupply").record(equipmentSupply, { ID: i, level: Math.floor((i - 1) / 3) + 1 })
    }
    catch (e) {
      console.log(e.message, `Get equipment totalSupply(${i}) error at ${ctx.transactionHash}`)
    }
  }
  // console.log(debugMessage)
}


AtlantisRacingProcessor.bind({
  address: config.ATLANTIS_SPACESHIP_RACING,
  network: EthChainId.CRONOS,
  //  startBlock: 8942000
})
  .onEventPayout(async (event, ctx) => {
    const poolId = Number(event.args.poolId)
    const user = event.args.user
    const goldAmount = Number(event.args.goldAmount)
    const stardustAmount = Number(event.args.stardustAmount)
    ctx.eventLogger.emit("Payout",
      {
        distinctId: user,
        poolId,
        goldAmount,
        stardustAmount
      })
    ctx.meter.Counter("allCoreEventsCounter").add(0.25, { event: event.name })

  })
  .onEventStake(async (event, ctx) => {
    const tokenID = Number(event.args.tokenID)
    const user = event.args.user
    const shipScore = Number(event.args.shipScore)
    ctx.eventLogger.emit("Stake",
      {
        distinctId: user,
        tokenID,
        shipScore
      })
    ctx.meter.Counter("allCoreEventsCounter").add(1, { event: event.name })

  })
  .onEventStartSeason(async (event, ctx) => {
    const startTime = event.args.startTime
    ctx.eventLogger.emit("StartSeason",
      {
        startTime
      })
  })
  .onTimeInterval(async (_, ctx) => {
    for (let i = 0; i < 4; i++) {
      //gold produced
      const poolInfo = await ctx.contract.poolInfo(i, { blockTag: ctx.blockNumber })
      const rewardPerSecond = Number(poolInfo.rewardPerSecond)
      const ACC_TOKEN_PRECISION = Number(await ctx.contract.ACC_TOKEN_PRECISION({ blockTag: ctx.blockNumber }))
      const gold_produced_racing_day = rewardPerSecond / ACC_TOKEN_PRECISION * Number(poolInfo.goldWeightage) / 100 * 86400
      console.log(`\ni=${i} \ngoldWeightage=${Number(poolInfo.goldWeightage)} \nrewardPerSecond=${rewardPerSecond} \nACC_TOKEN_PRECISION=${ACC_TOKEN_PRECISION} \ngold_produced_racing_day=${gold_produced_racing_day}`)
      ctx.meter.Gauge("gold_produced_racing_day").record(gold_produced_racing_day, { pool: i.toString() })

      //stardust produced
      const stardust_produced_racing_day = rewardPerSecond / ACC_TOKEN_PRECISION * Number(poolInfo.stardustWeightage) / 100 * 86400
      console.log(`\ni=${i} \ngoldWeightage=${Number(poolInfo.goldWeightage)} \nstardustWeightage=${Number(poolInfo.stardustWeightage)} \nrewardPerSecond=${rewardPerSecond} \nACC_TOKEN_PRECISION=${ACC_TOKEN_PRECISION} \ngold_produced_racing_day=${gold_produced_racing_day} \nstardust_produced_racing_day=${stardust_produced_racing_day}`)
      ctx.meter.Gauge("stardust_produced_racing_day").record(stardust_produced_racing_day, { pool: i.toString() })
    }
  }, 1440, 1440)



AtlantisGemstonesProcessor.bind({
  address: config.ATLANTIS_GEMSTONE,
  network: EthChainId.CRONOS,
  //  startBlock: 8942000
})
  .onEventFuseGemstone(async (event, ctx) => {
    const from = event.args._from
    const id = Number(event.args._id)
    const amount = Number(event.args._amount)
    const totalSupply = Number(event.args._totalSupply)
    const fusion_cost = Number(await ctx.contract.FUSION_COST({ blockTag: ctx.blockNumber }))
    const stardust_burnt = amount * fusion_cost / 10 ** 18
    ctx.eventLogger.emit("FuseGemstone", {
      distinctId: from,
      id,
      amount,
      stardust_burnt,
      totalSupply
    })
    ctx.meter.Gauge("stardust_burnt").record(stardust_burnt, { source: "gemstone" })
    ctx.meter.Counter("allCoreEventsCounter").add(1, { event: event.name })
  })

  .onTimeInterval(async (_, ctx) => {
    await getGemSupply(ctx)
  }, 60)



AtlantisPlanetExpeditionProcessor.bind({
  address: config.ATLANTIS_PLANET_EXPEDITION,
  network: EthChainId.CRONOS,
  //  startBlock: 8942000
})
  .onEventExpeditionStarted(async (event, ctx) => {
    const user = event.args.user
    const expeditionId = Number(event.args.expeditionId)
    const planetId = Number(event.args.planetId)
    const startTime = Number(event.args.startTime)
    const endTime = Number(event.args.endTime)
    ctx.eventLogger.emit("ExpeditionStarted", {
      distinctId: user,
      expeditionId,
      planetId,
      startTime,
      endTime
    })
    ctx.meter.Counter("allCoreEventsCounter").add(1, { event: event.name })
  })
  .onEventExpeditionEnded(async (event, ctx) => {
    const user = event.args.user
    const expeditionId = Number(event.args.expeditionId)
    const timeEnded = Number(event.args.timeEnded)
    ctx.eventLogger.emit("ExpeditionEnded", {
      distinctId: user,
      expeditionId,
      timeEnded
    })
    ctx.meter.Counter("allCoreEventsCounter").add(1, { event: event.name })
  })
  .onEventRewardsClaimed(async (event, ctx) => {
    const user = event.args.user
    const expeditionId = Number(event.args.expeditionId)
    const gemstoneId = Number(event.args.gemstoneId)
    const gemstoneGenerated = Number(event.args.gemstoneGenerated)
    const stardust = Number(event.args.stardust)
    const startTime = Number(event.args.startTime)
    const endTime = Number(event.args.endTime)
    ctx.eventLogger.emit("RewardsClaimed", {
      distinctId: user,
      expeditionId,
      gemstoneId,
      gemstoneGenerated,
      stardust,
      startTime,
      endTime
    })
    ctx.meter.Gauge("stardust_produced_expedition")
    ctx.meter.Counter("allCoreEventsCounter").add(1, { event: event.name })
  })



AtlantisPlanetsProcessor.bind({
  address: config.ATLANTIS_PLANET, network: EthChainId.CRONOS,
  //  startBlock: 8942000
})
  .onEventPlanetUpgraded(async (event, ctx) => {
    const hash = event.transactionHash
    const tx = (await ctx.contract.provider.getTransaction(hash))!
    const from = tx.from
    const tokenId = Number(event.args.tokenId)
    const level = Number(event.args.level)
    ctx.eventLogger.emit("PlanetUpgraded", {
      distinctId: from,
      tokenId,
      level
    })
    ctx.meter.Counter("allCoreEventsCounter").add(1, { event: event.name })
  })

  .onTimeInterval(async (_, ctx) => {
    try {
      const planetNFTStakedPlanetExpedition = Number(await ctx.contract.balanceOf(config.ATLANTIS_PLANET_EXPEDITION, { blockTag: ctx.blockNumber }))
      ctx.meter.Gauge("planetNFTStakedPlanetExpedition").record(planetNFTStakedPlanetExpedition)
    }
    catch (e) {
      console.log(e.message, `Get balanceOf error at ${ctx.transactionHash}`)
    }
  }, 60)


AtlantisSpaceshipsProcessor.bind({
  address: config.ATLANTIS_SPACESHIP, network: EthChainId.CRONOS,
  //  startBlock: 8942000
})
  .onEventEquipmentModified(async (event, ctx) => {
    const hash = event.transactionHash
    const tx = (await ctx.contract.provider.getTransaction(hash))!
    const from = tx.from
    const spaceshipId = Number(event.args.spaceshipId)
    const speed = Number(event.args.speed)
    const fireEquipmentString = "fire_" + event.args.fireEquipmentString
    const lightningEquipmentString = "lightning_" + event.args.lightningEquipmentString
    const steelEquipmentString = "steel_" + event.args.steelEquipmentString
    ctx.eventLogger.emit("EquipmentModified", {
      distinctId: from,
      spaceshipId,
      speed,
      fireEquipmentString,
      lightningEquipmentString,
      steelEquipmentString
    })
    ctx.meter.Counter("allCoreEventsCounter").add(1, { event: event.name })
  })

  .onTimeInterval(async (_, ctx) => {
    try {
      const spaceshipNFTStakedSpaceshipRacing = Number(await ctx.contract.balanceOf(config.ATLANTIS_SPACESHIP_RACING, { blockTag: ctx.blockNumber }))
      ctx.meter.Gauge("spaceshipNFTStakedSpaceshipRacing").record(spaceshipNFTStakedSpaceshipRacing)
    }
    catch (e) {
      console.log(e.message, `Get balanceOf error at ${ctx.transactionHash}`)
    }
  }, 60)



// const filter_equipment_mint = AtlantisEquipmentsProcessor.filters.TransferSingle(
//   '0x0000000000000000000000000000000000000000'
// )

AtlantisEquipmentsProcessor.bind({
  address: config.ATLANTIS_EQUIPMENT,
  network: EthChainId.CRONOS,
  //  startBlock: 8942000
})
  .onEventFuseEquipment(async (event, ctx) => {
    const from = event.args._from
    const id = Number(event.args._id)
    const amount = Number(event.args._amount)
    const totalSupply = Number(event.args._totalSupply)
    const calculateFusionCost = Number(await ctx.contract.calculateFusionCost(id - 3, amount, { blockTag: ctx.blockNumber })) /// 10 ** 18
    console.log(`calculateFusionCost(${id - 3},${amount}): ${calculateFusionCost}`)
    ctx.eventLogger.emit("FuseEquipment", {
      distinctId: from,
      id,
      amount,
      calculateFusionCost,
      totalSupply
    })
    ctx.meter.Gauge("stardust_burnt").record(calculateFusionCost, { source: "equipment" })
    ctx.meter.Counter("allCoreEventsCounter").add(1, { event: event.name })
  })
  .onEventTransferSingle(async (event, ctx) => {
    const operator = event.args.operator
    const from = event.args.from
    const to = event.args.to
    const id = Number(event.args.id)
    const value = Number(event.args.value)
    ctx.eventLogger.emit("TransferSingle", {
      distinctId: to,
      operator,
      from,
      id,
      value
    })

    ctx.meter.Counter("allCoreEventsCounter").add(1, { event: event.name })

    //get input data
    const hash = event.transactionHash
    let inputDataPrefix = ""
    try {
      const tx = (await ctx.contract.provider.getTransaction(hash))!
      inputDataPrefix = tx.data.toString().slice(2, 10)
    }
    catch (e) {
      if (e instanceof Error) {
        console.log(e.message, " retrieve transaction input data failed")
      }
    }
    if (inputDataPrefix == "533eb22d") {
      ctx.eventLogger.emit("FuseEquipmentTransferSingle", {
        distinctId: to,
        operator,
        from,
        id,
        value
      })
    }
    else {
      ctx.eventLogger.emit("NonFuseEquipmentTransferSingle", {
        distinctId: to,
        operator,
        from,
        id,
        value,
        inputDataPrefix
      })
    }
  })

  .onTimeInterval(async (_, ctx) => {
    await getEquipmentSupply(ctx)
  }, 60)

AtlantisMarketplaceProcessor.bind({
  address: config.ATLANTIS_MARKETPLACE, network: EthChainId.CRONOS,
  //  startBlock: 8942000
})
  .onEventItemListed(async (event, ctx) => {
    const seller = event.args.seller
    const nftAddress = event.args.nftAddress
    const tokenId = Number(event.args.tokenId)
    const quantity = Number(event.args.quantity)
    const expirationTime = Number(event.args.expirationTime)
    const paymentToken = event.args.paymentToken
    ctx.eventLogger.emit("ItemListed", {
      distinctId: seller,
      nftAddress,
      tokenId,
      quantity,
      expirationTime,
      paymentToken
    })
    ctx.meter.Counter("allCoreEventsCounter").add(1, { event: event.name })
  })
  .onEventItemCanceled(async (event, ctx) => {
    const seller = event.args.seller
    const nftAddress = event.args.nftAddress
    const tokenId = Number(event.args.tokenId)

    ctx.eventLogger.emit("ItemCanceled", {
      distinctId: seller,
      nftAddress,
      tokenId
    })
    ctx.meter.Counter("allCoreEventsCounter").add(1, { event: event.name })
  })
  .onEventItemSold(async (event, ctx) => {
    const seller = event.args.seller
    const buyer = event.args.buyer
    const nftAddress = event.args.nftAddress
    const tokenId = Number(event.args.tokenId)
    const quantity = Number(event.args.quantity)
    const pricePerItem = Number(event.args.pricePerItem)
    const paymentToken = event.args.paymentToken
    let gold_volume = 0
    if (paymentToken.toLowerCase() == config.GOLD_TOKEN) {
      gold_volume = quantity * pricePerItem / 10 ** 18
    }

    ctx.eventLogger.emit("ItemSold", {
      distinctId: buyer,
      seller,
      nftAddress,
      tokenId,
      quantity,
      pricePerItem,
      paymentToken,
      gold_volume
    })
    ctx.meter.Counter("gold_volume_total").add(gold_volume)

    ctx.meter.Counter("marketplace_transactions_cumulative").add(1)

    ctx.meter.Counter("allCoreEventsCounter").add(1, { event: event.name })

  })



GoldStardustStakingProcessor.bind({
  address: config.GOLD_STARDUST_STAKING, network: EthChainId.CRONOS,
  //  startBlock: 8942000
})
  .onEventLogStake(async (event, ctx) => {
    const staker = event.args.staker
    const goldAmount = Number(event.args.goldAmount) / 10 ** 18
    const timestamp_logStake = Number(event.args.timestamp)
    ctx.eventLogger.emit("LogStake", {
      distinctId: staker,
      goldAmount,
      timestamp_logStake
    })
    ctx.meter.Gauge("gold_locked").record(goldAmount)
    ctx.meter.Counter("allCoreEventsCounter").add(1, { event: event.name })
  })
  .onEventLogUnstake(async (event, ctx) => {
    const staker = event.args.staker
    const stardustAmount = Number(event.args.stardustAmount) / Math.pow(10, 18)
    const unstakeStart = Number(event.args.unstakeStart)
    const unstakeUnlocked = Number(event.args.unstakeUnlocked)
    const difference = unstakeUnlocked - unstakeStart
    // console.log(`staker ${ staker }, stardustAmount ${ stardustAmount }, unstakeStart ${ unstakeStart }, unstakeUnlocked ${ unstakeUnlocked }, difference ${ difference }`)

    ctx.eventLogger.emit("LogUnstake", {
      distinctId: staker,
      stardustAmount,
      unstakeStart,
      unstakeUnlocked
    })
    ctx.meter.Gauge("stardust_burnt").record(stardustAmount, { source: "for gold" })
    ctx.meter.Counter("allCoreEventsCounter").add(1, { event: event.name })

    if (difference > 0) {
      let bucket = "nan"
      if (difference <= 3600 * 24 * 30) {
        bucket = "0-1m"
      } else if (difference <= 3600 * 24 * 30 * 2) {
        bucket = "1-2m"
      } else if (difference <= 3600 * 24 * 30 * 3) {
        bucket = "2-3m"
      } else if (difference <= 3600 * 24 * 30 * 4) {
        bucket = "3-4m"
      } else if (difference <= 3600 * 24 * 30 * 5) {
        bucket = "4-5m"
      } else if (difference <= 3600 * 24 * 30 * 6) {
        bucket = "5-6m"
      } else {
        bucket = "gt6m"
      }

      ctx.eventLogger.emit("UndergoingUnlocks", {
        distinctId: staker,
        stardustAmount,
        unstakeStart,
        unstakeUnlocked,
        difference,
        bucket
      })
    }
  })
  .onEventLogClaimed(async (event, ctx) => {
    const staker = event.args.staker
    const claimedAmount = Number(event.args.claimedAmount) / 10 ** 18
    const timestamp_logClaimed = Number(event.args.timestamp)
    ctx.eventLogger.emit("LogClaimed", {
      distinctId: staker,
      claimedAmount,
      timestamp_logClaimed
    })
    ctx.meter.Gauge("gold_unlocked").record(claimedAmount)
    ctx.meter.Counter("allCoreEventsCounter").add(1, { event: event.name })
  })

const filter_gold_burnt = GoldProcessor.filters.Transfer(
  null,
  '0x0000000000000000000000000000000000000000'
)
const filter_gold_mint = GoldProcessor.filters.Transfer(
  '0x0000000000000000000000000000000000000000',
  null
)

GoldProcessor.bind({
  address: config.GOLD_TOKEN, network: EthChainId.CRONOS,
  //  startBlock: 8942000
})
  .onTimeInterval(async (_, ctx) => {
    try {
      const totalSupply = Number(scaleDown(await ctx.contract.totalSupply(), 18))

      let nonCirculatingWalletBal = 0
      for (let address of config.NON_CIRCULATING_WALLETS) {
        nonCirculatingWalletBal += Number(scaleDown(await ctx.contract.balanceOf(address), 18))
      }
      const factoryBal = Number(scaleDown(await ctx.contract.balanceOf(config.FACTORY_ADDRESS), 18))
      const racingBal = Number(scaleDown(await ctx.contract.balanceOf(config.ATLANTIS_SPACESHIP_RACING), 18))
      const goldCirculating = totalSupply - factoryBal - nonCirculatingWalletBal - racingBal
      //debug
      // ctx.meter.Gauge("totalSupply").record(totalSupply)
      // ctx.meter.Gauge("factoryBal").record(factoryBal)
      // ctx.meter.Gauge("racingBal").record(racingBal)
      // ctx.meter.Gauge("nonCirculatingWalletBal").record(nonCirculatingWalletBal)
      //debug end
      ctx.meter.Gauge("goldCirculating").record(goldCirculating)

    }
    catch (e) {
      const hash = ctx.transactionHash
      console.log(e.message, `Get balanceOf error at ${ctx.transactionHash}, txHash ${hash}`)
    }
  }, 60)
  .onEventTransfer(async (event, ctx) => {
    const from = event.args.from
    const to = event.args.to
    const value = Number(event.args.value) / Math.pow(10, 18)
    if (to == "0x0000000000000000000000000000000000000000") {
      ctx.eventLogger.emit("GoldBurnt", {
        distinctId: from,
        value
      })
      ctx.meter.Counter("gold_burnt_total").add(value)
    }
  }, [filter_gold_burnt, filter_gold_mint])

StardustProcessor.bind({
  address: config.STARDUST_TOKEN, network: EthChainId.CRONOS,
  //  startBlock: 8942000
})
  .onTimeInterval(async (_, ctx) => {
    try {
      const totalSupply = Number(scaleDown(await ctx.contract.totalSupply(), 18))
      const planetExpeditionBal = Number(scaleDown(await ctx.contract.balanceOf(config.ATLANTIS_PLANET_EXPEDITION), 18))
      const racingBal = Number(scaleDown(await ctx.contract.balanceOf(config.ATLANTIS_SPACESHIP_RACING), 18))
      let nonCirculatingWalletBal = 0
      for (let address of config.NON_CIRCULATING_WALLETS) {
        nonCirculatingWalletBal += Number(scaleDown(await ctx.contract.balanceOf(address), 18))
      }
      const stardustCirculating = totalSupply - planetExpeditionBal - racingBal - nonCirculatingWalletBal
      ctx.meter.Gauge("stardustCirculating").record(stardustCirculating)
    }
    catch (e) {
      const hash = ctx.transactionHash
      console.log(e.message, `Get balanceOf error at ${ctx.transactionHash}, txHash ${hash}`)
    }
  }, 60)


ArgonautsProcessor.bind({
  address: config.ARGONAUTS, network: EthChainId.CRONOS,
  //  startBlock: 8942000
})
  .onTimeInterval(async (_, ctx) => {
    try {
      const argonautNFTStakedSpaceshipRacing = Number(await ctx.contract.balanceOf(config.ATLANTIS_SPACESHIP_RACING))
      const argonautNFTStakedPlanetExpedition = Number(await ctx.contract.balanceOf(config.ATLANTIS_PLANET_EXPEDITION))
      ctx.meter.Gauge("argonautNFTStakedSpaceshipRacing").record(argonautNFTStakedSpaceshipRacing)
      ctx.meter.Gauge("argonautNFTStakedPlanetExpedition").record(argonautNFTStakedPlanetExpedition)
    }
    catch (e) {
      console.log(e.message, `Get balanceOf error at ${ctx.transactionHash}`)
    }
  }, 60)

