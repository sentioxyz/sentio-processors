import { SuiBaseProcessor, SuiContext, SuiGlobalProcessor, SuiNetwork } from "@sentio/sdk/sui"
import { SuiEvent } from "@mysten/sui.js/client"
import * as constant from './helper/constant.js'
import * as helper from './helper/dex-helper.js'
import { getPriceBySymbol, getPriceByType } from "@sentio/sdk/utils"
import { getOrCreateCoin } from "./helper/dex-helper.js";
import { coin } from "@sentio/sdk/aptos/builtin/0x1"
import { poolInfo, multiAssetPoolInfo } from "./helper/dex-helper.js"
import { WHITELISTED_TYPE_MAP } from "./helper/constant.js";
import { MoveFetchConfig, EventFilter } from "@sentio/sdk/move";

class GeneralProcessor extends SuiBaseProcessor {
    public override onMoveEvent(handler: (event: SuiEvent, ctx: SuiContext) => void,
        filter: EventFilter | EventFilter[],
        fetchConfig?: Partial<MoveFetchConfig>): GeneralProcessor {
        return super.onMoveEvent(handler, filter, fetchConfig) as GeneralProcessor
    }
}

const processedMap = new Set<string>()

for (const tp of WHITELISTED_TYPE_MAP.values()) {
    const [address, module, type] = tp.split("::")
    const processor = new GeneralProcessor(module, {
        address,
        // startCheckpoint: 12000000n,
        //startCheckpoint: 12000000n
    })

    processor.onMoveEvent(
        async (_, ctx) => {
            if (processedMap.has(ctx.transaction.digest)) {
                return
            }
            processedMap.add(ctx.transaction.digest)

            //debug
            // if (ctx.transaction.digest != "Gv7kVWcRY2wUbU4q6vkjzBTPJim3kMLLYezbNofm9U2V") return

            if (ctx.transaction.events) {
                await handleSwapEvents(ctx.transaction.events, ctx)
                // await handleLiquidityEvents(ctx.transaction.events, ctx)
            } else {
                console.log("no events")
            }
        }, {
        type: `${module}::${type}`
    },
        {
            inputs: true,
            allEvents: true
        }
    )
}



async function handleSwapEvents(events: SuiEvent[], ctx: SuiContext) {
    //handle different dex events
    for (const event of events) {
        //v3: cetus and turbos dex swap
        if (event.type.includes(constant.CETUS_SWAP_TYPE)
            || event.type.includes(constant.TURBOS_SWAP_TYPE)) {
            await recordClmmV3Event(event, ctx)
        }

        //v2: kriya spot, flowx, interest protocol
        if (event.type.includes(constant.KRIYA_SWAP_TYPE)
            || event.type.includes(constant.FLOWX_SWAP_TYPE)
            || event.type.includes(constant.IPX_SWAP_TYPE)) {
            await recordAmmV2Event(event, ctx)
        }

        //deepbook
        if (event.type.includes(constant.DEEPBOOK_TYPE)) {
            await recordClobEvent(event, ctx)
        }

        //curve: aftermath
        if (event.type.includes(constant.AFTERMATH_SWAP_TYPE)) {
            await recordMultiAssetEvent(event, ctx)
        }
    }

}

