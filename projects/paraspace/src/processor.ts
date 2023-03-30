import {getPriceByType, token} from "@sentio/sdk/utils"
import {BigDecimal, CHAIN_IDS, Counter, Gauge} from "@sentio/sdk"
import { ApeStakingContext, ApeStakingProcessor } from './types/eth/apestaking.js'
import { DepositEvent, DepositNftEvent } from './types/eth/apestaking.js'
import { DepositSelfApeCoinCallTrace } from './types/eth/apestaking.js'

const APE_STAKING = "0x5954aB967Bc958940b7EB73ee84797Dc8a2AFbb9"
const APE_COIN = "0x4d224452801ACEd8B2F0aebE155379bb5D594381"
const DECIMAL = 18

export const volOptions = {
    sparse: true,
    aggregationConfig: {
        intervalInMinutes: [60],
    }
}

const depositHandler = async function(event: DepositEvent, ctx: ApeStakingContext) {
    const amount = event.args.amount.scaleDown(DECIMAL)
    const user = event.args.user
    const recipient = event.args.recipient
    ctx.eventLogger.emit("Deposit", {
        distinctId: user,
        user: user,
        receipient: recipient,
        amount: amount,
        message: `${user} deposited ${amount} APE for recipient: ${recipient}`,
    })
}

const depositSelfApeCoinHandler = async function(trace: DepositSelfApeCoinCallTrace, ctx: ApeStakingContext) {
    const amount = trace.args._amount.scaleDown(DECIMAL)

    // const recepient = trace.args._



}

ApeStakingProcessor.bind({address: APE_STAKING})
.onEventDeposit(depositHandler)
.onCallDepositSelfApeCoin(depositSelfApeCoinHandler)