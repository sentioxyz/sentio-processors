import { CHAIN_IDS } from "@sentio/sdk";
import { CONTROLLER_GOERLI, FACTORY_GOERLI } from "./constant.js";
import { 
    RainCollateralControllerProcessor, 
    RainCollateralControllerContext,
    LiquidationEvent,
    PaymentEvent
} from "./types/eth/raincollateralcontroller.js";
import {getPriceByType, token} from "@sentio/sdk/utils"
import { NewRainCollateralEvent, RainCollateralFactoryProcessor,  RainCollateralFactoryContext} from "./types/eth/raincollateralfactory.js"

async function liquidationEventHandler(evt: LiquidationEvent, ctx: RainCollateralControllerContext) {
    const amounts = evt.args._amounts
    const assets = evt.args._assets
    const proxy = evt.args._collateralProxy

    for (let i = 0; i < assets.length; i++) {
        const asset = assets[i]
        const tokenInfo = await token.getERC20TokenInfo(ctx, asset)
        const amount = amounts[i].scaleDown(tokenInfo.decimal)
        ctx.eventLogger.emit('liquidation', {
            message: `${amount} ${tokenInfo.symbol} is liquidated`,
            proxy: proxy,
            distinctId: proxy,
            asset: asset,
            amount: amount
        })
    }
    ctx.meter.Counter("liquidation_counter").add(1)
}

async function paymentEventHandler(evt: PaymentEvent, ctx: RainCollateralControllerContext) {
    const amounts = evt.args._amounts
    const assets = evt.args._assets
    const proxy = evt.args._collateralProxy

    for (let i = 0; i < assets.length; i++) {
        const asset = assets[i]
        const tokenInfo = await token.getERC20TokenInfo(ctx, asset)
        const amount = amounts[i].scaleDown(tokenInfo.decimal)
        ctx.eventLogger.emit('payment', {
            message: `${amount} ${tokenInfo.symbol} is repaid`,
            proxy: proxy,
            distinctId: proxy,
            asset: asset,
            amount: amount
        })
    }
    ctx.meter.Counter("payment_counter").add(1)
}

async function newRainCollateral(evt: NewRainCollateralEvent, ctx: RainCollateralFactoryContext) {
    const user = evt.args._user
    const name = evt.args._name
    const proxy = evt.args._collateralProxy

    ctx.eventLogger.emit('newCollateral', {
        message: `${proxy} created for user ${user} with name ${name}`,
        proxy: proxy,
        distinctId: user,
        name: name,
        user: user
    })
    ctx.meter.Counter("new_collateral_counter").add(1)
}

RainCollateralControllerProcessor.bind({address: CONTROLLER_GOERLI, network: CHAIN_IDS.GOERLI})
.onEventLiquidation(liquidationEventHandler)
.onEventPayment(paymentEventHandler)

RainCollateralFactoryProcessor.bind({address: FACTORY_GOERLI, network: CHAIN_IDS.GOERLI})
.onEventNewRainCollateral(newRainCollateral)