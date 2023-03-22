import { PythEVMContext, PythEVMProcessor, PriceFeedUpdateEvent, getPythEVMContract, UpdatePriceFeedsCallTrace, UpdatePriceFeedsIfNecessaryCallTrace,
    BatchPriceFeedUpdateEvent } from "./types/eth/pythevm.js";
import { PRICE_MAP } from "./pyth.js";
import { Counter, Gauge } from "@sentio/sdk";
import { getPrice } from "./aptos.js";
// import { toBigDecimal } from "@sentio/sdk/";
// import { BigDecimal } from "@sentio/sdk/lib/core/big-decimal";
import { scaleDown } from '@sentio/sdk'
import {EthEvent} from "@sentio/sdk/eth";


const commonOptions = { sparse: true }
const priceGauage = Gauge.register("evm_price", commonOptions)
const priceUnsafeGauage = Gauge.register("evm_price_unsafe", commonOptions)
const price_update_occur = Gauge.register("price_update_occur", commonOptions)
const batch_price_update_occur = Gauge.register("batch_price_update_occur", commonOptions)

const CHAIN_ADDRESS_MAP = new Map<number, string>([
    [1, "0x4305FB66699C3B2702D4d05CF36551390A4c69C6"], //ETH
    [10, "0xff1a0f4744e8582df1ae09d5611b887b6a12925c"], //Optimism
    [56, "0x4D7E825f80bDf85e913E0DD2A2D54927e9dE1594"], //BSC
    // [97, "0xd7308b14bf4008e7c7196ec35610b1427c5702ea"], //BSC testnet
    [137, "0xff1a0f4744e8582DF1aE09D5611b887B6a12925C"], //Polygon
    [42161, "0xff1a0f4744e8582DF1aE09D5611b887B6a12925C"], //Arbitrum
    [250, "0xff1a0f4744e8582DF1aE09D5611b887B6a12925C"], //Fantom
    [1313161554, "0xF89C7b475821EC3fDC2dC8099032c05c6c0c9AB9"], //Aurora
    [321, "0xE0d0e68297772Dd5a1f1D99897c581E2082dbA5B"], //KCC
    [43114, "0x4305FB66699C3B2702D4d05CF36551390A4c69C6"], //Avalanche
    [25, "0xE0d0e68297772Dd5a1f1D99897c581E2082dbA5B"], //Cronos

])

const CHAIN_NATIVE_MAP = new Map<string, string>([
    ["0x4305FB66699C3B2702D4d05CF36551390A4c69C6".toLowerCase(), "Crypto.ETH/USD"], //ETH
    ["0xff1a0f4744e8582df1ae09d5611b887b6a12925c".toLowerCase(), "Crypto.OP/USD"], //Optimism
    ["0x4D7E825f80bDf85e913E0DD2A2D54927e9dE1594".toLowerCase(), "Crypto.BNB/USD"], //BSC
    // ["0xd7308b14bf4008e7c7196ec35610b1427c5702ea".toLowerCase(), "Crypto.BNB/USD"], //BSC testnet
    ["0xff1a0f4744e8582DF1aE09D5611b887B6a12925C".toLowerCase(), "Crypto.MATIC/USD"], //Polygon
    ["0xff1a0f4744e8582DF1aE09D5611b887B6a12925C".toLowerCase(), "Crypto.ETH/USD"],//Arbitrum
    ["0xff1a0f4744e8582DF1aE09D5611b887B6a12925C".toLowerCase(), "Crypto.FTM/USD"], //Fantom
    ["0xF89C7b475821EC3fDC2dC8099032c05c6c0c9AB9".toLowerCase(), "Crypto.AURORA/USD"], //Aurora
    ["0xE0d0e68297772Dd5a1f1D99897c581E2082dbA5B".toLowerCase(), "Crypto.KCS/USD"], //KCC
    ["0x4305FB66699C3B2702D4d05CF36551390A4c69C6".toLowerCase(), "Crypto.AVAX/USD"], //Avalanche
    ["0xE0d0e68297772Dd5a1f1D99897c581E2082dbA5B".toLowerCase(), "Crypto.CRO/USD"], //Cronos

])

