import { NonfungiblePositionManagerContext, NonfungiblePositionManagerProcessor, ApprovalEvent, ApprovalForAllEvent, getNonfungiblePositionManagerContractOnContext } from "./types/eth/nonfungiblepositionmanager.js";
import fs from 'fs'
import {getPriceByType, token} from "@sentio/sdk/utils";
import { ChainId } from "@sentio/chain";
import { getERC20TokenInfo } from "../../../node_modules/@sentio/sdk/lib/utils/token.js";
import { BigDecimal } from "@sentio/sdk";

// 0x00000000F43c5264bA236DD7a49224F1241858e4
const target = "0xe34139463bA50bD61336E0c446Bd8C0867c6fE65"
const NonFungibleManager = "0xC36442b4a4522E871399CD717aBDD847Ab11FE88"

let init = false
let fullPath = "/tmp/ids.txt"
const map = new Map<bigint, number>()

function addMap(id: bigint, blockNumber: number) {
    const encoding: BufferEncoding = 'utf8';

    if (!init) {
        try {
        const data  = fs.readFileSync(fullPath, encoding)
        const tempSet: Map<bigint, number> = new Map<bigint, number>(JSON.parse(data))
        for(const tempId of tempSet) {
            map.set(tempId[0], tempId[1])
        }
        console.log(`loading ${data} from file`)
        } catch(e) {
            console.log(e)
        }
        init = true
    } 
    
    map.set(id, blockNumber)
    const data = JSON.stringify(Array.from(map))
    console.log(`writng ${data} to file`)
    fs.writeFileSync(fullPath, data, {encoding})
}

function removeMap(id: bigint, blockNumber: number) {
    const encoding: BufferEncoding = 'utf8';

    if (!init) {
        try {
        const data  = fs.readFileSync(fullPath, encoding)
        const tempSet: Map<bigint, number> = new Map<bigint, number>(JSON.parse(data))
        for(const tempId of tempSet) {
            map.set(tempId[0], tempId[1])
        }
        console.log(`loading ${data} from file`)
        } catch(e) {
            console.log(e)
        }
        init = true
    } 
    if (map.has(id)) {
        map.delete(id)
        console.log(`removing ${id} from set`)
        const data = JSON.stringify(Array.from(map))
        console.log(`writng ${data} to file`)
        fs.writeFileSync(fullPath, data, {encoding})
    }
}


async function handleApproval(evt: ApprovalEvent, ctx: NonfungiblePositionManagerContext) {
    // calling this operator to make it consistent with approval for all
    const operator = evt.args.approved
    const tokenId = evt.args.tokenId
    const owner = evt.args.owner
    //TODO trying with 1 address
    if (operator.toLowerCase() == target.toLowerCase()) {
        addMap(tokenId, ctx.blockNumber)
        console.log(`adding ${tokenId} to set`)
    }

    ctx.eventLogger.emit("Approval", {
        message: `${owner} approves ${operator} for ${tokenId}`,
        operator,
        tokenId,
        owner,
        source: evt.name
    })
}

async function handleApprovalForAll(evt: ApprovalForAllEvent, ctx: NonfungiblePositionManagerContext) {
    const operator = evt.args.operator
    const approvedStatus = evt.args.approved
    const owner = evt.args.owner

    const contract = getNonfungiblePositionManagerContractOnContext(ctx, NonFungibleManager)
    const balance = await contract.balanceOf(owner)
    for (let i = 0; i < balance; i++) {

            const tokenId = await contract.tokenOfOwnerByIndex(owner, i)
            ctx.eventLogger.emit("Approval", {
                message: `${owner} approves ${operator} for ${tokenId}`,
                approved: operator,
                tokenId,
                owner,
                source: evt.name
            })
            if (operator.toLowerCase() == "0xF849de01B080aDC3A814FaBE1E2087475cF2E354".toLowerCase()) {
                addMap(tokenId, ctx.blockNumber)
                console.log(`adding ${tokenId} to set from approval for all`)
            }

    }

    ctx.eventLogger.emit("ApprovalForAll", {
        message: `${owner} changes setting as ${approvedStatus} for ${operator} `,
        approvedStatus,
        operator,
        owner
    })
}

