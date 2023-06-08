import { FulContext } from "../types/eth/ful.js"
import { VaultContext } from "../types/eth/vault.js"
import { WhitelistTokenMap, FUL, sFUL, esFUL, vFLP, vFUL, VAULT, FUL_MANAGER, REWARD_ROUTER } from './constant.js'
import { getERC20ContractOnContext } from "@sentio/sdk/eth/builtin/erc20"


//gauge each asset in pool
export const gaugeTokenAum = async (_: any, ctx: VaultContext) => {
    for (let address in WhitelistTokenMap) {
        try {
            const tokenAum = Number(await getERC20ContractOnContext(ctx, address).balanceOf(VAULT)) / Math.pow(10, WhitelistTokenMap[address].decimal)
            console.log("tokenAum", tokenAum, WhitelistTokenMap[address].decimal, WhitelistTokenMap[address].symbol, ctx.timestamp)
            ctx.meter.Gauge("tokenAum").record(tokenAum, { coin_symbol: WhitelistTokenMap[address].symbol })
        } catch (e) { console.log(`gauge token aum error ${WhitelistTokenMap[address].symbol} ${ctx.timestamp}`) }
    }
}

//gauge staked asset balance 
export const gaugeStakedAssets = async (_: any, ctx: FulContext) => {
    //record staked ful amount using ful.balanceOf(sFUL)
    try {
        const stakedFul = Number(await getERC20ContractOnContext(ctx, FUL).balanceOf(sFUL)) / Math.pow(10, 18)
        ctx.meter.Gauge("stakedFul").record(stakedFul)
    } catch (e) { console.log(`get stake ful amount error ${ctx.timestamp}`) }
    //record staked esFUL
    try {
        const stakedesFUL = Number(await getERC20ContractOnContext(ctx, esFUL).balanceOf(sFUL)) / Math.pow(10, 18)
        ctx.meter.Gauge("stakedesFUL").record(stakedesFUL)
    } catch (e) { console.log(`get staked esFul error ${ctx.timestamp}`) }
    //record vested esFUL in vFLP
    try {
        const vested_FLP = Number(await getERC20ContractOnContext(ctx, esFUL).balanceOf(vFLP)) / Math.pow(10, 18)
        ctx.meter.Gauge("vFLP").record(vested_FLP)
    } catch (e) { console.log(`get vested esFUL in vFLP error ${ctx.timestamp}`) }
    //record vested esFUL in vFUL
    try {
        const vested_FUL = Number(await getERC20ContractOnContext(ctx, esFUL).balanceOf(vFUL)) / Math.pow(10, 18)
        ctx.meter.Gauge("vFUL").record(vested_FUL)
    } catch (e) { console.log(`get vested esFUL in FUL error ${ctx.timestamp}`) }
}