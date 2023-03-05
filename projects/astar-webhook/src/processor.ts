import {CHAIN_IDS, Counter, Exporter, Gauge} from '@sentio/sdk'
import { ERC20Processor } from '@sentio/sdk/eth/builtin'
import { getPriceBySymbol,  token } from "@sentio/sdk/utils"

const tokenWatching = [
"0x5271D85CE4241b310C0B34b7C2f1f036686A6d7C",
"0xAeaaf0e2c81Af264101B9129C00F4440cCF0F720",
"0xfFffFffF00000000000000010000000000000007",
"0x1fE622E91e54D6AD00B01917351Ea6081426764A",
"0xE511ED88575C57767BAfb72BfD10775413E3F2b0",
"0xfFFFFfFF00000000000000010000000000000001",
"0xf27Ee99622C3C9b264583dACB2cCE056e194494f",
"0xDe2578Edec4669BA7F41c5d5D2386300bcEA4678",
"0xffFfffFF00000000000000010000000000000005",
"0xffFFffFF00000000000000010000000000000006",
"0xfffFFfFF00000000000000010000000000000003",
"0xfFFfFFfF00000000000000010000000000000000",
"0xFFfFfFffFFfffFFfFFfFFFFFffFFFffffFfFFFfF",
"0xffFFFfFF00000000000000010000000000000004",
"0x3795C36e7D12A8c252A20C5a7B455f7c57b60283",
"0x998082C488e548820F970Df5173bD2061Ce90635",
"0x733ebcC6DF85f8266349DEFD0980f8Ced9B45f35",
"0x75364D4F779d0Bd0facD9a218c67f87dD9Aff3b4",
"0xc4335B1b76fA6d52877b3046ECA68F6E708a27dd",
"0x431D5dfF03120AFA4bDf332c61A6e1766eF37BDB"]

let tokenInfoMap = new Map<string, Promise<token.TokenInfo>>()

const exporter = Exporter.register('astar', 'astar-alert')

async function getTokenInfo(address: string): Promise<token.TokenInfo> {

    try {
      return await token.getERC20TokenInfo(address, 592)
    } catch (error) {
      console.log(error, address)
      return token.NATIVE_ETH
    }
}

async function getOrCreateToken(address: string) : Promise<token.TokenInfo> {
    let infoPromise = tokenInfoMap.get(address)
    if (!infoPromise) {
        infoPromise = getTokenInfo(address)
        tokenInfoMap.set(address, infoPromise)
        console.log("getOrCreateToken:", address)
    }
    return await infoPromise
}

for (const token of tokenWatching) {
  ERC20Processor.bind({ address: token , network: CHAIN_IDS.ASTAR, startBlock: 3050000})
      .onEventTransfer(
    async (event, ctx) => {
        let token = await getOrCreateToken(ctx.address)
        const token0Price = (await getPriceBySymbol(token.symbol, ctx.timestamp, { toleranceInDays: 365 }))!
        if (token0Price == null) {
            console.log("token0Price is null", token.symbol)
            return
        }
        const amount = event.args.value.scaleDown(token.decimal)
        const value = amount.multipliedBy(token0Price)
        ctx.eventLogger.emit("transfer", {
            symbol: token.symbol,
            from: event.args.from,
            to: event.args.to,
            amount: event.args.value,
            value: value,
        })
        if (value.gt(50000.0)) {
            exporter.emit(ctx, {
                symbol: token.symbol,
                from: event.args.from,
                to: event.args.to,
                amount: event.args.value,
                value: value,
            })
        }
    }
  )
}