async function handleLiquidityEvents(events: SuiEvent[], ctx: SuiContext) {
    //handle different dex events
    for (const event of events) {

        //v3: cetus and turbos dex swap
        if (event.type.includes(constant.CETUS_SWAP_TYPE)
            || event.type.includes(constant.TURBOS_SWAP_TYPE)) {
        }

        //v2: kriya spot, flowx, interest protocol
        if (event.type.includes(constant.KRIYA_SWAP_TYPE)
            || event.type.includes(constant.FLOWX_SWAP_TYPE)
            || event.type.includes(constant.IPX_SWAP_TYPE)) {
        }

        //deepbook
        if (event.type.includes(constant.DEEPBOOK_TYPE)) {
        }

        //curve: aftermath
        if (event.type.includes(constant.AFTERMATH_ADD_LIQUIDITY_TYPE)
            || event.type.includes(constant.AFTERMATH_REMOVE_LIQUIDITY_TYPE)) {
            //@ts-ignore
            const pool = event.parsedJson.pool_id
            const multiAssetPoolInfo: multiAssetPoolInfo = await helper.getOrCreateMultiAssetPool(ctx, pool)
            let usd_volume = 0
            const amounts: number[] = []
            const symbols: string[] = []
            const isDeposit = event.type.includes(constant.AFTERMATH_ADD_LIQUIDITY_TYPE)
            //@ts-ignore
            for (let i = 0; i < event.parsedJson.types.length; i++) {
                let price = 0
                //@ts-ignore
                const coinType = `0x${event.parsedJson.types[i]}`
                //@ts-ignore
                const coinInfo = await getOrCreateCoin(ctx, coinType)
                let amount = 0
                if (isDeposit) {
                    //@ts-ignore
                    amount = Number(event.parsedJson.deposits[i]) / Math.pow(10, coinInfo.decimal)
                }
                else {
                    //@ts-ignore
                    amount = Number(event.parsedJson.withdrawn[i]) / Math.pow(10, coinInfo.decimal)
                }
                amounts.push(amount)
                symbols.push(coinInfo.symbol)
                try {
                    price = (await getPriceByType(SuiNetwork.MAIN_NET, coinType, ctx.timestamp))!
                }
                catch (e) {
                    console.log(`${e.message} price not in sui coinlist, calculateMultiAsset ${ctx.transaction.digest} ${multiAssetPoolInfo.pool}`)
                }
                if (price) {
                    usd_volume += price * amount
                }
                else {
                    ctx.eventLogger.emit("PriceNotSupported", {
                        type: coinType,
                        pool: multiAssetPoolInfo.pool,
                        pairName: multiAssetPoolInfo.pairName
                    })
                }
            }
            ctx.eventLogger.emit(`dex.${isDeposit ? "add" : "remove"}LiquidityEvent`, {
                //@ts-ignore
                distinctId: ctx.transaction.transaction.data.sender,
                pool,
                usd_volume,
                pairName: multiAssetPoolInfo.pairName,
                project: "aftermath",
                message: `Add Liquidity ${JSON.stringify(amounts)} ${JSON.stringify(symbols)} USD value: ${usd_volume} to Pool ${multiAssetPoolInfo.pairName} `
            })
        }




    }

}




async function recordClmmV3Event(event: SuiEvent, ctx: SuiContext) {
    let [project, amount_in, amount_out, atob] = ["", 0, 0, false]
    //@ts-ignore
    const pool = event.parsedJson.pool

    const poolInfo: poolInfo = await helper.getOrCreatePool(ctx, pool)

    if (event.type.includes(constant.CETUS_SWAP_TYPE)) {
        //@ts-ignore
        atob = event.parsedJson.atob
        //@ts-ignore
        amount_in = Number(event.parsedJson.amount_in) / Math.pow(10, atob ? poolInfo.decimal_a : poolInfo.decimal_b)
        //@ts-ignore
        amount_out = Number(event.parsedJson.amount_out) / Math.pow(10, atob ? poolInfo.decimal_b : poolInfo.decimal_a)
        project = "cetus"
    }
    if (event.type.includes(constant.TURBOS_SWAP_TYPE)) {
        //@ts-ignore
        atob = event.parsedJson.a_to_b
        //@ts-ignore
        const amount_a = Number(event.parsedJson.amount_a) / Math.pow(10, poolInfo.decimal_a)
        //@ts-ignore
        const amount_b = Number(event.parsedJson.amount_b) / Math.pow(10, poolInfo.decimal_b)
        amount_in = atob ? amount_a : amount_b
        amount_out = atob ? amount_b : amount_a
        project = "turbos"
    }

    const usd_volume = await helper.calculateSwapVol_USD(ctx, poolInfo, amount_in, amount_out, atob)

    ctx.eventLogger.emit("dex.swapEvents", {
        //@ts-ignore
        distinctId: ctx.transaction.transaction.data.sender,
        pool,
        amount_in,
        amount_out,
        usd_volume,
        atob,
        coin_symbol: atob ? poolInfo.symbol_a : poolInfo.symbol_b, //for amount_in
        pairName: poolInfo.pairName,
        project,
        message: `Swap ${amount_in} ${atob ? poolInfo.symbol_a : poolInfo.symbol_b} to ${amount_out} ${atob ? poolInfo.symbol_b : poolInfo.symbol_a}. USD value: ${usd_volume} in Pool ${poolInfo.pairName} `
    })
}

