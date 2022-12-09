import { PythEVMContext, PythEVMProcessor, PriceFeedUpdateEvent } from "./types/pythevm";
import { PRICE_MAP } from "./pyth";
import { Counter, Gauge } from "@sentio/sdk";

const commonOptions = { sparse: true }
const priceGauage = Gauge.register("evm_price", commonOptions)
const PYTH_ETH = "0x4305FB66699C3B2702D4d05CF36551390A4c69C6"

async function priceFeedUpdate(evt: PriceFeedUpdateEvent, ctx: PythEVMContext) {
    const price = evt.args.price
    const priceId = evt.args.id
    const symbol = PRICE_MAP.get(priceId) || "not listed"
    const labels = { priceId, symbol }
    priceGauage.record(ctx, price, labels)
}

PythEVMProcessor.bind({address: PYTH_ETH})
.onEventPriceFeedUpdate(priceFeedUpdate)