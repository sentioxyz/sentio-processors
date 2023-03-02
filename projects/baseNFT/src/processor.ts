import { Counter, Gauge } from '@sentio/sdk'
import { ERC20Processor } from '@sentio/sdk/eth/builtin'
import {Erc721, Erc721Processor} from './types/eth/erc721.js'
import { BigDecimal, CHAIN_IDS, MetricOptions } from "@sentio/sdk";

const gaugeOptions: MetricOptions = {
    sparse: true,
    aggregationConfig: {
        intervalInMinutes: [60],
    }
}

const vol = Gauge.register("vol", gaugeOptions)
const feeVol = Gauge.register("feeVol", gaugeOptions)

Erc721Processor.bind({address: "0xD4307E0acD12CF46fD6cf93BC264f5D5D1598792"})
.onEventSale(async (event, ctx) => {
    ctx.meter.Counter("sales_counter").add(1)
    vol.record(ctx, 1)
})
.onEventMintFeePayout(async (event, ctx) => {
    const ethAmount = event.args.mintFeeAmount.scaleDown(18)
    ctx.meter.Counter("mint_fee").add(ethAmount)
    feeVol.record(ctx, ethAmount)
})