async function handleBlock(blk: any, ctx: NonfungiblePositionManagerContext) {
    for (const entry of map) {
        // TODO: to get rid of this try, need to record block number when approve is emited, then check here if ctx.blockNumber is greater than the event block
        // try {
            if (entry[1] <= ctx.blockNumber) {
                const position = await ctx.contract.positions(entry[0])
                const operator = position.operator
                if (operator.toLowerCase() != target.toLowerCase()) {
                    removeMap(entry[0], ctx.blockNumber)
                    console.log(`removing ${entry[0]}: block ${ctx.blockNumber}, added block ${entry[1]}`)
                    console.log(position)
                    continue
                } 

                const price0 = await getPriceByType(ctx.chainId, position.token0, ctx.timestamp)
                const price1 = await getPriceByType(ctx.chainId, position.token1, ctx.timestamp)
                let token0, token1

                try {
                    token0 = await getERC20TokenInfo(ctx.chainId, position.token0)
                    token1 = await getERC20TokenInfo(ctx.chainId, position.token1)
                } catch (e) {
                    console.log(position)
                    console.log(entry)
                    console.log(e)
                }
                let usdValue0: BigDecimal, usdValue1: BigDecimal
                if (price0 && token0) {
                 usdValue0 = position.tokensOwed0.scaleDown(token0.decimal).multipliedBy(price0)
                } else {
                    usdValue0 = BigDecimal(0)
                }
                if (price1 && token1) {
                    usdValue1 = position.tokensOwed1.scaleDown(token1.decimal).multipliedBy(price1)
                } else {
                    usdValue1 = BigDecimal(0)
                }

                ctx.eventLogger.emit("positionInfo", {
                    nonce: position.nonce,
                    operator: position.operator,
                    token0: position.token0,
                    token1: position.token1,
                    fee: position.fee,
                    tickLower: position.tickLower,
                    tickUpper: position.tickUpper,
                    liquidity: position.liquidity,
                    // feeGrowthInside0LastX128: position.feeGrowthInside0LastX128,
                    // feeGrowthInside1LastX128: position.feeGrowthInside1LastX128,
                    tokensOwed0: position.tokensOwed0,
                    tokensOwed1: position.tokensOwed1,
                    tokenId: entry[0],
                    price0,
                    price1,
                    usdValue0,
                    usdValue1,
                    usdValue: usdValue0.plus(usdValue1)
                })

            }
        // } catch(e) {
        //     console.log(e)
        // }
    }
}

const approved = "0xce2c952b27fcc41f868bdc32c9411f0759378ed0".toLowerCase()
const approvedArb = "0x00000000F43c5264bA236DD7a49224F1241858e4".toLowerCase()

const approvalFilter = NonfungiblePositionManagerProcessor.filters.Approval(null, approved, null)
const approvalForAllFilter = NonfungiblePositionManagerProcessor.filters.ApprovalForAll(null, approved, null)

const approvalFilterArb = NonfungiblePositionManagerProcessor.filters.Approval(null, approvedArb, null)
const approvalForAllFilterArb = NonfungiblePositionManagerProcessor.filters.ApprovalForAll(null, approvedArb, null)


NonfungiblePositionManagerProcessor.bind({ address: NonFungibleManager
, startBlock: 16000000
})
.onEventApproval(handleApproval)
.onEventApprovalForAll(handleApprovalForAll)
.onTimeInterval(handleBlock)

// NonfungiblePositionManagerProcessor.bind({ address: NonFungibleManager
//     , startBlock: 106527265
//     , network: ChainId.ARBITRUM
// })
// .onEventApproval(handleApproval)
// .onEventApprovalForAll(handleApprovalForAll)
// .onTimeInterval(handleBlock)
