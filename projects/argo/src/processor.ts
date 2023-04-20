import { Counter, Gauge } from '@sentio/sdk'
import { ERC20Processor } from '@sentio/sdk/eth/builtin'
import { AtlantisRacingProcessor } from './types/eth/atlantisracing.js'
import { AtlantisGemstonesProcessor } from './types/eth/atlantisgemstones.js'
import { AtlantisPlanetExpeditionProcessor } from './types/eth/atlantisplanetexpedition.js'
import { AtlantisPlanetsProcessor } from './types/eth/atlantisplanets.js'
import { AtlantisSpaceshipsProcessor } from './types/eth/atlantisspaceships.js'
import { AtlantisEquipmentsProcessor } from './types/eth/atlantisequipments.js'
import { AtlantisMarketplaceProcessor } from './types/eth/atlantismarketplace.js'
import { GoldStardustStakingProcessor } from './types/eth/goldstarduststaking.js'
import { ArgonautsProcessor } from './types/eth/argonauts.js'
import { GoldProcessor } from './types/eth/gold.js'
import { StardustProcessor } from './types/eth/stardust.js'
import { scaleDown } from '@sentio/sdk'
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
      ctx.meter.Gauge("gemSupply").record(gemSupply, { ID: i.toString() })
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
      // debugMessage += `equipmentSupply[${i}]=${equipmentSupply}`
      ctx.meter.Gauge("equipmentSupply").record(equipmentSupply, { ID: i.toString(), level: Math.floor((i - 1) / 3) + 1 })
    }
    catch (e) {
      console.log(e.message, `Get equipment totalSupply(${i}) error at ${ctx.transactionHash}`)
    }
  }
  // console.log(debugMessage)
}


// AtlantisRacingProcessor.bind({ address: config.ATLANTIS_SPACESHIP_RACING, network: 338 })
//   .onEventPayout(async (event, ctx) => {
//     const poolId = Number(event.args.poolId)
//     const user = event.args.user
//     const goldAmount = Number(event.args.goldAmount)
//     const stardustAmount = Number(event.args.stardustAmount)
//     ctx.eventLogger.emit("Payout",
//       {
//         distinctId: user,
//         poolId,
//         goldAmount,
//         stardustAmount
//       })
//     ctx.meter.Counter("allCoreEventsCounter").add(0.25, { event: event.name })

//   })
//   .onEventStake(async (event, ctx) => {
//     const tokenID = Number(event.args.tokenID)
//     const user = event.args.user
//     const shipScore = Number(event.args.shipScore)
//     ctx.eventLogger.emit("Stake",
//       {
//         distinctId: user,
//         tokenID,
//         shipScore
//       })
//     ctx.meter.Counter("allCoreEventsCounter").add(1, { event: event.name })

//   })
//   .onAllEvents(AllEventsHandler)


// AtlantisGemstonesProcessor.bind({ address: config.ATLANTIS_GEMSTONE, network: 338 })
//   .onEventFuseGemstone(async (event, ctx) => {
//     const from = event.args._from
//     const id = Number(event.args._id)
//     const amount = Number(event.args._amount)
//     const totalSupply = Number(event.args._totalSupply)
//     ctx.eventLogger.emit("FuseGemstone", {
//       distinctId: from,
//       id,
//       amount,
//       totalSupply
//     })
//     ctx.meter.Counter("allCoreEventsCounter").add(1, { event: event.name })
//   })
//   .onAllEvents(AllEventsHandler)
//   .onTimeInterval(async (_, ctx) => {
//     getGemSupply(ctx)
//   }, 24 * 60)



