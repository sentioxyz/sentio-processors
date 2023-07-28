import { NonfungiblePositionManagerContext, NonfungiblePositionManagerProcessor, ApprovalEvent, ApprovalForAllEvent, getNonfungiblePositionManagerContractOnContext } from "./types/eth/nonfungiblepositionmanager.js";
import fs from 'fs'
import {getPriceByType, token} from "@sentio/sdk/utils";
import { ChainId } from "@sentio/chain";
import { getERC20TokenInfo } from "../../../node_modules/@sentio/sdk/lib/utils/token.js";
import { BigDecimal } from "@sentio/sdk";
import { PoolContext, PoolProcessor } from "./types/eth/pool.js";
import { EthChainId, EthContext, TypedEvent } from "@sentio/sdk/eth";

// 0x00000000Ede6d8D217c60f93191C060747324bca
const target = "0x00000000Ede6d8D217c60f93191C060747324bca"
const NonFungibleManager = "0xC36442b4a4522E871399CD717aBDD847Ab11FE88"
const USDC_WETH_POOL = "0x88e6a0c2ddd26feeb64f039a2c41296fcb3f5640"

type PositionInfo =     [
    bigint,
    string,
    string,
    string,
    bigint,
    bigint,
    bigint,
    bigint,
    bigint,
    bigint,
    bigint,
    bigint
  ] & {
    nonce: bigint;
    operator: string;
    token0: string;
    token1: string;
    fee: bigint;
    tickLower: bigint;
    tickUpper: bigint;
    liquidity: bigint;
    feeGrowthInside0LastX128: bigint;
    feeGrowthInside1LastX128: bigint;
    tokensOwed0: bigint;
    tokensOwed1: bigint;
  }

let init = false
let idPath = "/tmp/ids.txt"
let addressPath = "/tmp/addresses.txt"


const idMap = new Map<bigint, number>()
const addressMap = new Map<string, number>()


function addIdMap(id: bigint, blockNumber: number) {
    const encoding: BufferEncoding = 'utf8';

    if (!init) {
        try {
        const data  = fs.readFileSync(idPath, encoding)
        const tempSet: Map<bigint, number> = new Map<bigint, number>(JSON.parse(data))
        for(const tempId of tempSet) {
            idMap.set(tempId[0], tempId[1])
        }
        console.log(`loading ${data} from file for ids`)
        } catch(e) {
            console.log(e)
        }
        init = true
    } 
    
    idMap.set(id, blockNumber)
    const data = JSON.stringify(Array.from(idMap))
    console.log(`writng ${data} to file`)
    fs.writeFileSync(idPath, data, {encoding})
}

function addAddressMap(owner: string, blockNumber: number) {
    const encoding: BufferEncoding = 'utf8';

    if (!init) {
        try {
        const data  = fs.readFileSync(addressPath, encoding)
        const tempSet: Map<string, number> = new Map<string, number>(JSON.parse(data))
        for(const tempAddress of tempSet) {
            addressMap.set(tempAddress[0], tempAddress[1])
        }
        console.log(`loading ${data} from file for addresses`)
        } catch(e) {
            console.log(e)
        }
        init = true
    } 
    
    addressMap.set(owner, blockNumber)
    const data = JSON.stringify(Array.from(addressMap))
    console.log(`writng ${data} to file`)
    fs.writeFileSync(addressPath, data, {encoding})
}

function removeIdMap(id: bigint, blockNumber: number) {
    const encoding: BufferEncoding = 'utf8';

    if (!init) {
        try {
            const data  = fs.readFileSync(idPath, encoding)
            const tempSet: Map<bigint, number> = new Map<bigint, number>(JSON.parse(data))
            for(const tempId of tempSet) {
                idMap.set(tempId[0], tempId[1])
        }
        console.log(`loading ${data} from file`)
        } catch(e) {
            console.log(e)
        }
        init = true
    } 
    if (idMap.has(id)) {
        idMap.delete(id)
        console.log(`removing ${id} from set`)
        const data = JSON.stringify(Array.from(idMap))
        console.log(`writng ${data} to file`)
        fs.writeFileSync(idPath, data, {encoding})
    }
}

