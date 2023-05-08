import { TokenDistributorContext, TokenDistributorProcessor, HasClaimedEvent, CanClaimEvent } from './types/eth/tokendistributor.js'
import { scaleDown } from '@sentio/sdk'
import { ARB_AIRDROP } from './constant.js'
import { EthChainId } from "@sentio/sdk/eth";

const DECIMAL = 18

const hasClaimEventHandler = async function(event: HasClaimedEvent, ctx: TokenDistributorContext) {
    const amount = scaleDown(event.args.amount, DECIMAL)
    const claimer = event.args.recipient

    ctx.meter.Counter("hasClaimed_counter").add(amount, {coin_symbol: "ARB"})
    ctx.eventLogger.emit("HasClaimed", {
        distinctId: claimer,
        message: `${amount} ARB claimed by ${claimer}`,
        claimer: claimer,
        amount: amount,
        coin_symbol: "ARB"
    })
}

const canClaimEventHandler = async function(event: CanClaimEvent, ctx: TokenDistributorContext) {
    const amount = scaleDown(event.args.amount, DECIMAL)
    const claimer = event.args.recipient

    ctx.meter.Counter("canClaim_counter").add(amount, {coin_symbol: "ARB"})
    ctx.eventLogger.emit("CanClaim", {
        distinctId: claimer,
        message: `${amount} ARB granted to ${claimer}`,
        claimer: claimer,
        amount: amount,
        coin_symbol: "ARB"
    })
}

TokenDistributorProcessor.bind({address: ARB_AIRDROP, network: EthChainId.ARBITRUM})
// .onEventHasClaimed(hasClaimEventHandler, undefined, {transaction: true})
.onEventHasClaimed(hasClaimEventHandler)
.onEventCanClaim(canClaimEventHandler)