async function recordAmmV2Event(event: SuiEvent, ctx: SuiContext) {
    //@ts-ignore
    const pool = (event.type.includes(constant.KRIYA_SWAP_TYPE) || event.type.includes(constant.FLOWX_SWAP_TYPE)) ? event.parsedJson.pool_id : event.parsedJson.id
    const poolInfo: poolInfo = await helper.getOrCreatePool(ctx, pool)

    //atob
    let atob = false
    let [amount_in, amount_out, project] = [0, 0, "unk"]
    //for kriya
    if (event.type.includes(constant.KRIYA_SWAP_TYPE)) {
        const swapCoin = event.type.substring(event.type.indexOf('<') + 1, event.type.indexOf('>'));
        atob = (poolInfo.type_a == swapCoin)
        console.log("atob", swapCoin, poolInfo.type_a, pool, event.type)
        //@ts-ignore
        amount_in = Number(event.parsedJson.amount_in) / Math.pow(10, atob ? poolInfo.decimal_a : poolInfo.decimal_b)
        //@ts-ignore
        amount_out = Number(event.parsedJson.amount_out) / Math.pow(10, atob ? poolInfo.decimal_b : poolInfo.decimal_a)
        project = "kriya"
    }
    if (event.type.includes(constant.FLOWX_SWAP_TYPE)) {
        //@ts-ignore
        atob = (event.parsedJson.amount_x_in > event.parsedJson.amount_x_out)
        //@ts-ignore
        const amount_x = Number(event.parsedJson.amount_x_in) - Number(event.parsedJson.amount_x_out)
        //@ts-ignore
        const amount_y = Number(event.parsedJson.amount_y_in) - Number(event.parsedJson.amount_y_out)
        amount_in = Math.abs(atob ? amount_x : amount_y) / Math.pow(10, atob ? poolInfo.decimal_a : poolInfo.decimal_b)
        amount_out = Math.abs(atob ? amount_y : amount_x) / Math.pow(10, atob ? poolInfo.decimal_b : poolInfo.decimal_a)
        project = "flowx"
    }
    if (event.type.includes(constant.IPX_SWAP_TYPE)) {
        //@ts-ignore
        atob = event.type.includes("SwapTokenX")
        //@ts-ignore
        const amount_x = atob ? Number(event.parsedJson.coin_x_in) : Number(event.parsedJson.coin_x_out)
        //@ts-ignore
        const amount_y = atob ? Number(event.parsedJson.coin_y_out) : Number(event.parsedJson.coin_y_in)
        amount_in = (atob ? amount_x : amount_y) / Math.pow(10, atob ? poolInfo.decimal_a : poolInfo.decimal_b)
        amount_out = (atob ? amount_y : amount_x) / Math.pow(10, atob ? poolInfo.decimal_b : poolInfo.decimal_a)
        project = "ipx"
    }

    //@ts-ignore
    const usd_volume = await helper.calculateSwapVol_USD(ctx, poolInfo, amount_in, amount_out, atob)

    ctx.eventLogger.emit("dex.swapEvents", {
        //@ts-ignore
        distinctId: ctx.transaction.transaction.data.sender,
        pool,
        amount_in,
        amount_out,
        usd_volume,
        atob,
        coin_symbol: atob ? poolInfo.symbol_a : poolInfo.symbol_b, //for amount_in
        pairName: poolInfo.pairName,
        project,
        message: `Swap ${amount_in} ${atob ? poolInfo.symbol_a : poolInfo.symbol_b} to ${amount_out} ${atob ? poolInfo.symbol_b : poolInfo.symbol_a}. USD value: ${usd_volume} in Pool ${poolInfo.pairName} `
    })
}

