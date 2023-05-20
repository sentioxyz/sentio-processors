import { SwapContext } from "../types/eth/swap.js"
import { EthChainId } from "@sentio/sdk"

import { getPriceBySymbol } from "@sentio/sdk/utils"

import { getERC20Contract } from '@sentio/sdk/eth/builtin/erc20';

export const Gauge_3FER_TVL = async (_: any, ctx: SwapContext) => {
    const poolName = "Ferro DAI/USDC/USDT"
    const DAI_balance = Number(await getERC20Contract(EthChainId.CRONOS, "0xF2001B145b43032AAF5Ee2884e456CCd805F677D").balanceOf(constant.SWAP_3FER)) / Math.pow(10, 18)
    const USDT_balance = Number(await getERC20Contract(EthChainId.CRONOS, "0xc21223249CA28397B4B6541dfFaEcC539BfF0c59").balanceOf(constant.SWAP_3FER)) / Math.pow(10, 6)
    const USDC_balance = Number(await getERC20Contract(EthChainId.CRONOS, "0xc21223249CA28397B4B6541dfFaEcC539BfF0c59").balanceOf(constant.SWAP_3FER)) / Math.pow(10, 6)
    const DAI_price = Number(await getPriceBySymbol("DAI", ctx.timestamp))
    const USDT_price = Number(await getPriceBySymbol("USDT", ctx.timestamp))
    const USDC_price = Number(await getPriceBySymbol("USDC", ctx.timestamp))
    const tvl_DAI = DAI_balance * DAI_price
    const tvl_USDT = USDT_balance * USDT_price
    const tvl_USDC = USDC_balance * USDC_price
    const tvl = DAI_balance * DAI_price + USDT_balance * USDT_price + USDC_balance * USDC_price
    ctx.meter.Gauge("tvl").record(tvl_DAI, { poolName, coin_symbol: "DAI" })
    ctx.meter.Gauge("tvl").record(tvl_USDT, { poolName, coin_symbol: "USDT" })
    ctx.meter.Gauge("tvl").record(tvl_USDC, { poolName, coin_symbol: "USDC" })
    ctx.meter.Gauge("totalTVL").record(tvl, { poolName })
}

export const Gauge_2FER_TVL = async (_: any, ctx: SwapContext) => {
    const poolName = "Ferro USDC/USDT"
    const USDT_balance = Number(await getERC20Contract(EthChainId.CRONOS, "0xc21223249CA28397B4B6541dfFaEcC539BfF0c59").balanceOf(constant.SWAP_2FER)) / Math.pow(10, 6)
    const USDC_balance = Number(await getERC20Contract(EthChainId.CRONOS, "0xc21223249CA28397B4B6541dfFaEcC539BfF0c59").balanceOf(constant.SWAP_2FER)) / Math.pow(10, 6)
    const USDT_price = Number(await getPriceBySymbol("USDT", ctx.timestamp))
    const USDC_price = Number(await getPriceBySymbol("USDC", ctx.timestamp))
    const tvl_USDT = USDT_balance * USDT_price
    const tvl_USDC = USDC_balance * USDC_price
    const tvl = tvl_USDT + tvl_USDC
    ctx.meter.Gauge("tvl").record(tvl_USDT, { poolName, coin_symbol: "USDT" })
    ctx.meter.Gauge("tvl").record(tvl_USDC, { poolName, coin_symbol: "USDC" })
    ctx.meter.Gauge("totalTVL").record(tvl, { poolName })
}

export const Gauge_LCRO_WCRO_TVL = async (_: any, ctx: SwapContext) => {
    const poolName = "Ferro LCRO/WCRO"
    const LCRO_balance = Number(await getERC20Contract(EthChainId.CRONOS, "0x9Fae23A2700FEeCd5b93e43fDBc03c76AA7C08A6").balanceOf(constant.SWAP_LCRO_WCRO)) / Math.pow(10, 18)
    const WCRO_balance = Number(await getERC20Contract(EthChainId.CRONOS, "0x5C7F8A570d578ED84E63fdFA7b1eE72dEae1AE23").balanceOf(constant.SWAP_LCRO_WCRO)) / Math.pow(10, 18)
    const LCRO_price = Number(await getPriceBySymbol("USDT", ctx.timestamp))
    const WCRO_price = Number(await getPriceBySymbol("USDC", ctx.timestamp))
    const tvl_LCRO = LCRO_balance * LCRO_price
    const tvl_WCRO = WCRO_balance * WCRO_price
    const tvl = tvl_LCRO + tvl_WCRO
    ctx.meter.Gauge("tvl").record(tvl_LCRO, { poolName, coin_symbol: "LCRO" })
    ctx.meter.Gauge("tvl").record(tvl_WCRO, { poolName, coin_symbol: "WCRO" })
    ctx.meter.Gauge("totalTVL").record(tvl, { poolName })
}