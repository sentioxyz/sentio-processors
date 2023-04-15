import { Counter, Gauge } from '@sentio/sdk'
import { ERC20Processor } from '@sentio/sdk/eth/builtin'
import { AtlantisRacingProcessor } from './types/eth/atlantisracing.js'
import { AtlantisGemstonesProcessor } from './types/eth/atlantisgemstones.js'
export const ATLANTIS_SPACESHIP_RACING_ADDRESS = "0x9b1a00168aea4d6e0f223425a53b5df7195b44ef"
export const ATLANTIS_GEMSTONES_ADDRESS = "0x6933bd3c56d3fc282bc0c1931f613f79bd9430b4"

//cronos testnet chain_id = 338
AtlantisRacingProcessor.bind({ address: ATLANTIS_SPACESHIP_RACING_ADDRESS, network: 338 })
  // .onEventPayout(async (event, ctx) => {
  //   const poolId = Number(event.args.poolId)
  //   const user = event.args.user
  //   const goldAmount = Number(event.args.goldAmount)
  //   const stardustAmount = Number(event.args.stardustAmount)
  //   ctx.eventLogger.emit("Payout",
  //     {
  //       distinctId: user,
  //       poolId,
  //       goldAmount,
  //       stardustAmount
  //     })
  // })
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
  })


AtlantisGemstonesProcessor.bind({ address: ATLANTIS_GEMSTONES_ADDRESS, network: 338 })
  .onAllEvents(async (event, ctx) => {
    ctx.meter.Counter("all_event_counter").add(1)
    let gemSupply = 0
    for (let i = 1; i < 13; i++) {
      try {
        gemSupply = Number(await ctx.contract.totalSupply(i))
        ctx.meter.Gauge(`gemSupply`).record(gemSupply, { "ID": i.toString() })
      }
      catch (e) {
        console.log(e.message, `Get totalSupply(${i}) error at ${event.transactionHash}`)
      }
    }
  })


