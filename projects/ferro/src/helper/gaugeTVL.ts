import { SwapContext } from "../types/eth/swap.js"
import { EthChainId } from "@sentio/sdk"
import * as constant from "../constant.js"

import { getPriceBySymbol } from "@sentio/sdk/utils"
import { getERC20Contract } from '@sentio/sdk/eth/builtin/erc20';

export const Gauge_3FER_TVL = async (_: any, ctx: SwapContext) => {
    try {
        const poolName = "Ferro DAI/USDC/USDT"
        const DAI_balance = Number(await getERC20Contract(EthChainId.CRONOS, "0xF2001B145b43032AAF5Ee2884e456CCd805F677D").balanceOf(constant.SWAP_3FER, { blockTag: Number(ctx.blockNumber) })) / Math.pow(10, 18)
        const USDT_balance = Number(await getERC20Contract(EthChainId.CRONOS, "0xc21223249CA28397B4B6541dfFaEcC539BfF0c59").balanceOf(constant.SWAP_3FER, { blockTag: Number(ctx.blockNumber) })) / Math.pow(10, 6)
        const USDC_balance = Number(await getERC20Contract(EthChainId.CRONOS, "0xc21223249CA28397B4B6541dfFaEcC539BfF0c59").balanceOf(constant.SWAP_3FER, { blockTag: Number(ctx.blockNumber) })) / Math.pow(10, 6)
        const DAI_price = Number(await getPriceBySymbol("DAI", ctx.timestamp))
        const USDT_price = Number(await getPriceBySymbol("USDT", ctx.timestamp))
        const USDC_price = Number(await getPriceBySymbol("USDC", ctx.timestamp))
        const tvl_DAI = DAI_balance * DAI_price
        const tvl_USDT = USDT_balance * USDT_price
        const tvl_USDC = USDC_balance * USDC_price
        const tvl = DAI_balance * DAI_price + USDT_balance * USDT_price + USDC_balance * USDC_price
        ctx.meter.Gauge("tvl").record(tvl_DAI, { poolName, coin_symbol: "DAI", project: "ferro" })
        ctx.meter.Gauge("tvl").record(tvl_USDT, { poolName, coin_symbol: "USDT", project: "ferro" })
        ctx.meter.Gauge("tvl").record(tvl_USDC, { poolName, coin_symbol: "USDC", project: "ferro" })
        ctx.meter.Gauge("totalTVL").record(tvl, { poolName, project: "ferro" })
    }
    catch (e) { console.log(`gauge 3fer tvl error at ${ctx.transactionHash}`) }
}

export const Gauge_2FER_TVL = async (_: any, ctx: SwapContext) => {
    try {
        const poolName = "Ferro USDC/USDT"
        const USDT_balance = Number(await getERC20Contract(EthChainId.CRONOS, "0x66e428c3f67a68878562e79A0234c1F83c208770").balanceOf(constant.SWAP_2FER, { blockTag: Number(ctx.blockNumber) })) / Math.pow(10, 6)
        const USDC_balance = Number(await getERC20Contract(EthChainId.CRONOS, "0xc21223249CA28397B4B6541dfFaEcC539BfF0c59").balanceOf(constant.SWAP_2FER, { blockTag: Number(ctx.blockNumber) })) / Math.pow(10, 6)
        const USDT_price = Number(await getPriceBySymbol("USDT", ctx.timestamp))
        const USDC_price = Number(await getPriceBySymbol("USDC", ctx.timestamp))
        const tvl_USDT = USDT_balance * USDT_price
        const tvl_USDC = USDC_balance * USDC_price
        const tvl = tvl_USDT + tvl_USDC
        ctx.meter.Gauge("tvl").record(tvl_USDT, { poolName, coin_symbol: "USDT", project: "ferro" })
        ctx.meter.Gauge("tvl").record(tvl_USDC, { poolName, coin_symbol: "USDC", project: "ferro" })
        ctx.meter.Gauge("totalTVL").record(tvl, { poolName, project: "ferro" })
    }
    catch (e) { console.log(`gauge 2fer tvl error at ${ctx.transactionHash}`) }
}

export const Gauge_LCRO_WCRO_TVL = async (_: any, ctx: SwapContext) => {
    try {
        const poolName = "Ferro LCRO/WCRO"
        const LCRO_balance = Number(await getERC20Contract(EthChainId.CRONOS, "0x9Fae23A2700FEeCd5b93e43fDBc03c76AA7C08A6").balanceOf(constant.SWAP_LCRO_WCRO, { blockTag: Number(ctx.blockNumber) })) / Math.pow(10, 18)
        const WCRO_balance = Number(await getERC20Contract(EthChainId.CRONOS, "0x5C7F8A570d578ED84E63fdFA7b1eE72dEae1AE23").balanceOf(constant.SWAP_LCRO_WCRO, { blockTag: Number(ctx.blockNumber) })) / Math.pow(10, 18)
        const LCRO_price = Number(await getPriceBySymbol("LCRO", ctx.timestamp))
        const WCRO_price = Number(await getPriceBySymbol("CRO", ctx.timestamp))
        const tvl_LCRO = LCRO_balance * LCRO_price
        const tvl_WCRO = WCRO_balance * WCRO_price
        const tvl = tvl_LCRO + tvl_WCRO
        ctx.meter.Gauge("tvl").record(tvl_LCRO, { poolName, coin_symbol: "LCRO", project: "ferro" })
        ctx.meter.Gauge("tvl").record(tvl_WCRO, { poolName, coin_symbol: "CRO", project: "ferro" })
        ctx.meter.Gauge("totalTVL").record(tvl, { poolName, project: "ferro" })
    }
    catch (e) { console.log(`gauge lcro-wcro tvl error at ${ctx.transactionHash}`) }
}

export const Gauge_LATOM_ATOM_TVL = async (_: any, ctx: SwapContext) => {
    try {
        const poolName = "Ferro LATOM/ATOM"
        const LATOM_balance = Number(await getERC20Contract(EthChainId.CRONOS, "0xAC974ee7fc5d083112c809cCb3FCe4a4F385750D").balanceOf(constant.SWAP_LATOM_ATOM, { blockTag: Number(ctx.blockNumber) })) / Math.pow(10, 6)
        const ATOM_balance = Number(await getERC20Contract(EthChainId.CRONOS, "0xB888d8Dd1733d72681b30c00ee76BDE93ae7aa93").balanceOf(constant.SWAP_LATOM_ATOM, { blockTag: Number(ctx.blockNumber) })) / Math.pow(10, 6)
        const LATOM_price = Number(await getPriceBySymbol("LATOM", ctx.timestamp))
        const ATOM_price = Number(await getPriceBySymbol("ATOM", ctx.timestamp))
        const tvl_LATOM = LATOM_balance * LATOM_price
        const tvl_AOTM = ATOM_balance * ATOM_price
        const tvl = tvl_LATOM + tvl_AOTM
        ctx.meter.Gauge("tvl").record(tvl_LATOM, { poolName, coin_symbol: "LATOM", project: "ferro" })
        ctx.meter.Gauge("tvl").record(tvl_AOTM, { poolName, coin_symbol: "ATOM", project: "ferro" })
        ctx.meter.Gauge("totalTVL").record(tvl, { poolName, project: "ferro" })
    }
    catch (e) { console.log(`gauge latom-atom tvl error at ${ctx.transactionHash}`) }
}


