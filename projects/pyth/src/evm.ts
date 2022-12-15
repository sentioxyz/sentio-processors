import { PythEVMContext, PythEVMProcessor, PriceFeedUpdateEvent, getPythEVMContract, UpdatePriceFeedsCallTrace, UpdatePriceFeedsIfNecessaryCallTrace, BatchPriceFeedUpdateEvent } from "./types/pythevm";
import { PRICE_MAP } from "./pyth";
import { Counter, Gauge } from "@sentio/sdk";
import { getPrice } from "./aptos";
import { toBigDecimal } from "@sentio/sdk/lib/utils/conversion";
import { BigDecimal } from "@sentio/sdk/lib/core/big-decimal";
import { scaleDown } from '@sentio/sdk/lib/utils/token'


const commonOptions = { sparse: true }
const priceGauage = Gauge.register("evm_price", commonOptions)
const priceUnsafeGauage = Gauge.register("evm_price_unsafe", commonOptions)
const price_update_occur = Gauge.register("price_update_occur", commonOptions)
const batch_price_update_occur = Gauge.register("batch_price_update_occur", commonOptions)



const PYTH_ETH = "0x4305FB66699C3B2702D4d05CF36551390A4c69C6"
const PYTH_OP = "0xff1a0f4744e8582df1ae09d5611b887b6a12925c"

async function priceFeedUpdate(evt: PriceFeedUpdateEvent, ctx: PythEVMContext) {
    const price = evt.args.price
    const priceId = evt.args.id
    const symbol = PRICE_MAP.get(priceId) || "not listed"
    const labels = { priceId, symbol }
    const pythContract = getPythEVMContract(ctx.address, ctx.chainId)
    const priceUnsafeStruct = await pythContract.getPriceUnsafe(priceId, {blockTag: evt.blockNumber})
    const priceUnsafe = scaleDown(priceUnsafeStruct.price, -priceUnsafeStruct.expo)
    priceGauage.record(ctx, price, labels)
    priceUnsafeGauage.record(ctx, priceUnsafe, labels)
    ctx.meter.Counter("price_update_counter").add(1, labels)
    price_update_occur.record(ctx, 1, labels)
}

async function batchPriceUpdate(evt: BatchPriceFeedUpdateEvent, ctx: PythEVMContext) {
    ctx.meter.Counter("batch_price_update_counter").add(1)
    batch_price_update_occur.record(ctx, 1)
}

async function updatePriceFeeds(call: UpdatePriceFeedsCallTrace, ctx: PythEVMContext) {
    const from = call.action.from
    ctx.meter.Counter("update_price_feed_caller").add(1, {"caller": from})
}

async function updatePriceFeedsIfNecessary(call: UpdatePriceFeedsIfNecessaryCallTrace, ctx: PythEVMContext) {
    const from = call.action.from
    ctx.meter.Counter("update_price_feed_if_necessary_caller").add(1, {"caller": from})
}

PythEVMProcessor.bind({address: PYTH_ETH})
.onEventPriceFeedUpdate(priceFeedUpdate)
.onCallUpdatePriceFeeds(updatePriceFeeds)
.onCallUpdatePriceFeedsIfNecessary(updatePriceFeedsIfNecessary)
.onEventBatchPriceFeedUpdate(batchPriceUpdate)

PythEVMProcessor.bind({address: PYTH_OP, network: 10})
.onEventPriceFeedUpdate(priceFeedUpdate)
.onCallUpdatePriceFeeds(updatePriceFeeds)
.onCallUpdatePriceFeedsIfNecessary(updatePriceFeedsIfNecessary)
.onEventBatchPriceFeedUpdate(batchPriceUpdate)