// AtlantisPlanetExpeditionProcessor.bind({ address: config.ATLANTIS_PLANET_EXPEDITION, network: 338 })
//   .onEventExpeditionStarted(async (event, ctx) => {
//     const user = event.args.user
//     const expeditionId = Number(event.args.expeditionId)
//     const planetId = Number(event.args.planetId)
//     const startTime = Number(event.args.startTime)
//     const endTime = Number(event.args.endTime)
//     ctx.eventLogger.emit("ExpeditionStarted", {
//       distinctId: user,
//       expeditionId,
//       planetId,
//       startTime,
//       endTime
//     })
//     ctx.meter.Counter("allCoreEventsCounter").add(1, { event: event.name })
//   })
//   .onEventExpeditionEnded(async (event, ctx) => {
//     const user = event.args.user
//     const expeditionId = Number(event.args.expeditionId)
//     const timeEnded = Number(event.args.timeEnded)
//     ctx.eventLogger.emit("ExpeditionEnded", {
//       distinctId: user,
//       expeditionId,
//       timeEnded
//     })
//     ctx.meter.Counter("allCoreEventsCounter").add(1, { event: event.name })
//   })
//   .onEventRewardsClaimed(async (event, ctx) => {
//     const user = event.args.user
//     const expeditionId = Number(event.args.expeditionId)
//     const gemstoneId = Number(event.args.gemstoneId)
//     const gemstoneGenerated = Number(event.args.gemstoneGenerated)
//     const stardust = Number(event.args.stardust)
//     const startTime = Number(event.args.startTime)
//     const endTime = Number(event.args.endTime)
//     ctx.eventLogger.emit("RewardsClaimed", {
//       distinctId: user,
//       expeditionId,
//       gemstoneId,
//       gemstoneGenerated,
//       stardust,
//       startTime,
//       endTime
//     })
//     ctx.meter.Counter("allCoreEventsCounter").add(1, { event: event.name })
//   })
//   .onAllEvents(AllEventsHandler)


// AtlantisPlanetsProcessor.bind({ address: config.ATLANTIS_PLANET, network: 338 })
//   .onEventPlanetUpgraded(async (event, ctx) => {
//     const hash = event.transactionHash
//     const tx = (await ctx.contract.provider.getTransaction(hash))!
//     const from = tx.from
//     const tokenId = Number(event.args.tokenId)
//     const level = Number(event.args.level)
//     ctx.eventLogger.emit("PlanetUpgraded", {
//       distinctId: from,
//       tokenId,
//       level
//     })
//     ctx.meter.Counter("allCoreEventsCounter").add(1, { event: event.name })
//   })
//   .onAllEvents(AllEventsHandler)
//   .onTimeInterval(async (_, ctx) => {
//     try {
//       const planetNFTStakedPlanetExpedition = Number(await ctx.contract.balanceOf(config.ATLANTIS_PLANET_EXPEDITION))
//       ctx.meter.Gauge("planetNFTStakedPlanetExpedition").record(planetNFTStakedPlanetExpedition)
//     }
//     catch (e) {
//       console.log(e.message, `Get balanceOf error at ${ctx.transactionHash}`)
//     }
//   }, 60 * 24)


// AtlantisSpaceshipsProcessor.bind({ address: config.ATLANTIS_SPACESHIP, network: 338 })
//   .onEventEquipmentModified(async (event, ctx) => {
//     const hash = event.transactionHash
//     const tx = (await ctx.contract.provider.getTransaction(hash))!
//     const from = tx.from
//     const spaceshipId = Number(event.args.spaceshipId)
//     const speed = Number(event.args.speed)
//     const fireEquipmentString = "fire_" + event.args.fireEquipmentString
//     const lightningEquipmentString = "lightning_" + event.args.lightningEquipmentString
//     const steelEquipmentString = "steel_" + event.args.steelEquipmentString
//     ctx.eventLogger.emit("EquipmentModified", {
//       distinctId: from,
//       spaceshipId,
//       speed,
//       fireEquipmentString,
//       lightningEquipmentString,
//       steelEquipmentString
//     })
//     ctx.meter.Counter("allCoreEventsCounter").add(1, { event: event.name })
//   })
//   .onAllEvents(AllEventsHandler)
//   .onTimeInterval(async (_, ctx) => {
//     try {
//       const spaceshipNFTStakedSpaceshipRacing = Number(await ctx.contract.balanceOf(config.ATLANTIS_SPACESHIP_RACING))
//       ctx.meter.Gauge("spaceshipNFTStakedSpaceshipRacing").record(spaceshipNFTStakedSpaceshipRacing)
//     }
//     catch (e) {
//       console.log(e.message, `Get balanceOf error at ${ctx.transactionHash}`)
//     }
//   }, 60 * 24)




AtlantisEquipmentsProcessor.bind({ address: config.ATLANTIS_EQUIPMENT, network: 338 })
  .onEventFuseEquipment(async (event, ctx) => {
    const from = event.args._from
    const id = Number(event.args._id)
    const amount = Number(event.args._amount)
    const totalSupply = Number(event.args._totalSupply)
    ctx.eventLogger.emit("FuseEquipment", {
      distinctId: from,
      id,
      amount,
      totalSupply
    })
    ctx.meter.Counter("allCoreEventsCounter").add(1, { event: event.name })
  })
  .onEventTransferSingle(async (event, ctx) => {
    if (event.args.from == "0x0000000000000000000000000000000000000000") {
      const operator = event.args.operator
      const to = event.args.to
      const id = Number(event.args.id)
      const value = Number(event.args.value)
      ctx.eventLogger.emit("TransferSingle", {
        distinctId: to,
        operator,
        id,
        value
      })
      ctx.meter.Counter("allCoreEventsCounter").add(1, { event: event.name })
    }
  })
  .onAllEvents(AllEventsHandler)
  .onTimeInterval(async (_, ctx) => {
    getEquipmentSupply(ctx)
  }, 24 * 60)

