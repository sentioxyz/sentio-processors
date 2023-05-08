import {getPriceByType, token} from "@sentio/sdk/utils"
import {BigDecimal, Counter, Gauge} from "@sentio/sdk"
import { ApeStakingContext, ApeStakingProcessor } from './types/eth/apestaking.js'
import { DepositEvent, DepositNftEvent } from './types/eth/apestaking.js'
import { DepositApeCoinCallTrace } from './types/eth/apestaking.js'

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
    ctx.meter.Counter("deposit_cume").add(amount)
    ctx.eventLogger.emit("Deposit", {
        distinctId: user,
        user: user,
        receipient: recipient,
        amount: amount,
        message: `${user} deposited ${amount} APE for recipient: ${recipient}`,
    })
}

const depositApeCoinHandler = async function(trace: DepositApeCoinCallTrace, ctx: ApeStakingContext) {
    const amount = trace.args._amount.scaleDown(DECIMAL)

    const recipient = trace.args._recipient
    const user = trace.action.from
    const success = trace.error
    const gas = trace.action.gas

    ctx.eventLogger.emit("depositApeCoin", {
        distinctId: user,
        receipient: recipient,
        amount: amount,
        message: `${user} issued deposit of ${amount} APE for recipient: ${recipient}`,
    })
    if(ctx.transaction!.from.toLowerCase() != trace.action.from.toLowerCase()) {
        ctx.eventLogger.emit("smartContractCallDetected", {
            distinctId: user,
            receipient: recipient,
            amount: amount,
            origin: ctx.transaction!.from,
            sender: trace.action.from,
            success: success,
            gas: gas,
            message: `${user} issued deposit of ${amount} APE for recipient: ${recipient}`,
        })
    }
}

ApeStakingProcessor.bind({address: APE_STAKING})
.onEventDeposit(depositHandler)
.onCallDepositApeCoin(depositApeCoinHandler, {transaction: true})