async function priceFeedUpdate(evt: PriceFeedUpdateEvent, ctx: PythEVMContext) {
    const price = evt.args.price
    const priceId = evt.args.id
    const address = ctx.address.toLowerCase()
    const symbol = PRICE_MAP.get(priceId) || "not listed"
    const nativeSymbol = CHAIN_NATIVE_MAP.get(address) || "not found"
    var isNative
    if (nativeSymbol == symbol) {
        isNative = "true"
    } else {
        isNative = "false"
    }
    const labels = { priceId, symbol, isNative }
    const pythContract = getPythEVMContract(ctx.chainId, ctx.address)
    const priceUnsafeStruct = await pythContract.getPriceUnsafe(priceId, {blockTag: evt.blockNumber})
    const priceUnsafe = scaleDown(priceUnsafeStruct.price, -priceUnsafeStruct.expo)
    priceGauage.record(ctx, price, labels)
    priceUnsafeGauage.record(ctx, priceUnsafe, labels)
    ctx.meter.Counter("price_update_counter").add(1, labels)
    price_update_occur.record(ctx, 1, labels)
    await recordGasUsage("priceFeedUpdate", evt.transactionHash, ctx)
}

async function batchPriceUpdate(evt: BatchPriceFeedUpdateEvent, ctx: PythEVMContext) {
    ctx.meter.Counter("batch_price_update_counter").add(1)
    batch_price_update_occur.record(ctx, 1)
    await recordGasUsage("batchPriceUpdate", evt.transactionHash, ctx)
}

async function updatePriceFeeds(call: UpdatePriceFeedsCallTrace, ctx: PythEVMContext) {
    const from = call.action.from
    ctx.meter.Counter("update_price_feed_caller").add(1, {"caller": from})
}

async function updatePriceFeedsIfNecessary(call: UpdatePriceFeedsIfNecessaryCallTrace, ctx: PythEVMContext) {
    const from = call.action.from
    ctx.meter.Counter("update_price_feed_if_necessary_caller").add(1, {"caller": from})
}

async function recordGasUsage(evt : string, hash : string, ctx: PythEVMContext) {
    try {
        const receipt = await ctx.contract.provider.getTransactionReceipt(hash)
        const gasUsed = receipt!.gasUsed
        const gasPrice = receipt!.gasPrice.scaleDown(18)
        ctx.meter.Counter("gas_usage").add(gasUsed.asBigDecimal().
        multipliedBy(gasPrice).toNumber(), {"event": evt})
    } catch (e) {
        console.log(e)
        return
    }
}

CHAIN_ADDRESS_MAP.forEach((addr, chainId) => {
    // TODO: change this to
    if (addr == "0xff1a0f4744e8582df1ae09d5611b887b6a12925c") {
        PythEVMProcessor.bind({address: addr, network: chainId, startBlock: 45722027})
        .onEventPriceFeedUpdate(priceFeedUpdate)
        .onCallUpdatePriceFeeds(updatePriceFeeds)
        .onCallUpdatePriceFeedsIfNecessary(updatePriceFeedsIfNecessary)
        .onEventBatchPriceFeedUpdate(batchPriceUpdate)
    } else {
        PythEVMProcessor.bind({address: addr, network: chainId})
        .onEventPriceFeedUpdate(priceFeedUpdate)
        .onCallUpdatePriceFeeds(updatePriceFeeds)
        .onCallUpdatePriceFeedsIfNecessary(updatePriceFeedsIfNecessary)
        .onEventBatchPriceFeedUpdate(batchPriceUpdate)
    }
})

// PythEVMProcessor.bind({address: PYTH_ETH})
// .onEventPriceFeedUpdate(priceFeedUpdate)
// .onCallUpdatePriceFeeds(updatePriceFeeds)
// .onCallUpdatePriceFeedsIfNecessary(updatePriceFeedsIfNecessary)
// .onEventBatchPriceFeedUpdate(batchPriceUpdate)

// PythEVMProcessor.bind({address: PYTH_OP, network: 10})
// .onEventPriceFeedUpdate(priceFeedUpdate)
// .onCallUpdatePriceFeeds(updatePriceFeeds)
// .onCallUpdatePriceFeedsIfNecessary(updatePriceFeedsIfNecessary)
// .onEventBatchPriceFeedUpdate(batchPriceUpdate)

// PythEVMProcessor.bind({address: PYTH_BSC, network: 56})
// .onEventPriceFeedUpdate(priceFeedUpdate)
// .onCallUpdatePriceFeeds(updatePriceFeeds)
// .onCallUpdatePriceFeedsIfNecessary(updatePriceFeedsIfNecessary)
// .onEventBatchPriceFeedUpdate(batchPriceUpdate)