// AtlantisMarketplaceProcessor.bind({ address: config.ATLANTIS_MARKETPLACE, network: 338 })
//   .onEventItemListed(async (event, ctx) => {
//     const seller = event.args.seller
//     const nftAddress = event.args.nftAddress
//     const tokenId = Number(event.args.tokenId)
//     const quantity = Number(event.args.quantity)
//     const expirationTime = Number(event.args.expirationTime)
//     const paymentToken = event.args.paymentToken
//     ctx.eventLogger.emit("ItemListed", {
//       distinctId: seller,
//       nftAddress,
//       tokenId,
//       quantity,
//       expirationTime,
//       paymentToken
//     })
//     ctx.meter.Counter("allCoreEventsCounter").add(1, { event: event.name })
//   })
//   .onEventItemCanceled(async (event, ctx) => {
//     const seller = event.args.seller
//     const nftAddress = event.args.nftAddress
//     const tokenId = Number(event.args.tokenId)

//     ctx.eventLogger.emit("ItemCanceled", {
//       distinctId: seller,
//       nftAddress,
//       tokenId
//     })
//     ctx.meter.Counter("allCoreEventsCounter").add(1, { event: event.name })
//   })
//   .onEventItemSold(async (event, ctx) => {
//     const seller = event.args.seller
//     const buyer = event.args.buyer
//     const nftAddress = event.args.nftAddress
//     const tokenId = Number(event.args.tokenId)
//     const quantity = Number(event.args.quantity)
//     const pricePerItem = Number(event.args.pricePerItem)
//     const paymentToken = event.args.paymentToken
//     let gold_volume = 0
//     if (paymentToken.toLowerCase() == config.GOLD_TOKEN) {
//       gold_volume = quantity * pricePerItem
//     }

//     ctx.eventLogger.emit("ItemSold", {
//       distinctId: buyer,
//       seller,
//       nftAddress,
//       tokenId,
//       quantity,
//       pricePerItem,
//       paymentToken,
//       gold_volume
//     })
//     ctx.meter.Counter("gold_volume_total").add(gold_volume)

//     ctx.meter.Counter("marketplace_transactions_cumulative").add(1)

//     ctx.meter.Counter("allCoreEventsCounter").add(1, { event: event.name })

//   })
//   .onAllEvents(AllEventsHandler)

// GoldStardustStakingProcessor.bind({ address: config.GOLD_STARDUST_STAKING, network: 338 })
//   .onEventLogStake(async (event, ctx) => {
//     const staker = event.args.staker
//     const goldAmount = Number(event.args.goldAmount)
//     const timestamp_logStake = Number(event.args.timestamp)
//     ctx.eventLogger.emit("LogStake", {
//       distinctId: staker,
//       goldAmount,
//       timestamp_logStake
//     })
//     ctx.meter.Counter("allCoreEventsCounter").add(1, { event: event.name })
//   })
//   .onEventLogUnstake(async (event, ctx) => {
//     const staker = event.args.staker
//     const stardustAmount = Number(event.args.stardustAmount) / Math.pow(10, 18)
//     const unstakeStart = Number(event.args.unstakeStart)
//     const unstakeUnlocked = Number(event.args.unstakeUnlocked)
//     const difference = unstakeUnlocked - unstakeStart
//     // console.log(`staker ${staker}, stardustAmount ${stardustAmount}, unstakeStart ${unstakeStart}, unstakeUnlocked ${unstakeUnlocked}, difference ${difference}`)

//     ctx.eventLogger.emit("LogUnstake", {
//       distinctId: staker,
//       stardustAmount,
//       unstakeStart,
//       unstakeUnlocked
//     })
//     ctx.meter.Counter("allCoreEventsCounter").add(1, { event: event.name })