function removeAddressMap(owner: string, blockNumber: number) {
    const encoding: BufferEncoding = 'utf8';

    if (!init) {
        try {
        const data  = fs.readFileSync(addressPath, encoding)
        const tempSet: Map<string, number> = new Map<string, number>(JSON.parse(data))
        for(const tempAddress of tempSet) {
            addressMap.set(tempAddress[0], tempAddress[1])
        }
        console.log(`loading ${data} from file for addresses`)
        } catch(e) {
            console.log(e)
        }
        init = true
    } 
    if (addressMap.has(owner)) {
        if (addressMap.get(owner)! < blockNumber) {
            addressMap.delete(owner)
            console.log(`removing ${owner} from set`)
            const data = JSON.stringify(Array.from(addressMap))
            console.log(`writng ${data} to file`)
            fs.writeFileSync(addressPath, data, {encoding})
        }
    }
}


async function handleApproval(evt: ApprovalEvent, ctx: NonfungiblePositionManagerContext) {
    // calling this operator to make it consistent with approval for all
    const operator = evt.args.approved
    const tokenId = evt.args.tokenId
    const owner = evt.args.owner
    //TODO trying with 1 address
    if (operator.toLowerCase() == target.toLowerCase()) {
        addIdMap(tokenId, ctx.blockNumber)
        console.log(`adding ${tokenId} to set`)
        const contract = getNonfungiblePositionManagerContractOnContext(ctx, NonFungibleManager)
        const position = await contract.positions(tokenId)
        await emitPositionInfo(position, tokenId, ctx)
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

    if (operator.toLowerCase() == target.toLowerCase()) {
        addAddressMap(owner, ctx.blockNumber)
        // instantly fetch all position info when 
        const contract = getNonfungiblePositionManagerContractOnContext(ctx, NonFungibleManager)
        const balance = await contract.balanceOf(owner)
        for (let i = 0; i < balance; i++) {
            const tokenId = await contract.tokenOfOwnerByIndex(owner, i)

            const position = await contract.positions(tokenId)
            await emitPositionInfo(position, Number(tokenId), ctx)

        }
    } else {
        removeAddressMap(owner, ctx.blockNumber)
    }

    // const contract = getNonfungiblePositionManagerContractOnContext(ctx, NonFungibleManager)
    // const balance = await contract.balanceOf(owner)
    // for (let i = 0; i < balance; i++) {

    //         const tokenId = await contract.tokenOfOwnerByIndex(owner, i)
    //         ctx.eventLogger.emit("Approval", {
    //             message: `${owner} approves ${operator} for ${tokenId}`,
    //             approved: operator,
    //             tokenId,
    //             owner,
    //             source: evt.name
    //         })
    //         if (operator.toLowerCase() == "0xF849de01B080aDC3A814FaBE1E2087475cF2E354".toLowerCase()) {
    //             addIdMap(tokenId, ctx.blockNumber)
    //             console.log(`adding ${tokenId} to set from approval for all`)
    //         }

    // }

    ctx.eventLogger.emit("ApprovalForAll", {
        message: `${owner} changes setting as ${approvedStatus} for ${operator} `,
        approvedStatus,
        operator,
        owner
    })
}

async function handleBlock(blk: any, ctx: NonfungiblePositionManagerContext) {
    const afaMap = new Map<bigint, number>()
    const contract = getNonfungiblePositionManagerContractOnContext(ctx, NonFungibleManager)

    for (const entry of addressMap) {
        const owner = entry[0]
        const balance = await contract.balanceOf(owner)
        for (let i = 0; i < balance; i++) {
            if (entry[1] <= ctx.blockNumber) {
                const tokenId = await contract.tokenOfOwnerByIndex(owner, i)
                const position = await ctx.contract.positions(tokenId)
                const operator = position.operator
                await emitPositionInfo(position, tokenId, ctx) 
                afaMap.set(tokenId, entry[1])
            }   
        }
    }

    for (const entry of idMap) {
        // TODO: to get rid of this try, need to record block number when approve is emited, then check here if ctx.blockNumber is greater than the event block
        // try {
            //skip if this tokenId has already been processed in afaMap
            if (afaMap.has(entry[0])) {
                continue
            }
            if (entry[1] <= ctx.blockNumber) {
                const position = await ctx.contract.positions(entry[0])
                const operator = position.operator
                if (operator.toLowerCase() != target.toLowerCase()) {
                    removeIdMap(entry[0], ctx.blockNumber)
                    console.log(`removing ${entry[0]}: block ${ctx.blockNumber}, added block ${entry[1]}`)
                    // console.log(position)
                    continue
                } 
                await emitPositionInfo(position, entry[1], ctx)
            }
        // } catch(e) {
        //     console.log(e)
        // }
    }
}
async function emitPositionInfo(position: PositionInfo, tokenId: number | bigint, ctx: EthContext) {
    const price0 = await getPriceByType(ctx.chainId, position.token0, ctx.timestamp)
    const price1 = await getPriceByType(ctx.chainId, position.token1, ctx.timestamp)
    let token0, token1

    try {
        token0 = await getERC20TokenInfo(ctx.chainId, position.token0)
        token1 = await getERC20TokenInfo(ctx.chainId, position.token1)
    } catch (e) {
        console.log("error retrieving token info")
        console.log(position)
        console.log(e)
    }
    let usdValue0: BigDecimal, usdValue1: BigDecimal
    if (price0 && token0) {
        usdValue0 = position.tokensOwed0.scaleDown(token0.decimal).multipliedBy(price0)
    } else {
        usdValue0 = BigDecimal(0)
        console.log("token0:")
        console.log(token0)
        console.log(price0)
    }
    if (price1 && token1) {
        usdValue1 = position.tokensOwed1.scaleDown(token1.decimal).multipliedBy(price1)
    } else {
        usdValue1 = BigDecimal(0)
        console.log("token1:")
        console.log(token1)
        console.log(price1)
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
        tokenId: tokenId,
        price0,
        price1,
        usdValue0,
        usdValue1,
        usdValue: usdValue0.plus(usdValue1),
    })

}