async function recordClobEvent(event: SuiEvent, ctx: SuiContext) {
    //@ts-ignore
    const pool = event.parsedJson.pool_id
    const poolInfo: poolInfo = await helper.getOrCreatePool(ctx, pool)

    let atob = false
    let [amount_in, amount_out, project] = [0, 0, "unk"]

    if (event.type.includes(constant.DEEPBOOK_TYPE)) {
        //is_bid true: quote b ->base a, false: base a -> quote b, doc issue?
        //@ts-ignore
        atob = event.parsedJson.is_bid
        //@ts-ignore
        const p_r = Math.pow(10, poolInfo.decimal_a - poolInfo.decimal_b - 9) * Number(event.parsedJson.price) //calculate priceInRealWorld
        //@ts-ignore
        const amount_a = Number(event.parsedJson.base_asset_quantity_filled) / Math.pow(10, poolInfo.decimal_a)
        const amount_b = amount_a * p_r
        amount_in = atob ? amount_a : amount_b
        amount_out = atob ? amount_b : amount_a
        project = "deepbook"
    }

    //@ts-ignore
    const usd_volume = await helper.calculateSwapVol_USD(ctx, poolInfo, amount_in, amount_out, atob)

    ctx.eventLogger.emit("dex.swapEvents", {
        //@ts-ignore
        distinctId: ctx.transaction.transaction.data.sender,
        pool,
        amount_in,
        amount_out,
        usd_volume,
        atob,
        coin_symbol: atob ? poolInfo.symbol_a : poolInfo.symbol_b, //for amount_in
        pairName: poolInfo.pairName,
        project,
        message: `Swap ${amount_in} ${atob ? poolInfo.symbol_a : poolInfo.symbol_b} to ${amount_out} ${atob ? poolInfo.symbol_b : poolInfo.symbol_a}. USD value: ${usd_volume} in Pool ${poolInfo.pairName} `
    })
}

async function recordMultiAssetEvent(event: SuiEvent, ctx: SuiContext) {
    //@ts-ignore
    const pool = event.parsedJson.pool_id

    const multiAssetPoolInfo: multiAssetPoolInfo = await helper.getOrCreateMultiAssetPool(ctx, pool)

    let project = ""
    let amounts_in: number[] = []
    let amounts_out: number[] = []
    let types_in: string[] = []
    let types_out: string[] = []
    let symbols_in: string[] = []
    let symbols_out: string[] = []

    if (event.type.includes(constant.AFTERMATH_SWAP_TYPE)) {
        //@ts-ignore
        for (let i = 0; i < event.parsedJson.amounts_in.length; i++) {
            //@ts-ignore
            const coinType = "0x" + event.parsedJson.types_in[i]
            types_in.push(coinType)
            //@ts-ignore
            const coinInfo = await getOrCreateCoin(ctx, coinType)
            //@ts-ignore
            const amount = Number(event.parsedJson.amounts_in[i]) / Math.pow(10, coinInfo.decimal)
            amounts_in.push(amount)
            symbols_in.push(coinInfo.symbol)
        }

        //@ts-ignore
        for (let i = 0; i < event.parsedJson.amounts_out.length; i++) {
            //@ts-ignore
            const coinType = "0x" + event.parsedJson.types_out[i]
            types_out.push(coinType)
            //@ts-ignore
            const coinInfo = await getOrCreateCoin(ctx, coinType)

            //@ts-ignore
            const amount = Number(event.parsedJson.amounts_out[i]) / Math.pow(10, coinInfo.decimal)
            amounts_out.push(amount)
            symbols_out.push(coinInfo.symbol)
        }

        project = "aftermath"
    }

    const usd_volume = await helper.calculateMultiAssetSwapVol_USD(ctx, multiAssetPoolInfo, types_in, types_out, symbols_in, symbols_out, amounts_in, amounts_out)

    try {
        ctx.eventLogger.emit("dex.swapEvents", {
            //@ts-ignore
            distinctId: ctx.transaction.transaction.data.sender,
            pool,
            usd_volume,
            pairName: multiAssetPoolInfo.pairName,
            project,
            message: `Swap ${JSON.stringify(amounts_in)} ${JSON.stringify(symbols_in)} to ${JSON.stringify(amounts_out)} ${JSON.stringify(symbols_out)}. USD value: ${usd_volume} in Pool ${multiAssetPoolInfo.pairName} `
        })
    }
    catch (e) {
        console.log(`${e.message} record error at ${ctx.transaction.digest} ${multiAssetPoolInfo.pool}`)
    }
}