//     if (difference > 0) {
//       let bucket = "nan"
//       if (difference <= 3600 * 24 * 30) {
//         bucket = "0-1m"
//       } else if (difference <= 3600 * 24 * 30 * 2) {
//         bucket = "1-2m"
//       } else if (difference <= 3600 * 24 * 30 * 3) {
//         bucket = "2-3m"
//       } else if (difference <= 3600 * 24 * 30 * 4) {
//         bucket = "3-4m"
//       } else if (difference <= 3600 * 24 * 30 * 5) {
//         bucket = "4-5m"
//       } else if (difference <= 3600 * 24 * 30 * 6) {
//         bucket = "5-6m"
//       } else {
//         bucket = "gt6m"
//       }

//       ctx.eventLogger.emit("UndergoingUnlocks", {
//         distinctId: staker,
//         stardustAmount,
//         unstakeStart,
//         unstakeUnlocked,
//         difference,
//         bucket
//       })
//     }
//   })
//   .onEventLogClaimed(async (event, ctx) => {
//     const staker = event.args.staker
//     const claimedAmount = Number(event.args.claimedAmount)
//     const timestamp_logClaimed = Number(event.args.timestamp)
//     ctx.eventLogger.emit("LogClaimed", {
//       distinctId: staker,
//       claimedAmount,
//       timestamp_logClaimed
//     })
//     ctx.meter.Counter("allCoreEventsCounter").add(1, { event: event.name })
//   })

// GoldProcessor.bind({ address: config.GOLD_TOKEN, network: 338 })
//   .onAllEvents(async (event, ctx) => {
//     try {
//       const totalSupply = Number(scaleDown(await ctx.contract.totalSupply(), 18))
//       let teamDeployerBal = 0
//       for (let address of config.TEAM_DEPLOYER_ADDRESSES) {
//         teamDeployerBal += Number(scaleDown(await ctx.contract.balanceOf(address), 18))
//       }
//       const factoryBal = Number(scaleDown(await ctx.contract.balanceOf(config.FACTORY_ADDRESS), 18))
//       const racingBal = Number(scaleDown(await ctx.contract.balanceOf(config.ATLANTIS_SPACESHIP_RACING), 18))
//       const goldCirculating = totalSupply - teamDeployerBal - factoryBal - racingBal
//       ctx.meter.Gauge("goldCirculating").record(goldCirculating)
//     }
//     catch (e) {
//       const hash = event.transactionHash
//       console.log(e.message, `Get balanceOf error at ${ctx.transactionHash}, txHash ${hash}`)
//     }
//   })
//   .onEventTransfer(async (event, ctx) => {
//     const from = event.args.from
//     const to = event.args.to
//     const value = Number(event.args.value) / Math.pow(10, 18)
//     if (to == "0x0000000000000000000000000000000000000000") {
//       ctx.eventLogger.emit("GoldBurnt", {
//         distinctId: from,
//         value
//       })
//       ctx.meter.Counter("gold_burnt_total").add(value)
//     }
//   })

// StardustProcessor.bind({ address: config.STARDUST_TOKEN, network: 338 })
//   .onAllEvents(async (event, ctx) => {
//     try {
//       const totalSupply = Number(scaleDown(await ctx.contract.totalSupply(), 18))
//       const planetExpeditionBal = Number(scaleDown(await ctx.contract.balanceOf(config.ATLANTIS_PLANET_EXPEDITION), 18))
//       const racingBal = Number(scaleDown(await ctx.contract.balanceOf(config.ATLANTIS_SPACESHIP_RACING), 18))
//       const stardustCirculating = totalSupply - planetExpeditionBal - racingBal
//       ctx.meter.Gauge("stardustCirculating").record(stardustCirculating)
//     }
//     catch (e) {
//       const hash = event.transactionHash
//       console.log(e.message, `Get balanceOf error at ${ctx.transactionHash}, txHash ${hash}`)
//     }
//   })


// ArgonautsProcessor.bind({ address: config.ARGONAUTS, network: 338 })
//   .onTimeInterval(async (_, ctx) => {
//     try {
//       const argonautNFTStakedSpaceshipRacing = Number(await ctx.contract.balanceOf(config.ATLANTIS_SPACESHIP_RACING))
//       const argonautNFTStakedPlanetExpedition = Number(await ctx.contract.balanceOf(config.ATLANTIS_PLANET_EXPEDITION))
//       ctx.meter.Gauge("argonautNFTStakedSpaceshipRacing").record(argonautNFTStakedSpaceshipRacing)
//       ctx.meter.Gauge("argonautNFTStakedPlanetExpedition").record(argonautNFTStakedPlanetExpedition)
//     }
//     catch (e) {
//       console.log(e.message, `Get balanceOf error at ${ctx.transactionHash}`)
//     }
//   }, 60 * 24)