async function poolEventHandler(evt: TypedEvent<any, any>, ctx: PoolContext) {
    const args = evt.args.toObject()
    const name = evt.name

    ctx.eventLogger.emit(name, args)
}

const approved = "0xce2c952b27fcc41f868bdc32c9411f0759378ed0".toLowerCase()
const approvedArb = "0x00000000F43c5264bA236DD7a49224F1241858e4".toLowerCase()

const approvalFilter = NonfungiblePositionManagerProcessor.filters.Approval(null, approved, null)
const approvalForAllFilter = NonfungiblePositionManagerProcessor.filters.ApprovalForAll(null, approved, null)

const approvalFilterArb = NonfungiblePositionManagerProcessor.filters.Approval(null, approvedArb, null)
const approvalForAllFilterArb = NonfungiblePositionManagerProcessor.filters.ApprovalForAll(null, approvedArb, null)


// NonfungiblePositionManagerProcessor.bind({ address: NonFungibleManager
// , startBlock: 16000000
// })
// .onEventApproval(handleApproval)
// .onEventApprovalForAll(handleApprovalForAll)
// .onTimeInterval(handleBlock)

PoolProcessor.bind({address: USDC_WETH_POOL
, startBlock: 17000000
})
.onEvent(poolEventHandler)

NonfungiblePositionManagerProcessor.bind({ address: NonFungibleManager
    , startBlock: 106527265
    , network: EthChainId.ARBITRUM
})
.onEventApproval(handleApproval)
.onEventApprovalForAll(handleApprovalForAll)
.onTimeInterval(handleBlock, 60*4, 60*4)


