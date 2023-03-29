import { Counter, Gauge } from '@sentio/sdk'
import { ERC20Processor } from '@sentio/sdk/eth/builtin'
import {RewardProcessor, RewardContext} from './types/eth/reward.js'
import {DepositProcessor, DepositContext} from './types/eth/deposit.js'
import {getPriceByType, token} from "@sentio/sdk/utils";


// Define a constant string array for reward contracts.
const rewardContracts = [
    "0x0A760466E1B4621579a82a39CB56Dda2F4E70f03",
    "0x0A760466E1B4621579a82a39CB56Dda2F4E70f03",
    "0xB900EF131301B307dB5eFcbed9DBb50A3e209B2e",
    "0x9D5C5E364D81DaB193b72db9E9BE9D8ee669B652",
    "0x1A8D59cCbbC81ecD556B86969680faD2F238F18f",
    "0xbD5445402B0a287cbC77cb67B2a52e2FC635dce4"
]


export const volOptions = {
    sparse: true,
    aggregationConfig: {
        intervalInMinutes: [60],
        // discardOrigin: false
    }
}

// define gauge for stake
const stake = Gauge.register("vol", volOptions)
const rewardG = Gauge.register("reward", volOptions)

// define map for token
let tokenMap = new Map<string, Promise<token.TokenInfo | undefined>>()

async function getTokenInfo(address: string, chainID: string): Promise<token.TokenInfo | undefined> {
    if (address !== "0x0000000000000000000000000000000000000000") {
        try {
            return await token.getERC20TokenInfo(chainID, address)
        } catch(e) {
            console.log("rpc token is undefined", address, chainID, e)
            return undefined
        }
    } else {
        return token.NATIVE_ETH
    }
}

async function getOrCreateToken(chainID:string, token: string) : Promise<token.TokenInfo | undefined>{
    let infoPromise = tokenMap.get(token)
    if (!infoPromise) {
        infoPromise = getTokenInfo(token, chainID)
        tokenMap.set(token, infoPromise)
    }
    return infoPromise
}

// define map for pools
let poolMap = new Map<bigint, Promise<
    [string, string, string, string, string, boolean] & {
    lptoken: string;
    token: string;
    gauge: string;
    crvRewards: string;
    stash: string;
    shutdown: boolean;
} | undefined
>>()

async function getPool(poolID: bigint, ctx: DepositContext):  Promise<
    [string, string, string, string, string, boolean] & {
    lptoken: string;
    token: string;
    gauge: string;
    crvRewards: string;
    stash: string;
    shutdown: boolean;
} | undefined
> {
    try {
        return await ctx.contract.poolInfo(poolID)
    } catch(e) {
        console.log(e, poolID)
        return undefined
    }
}

async function getOrCreatePool(ctx:DepositContext, poolID: bigint) : Promise<
    [string, string, string, string, string, boolean] & {
    lptoken: string;
    token: string;
    gauge: string;
    crvRewards: string;
    stash: string;
    shutdown: boolean;
} | undefined
>{
    let infoPromise = poolMap.get(poolID)
    if (!infoPromise) {
        infoPromise = getPool(poolID, ctx)
        poolMap.set(poolID, infoPromise)
    }
    return infoPromise
}

DepositProcessor.bind({address: "0xF403C135812408BFbE8713b5A23a04b3D48AAE31"})
    .onEventDeposited(async (evt, ctx)=>{
        const poolID = evt.args.poolid
        const poolInfo = await getOrCreatePool(ctx, poolID)
        if (poolInfo === undefined) {
            console.log("poolInfo is undefined", poolID)
            return
        }
        const tokenInfo = await getOrCreateToken(ctx.chainId.toString(), poolInfo.lptoken)
        if (tokenInfo === undefined) {
            console.log("tokenInfo is undefined", poolInfo.token)
            return
        }
        const scaledAmount = evt.args.amount.scaleDown(tokenInfo.decimal)
        stake.record(ctx, scaledAmount, {action: "deposit", token: poolInfo.lptoken, symbol: tokenInfo.symbol})
        ctx.eventLogger.emit("deposit", {
            distinctId: evt.args.user,
            token: poolInfo.token,
            lpToken: poolInfo.lptoken,
            amount: scaledAmount,
        })
    })
    .onEventWithdrawn(async (evt, ctx)=>{
        const poolID = evt.args.poolid
        const poolInfo = await getOrCreatePool(ctx, poolID)
        if (poolInfo === undefined) {
            console.log("poolInfo is undefined", poolID)
            return
        }
        const tokenInfo = await getOrCreateToken(ctx.chainId.toString(), poolInfo.lptoken)
        if (tokenInfo === undefined) {
            console.log("tokenInfo is undefined", poolInfo.token)
            return
        }
        const scaledAmount = evt.args.amount.scaleDown(tokenInfo.decimal)
        stake.record(ctx, scaledAmount, {action: "withdraw", token: poolInfo.lptoken, symbol: tokenInfo.symbol})
        ctx.eventLogger.emit("withdraw", {
            distinctId: evt.args.user,
            token: poolInfo.token,
            lpToken: poolInfo.lptoken,
            amount: scaledAmount,
        })
    })

for (const reward of rewardContracts) {
    RewardProcessor.bind({address: reward})
        .onEventRewardPaid(async (evt, ctx) => {
            const token = await ctx.contract.rewardToken()
            const tokenInfo = await getOrCreateToken(ctx.chainId.toString(), token)
            if (tokenInfo === undefined) {
                console.log("tokenInfo is undefined", token)
                return
            }
            const scaledAmount = evt.args.reward.scaleDown(tokenInfo.decimal)
            rewardG.record(ctx, scaledAmount, {action: "reward", token: token, symbol: tokenInfo.symbol})
            ctx.eventLogger.emit("reward", {
                distinctId: evt.args.user,
                amount: scaledAmount,
                token: tokenInfo.symbol,
            })
        })
}