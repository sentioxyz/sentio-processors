import { Counter, Gauge } from '@sentio/sdk'
import { ERC20Processor } from '@sentio/sdk/eth/builtin'
import { AtlantisRacingProcessor } from './types/eth/atlantisracing.js'

export const ATLANTIS_SPACESHIP_RACING_ADDRESS = "0x9b1a00168aea4d6e0f223425a53b5df7195b44ef"

//testnet
AtlantisRacingProcessor.bind({ address: ATLANTIS_SPACESHIP_RACING_ADDRESS, network: 338 })
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
  })

