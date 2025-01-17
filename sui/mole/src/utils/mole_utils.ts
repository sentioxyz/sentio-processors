import { SuiObjectProcessor, SuiContext, SuiObjectContext } from "@sentio/sdk/sui"
import { getPriceByType, token } from "@sentio/sdk/utils"
import { SuiNetwork } from "@sentio/sdk/sui"
import BN from 'bn.js'
// import * as Decimal from 'decimal.js'
const Decimal = require("decimal.js")
import { MathUtil, ONE, U64_MAX, ZERO } from './utils.js'


export async function buildCoinInfo(ctx: SuiContext | SuiObjectContext, coinAddress: string): Promise<token.TokenInfo> {
    let [symbol, name, decimal] = ["unk", "unk", 0]
    try {
        const metadata = await ctx.client.getCoinMetadata({ coinType: coinAddress })
        //@ts-ignore
        symbol = metadata.symbol
        //@ts-ignore
        decimal = metadata.decimals
        //@ts-ignore
        name = metadata.name
        console.log(`build coin metadata ${symbol} ${decimal} ${name}`)
    }
    catch (e) {
        console.log(`${e.message} get coin metadata error ${coinAddress}`)
    }

    return {
        symbol,
        name,
        decimal
    }
}

export function asIntN(int: bigint, bits?: number): number {
    return Number(BigInt.asIntN(bits!, BigInt(int)));
}

export function i32BitsToNumber(v: number | bigint | string): number {
    return asIntN(BigInt(v), 32);
}

export type CoinAmounts = {
    coinA: BN
    coinB: BN
  }
  
/**
 * Get token amount fron liquidity.
 * @param liquidity - liquidity
 * @param curSqrtPrice - Pool current sqrt price
 * @param lowerPrice - lower price
 * @param upperPrice - upper price
 * @param roundUp - is round up
 * @returns
 */
export function getCoinAmountFromLiquidity(liquidity: BN, curSqrtPrice: BN, lowerPrice: BN, upperPrice: BN, roundUp: boolean): CoinAmounts {
    console.log("enter getCoinAmountFromLiquidity")

    const liq = new Decimal(liquidity.toString())
    
    const curSqrtPriceStr = new Decimal(curSqrtPrice.toString())
    const lowerPriceStr = new Decimal(lowerPrice.toString())
    const upperPriceStr = new Decimal(upperPrice.toString())

    // console.log("liq:", liq, ",curSqrtPriceStr:", curSqrtPriceStr, ",lowerPriceStr:", lowerPriceStr, ",upperPriceStr:", upperPriceStr)

    let coinA
    let coinB
    if (curSqrtPrice.lt(lowerPrice)) {
        coinA = MathUtil.toX64_Decimal(liq).mul(upperPriceStr.sub(lowerPriceStr)).div(lowerPriceStr.mul(upperPriceStr))
        coinB = new Decimal(0)
    } else if (curSqrtPrice.lt(upperPrice)) {
        coinA = MathUtil.toX64_Decimal(liq).mul(upperPriceStr.sub(curSqrtPriceStr)).div(curSqrtPriceStr.mul(upperPriceStr))
        coinB = MathUtil.fromX64_Decimal(liq.mul(curSqrtPriceStr.sub(lowerPriceStr)))
    } else {
        coinA = new Decimal(0)
        coinB = MathUtil.fromX64_Decimal(liq.mul(upperPriceStr.sub(lowerPriceStr)))
    }
    // console.log("coinA:", coinA, ", coinB:", coinB)

    if (roundUp) {
        return {
        coinA: new BN(coinA.ceil().toString()),
        coinB: new BN(coinB.ceil().toString()),
        }
    }
    return {
        coinA: new BN(coinA.floor().toString()),
        coinB: new BN(coinB.floor().toString()),
    }
}



export function tickIndexToSqrtPriceX64(tickIndex: number): BN {
    if (tickIndex > 0) {
      return new BN(tickIndexToSqrtPricePositive(tickIndex))
    }
    return new BN(tickIndexToSqrtPriceNegative(tickIndex))
  }

  
function signedShiftRight(n0: BN, shiftBy: number, bitWidth: number) {
    const twoN0 = n0.toTwos(bitWidth).shrn(shiftBy)
    twoN0.imaskn(bitWidth - shiftBy + 1)
    return twoN0.fromTwos(bitWidth - shiftBy)
  }
  
function tickIndexToSqrtPricePositive(tick: number) {
    let ratio: BN
  
    if ((tick & 1) !== 0) {
      ratio = new BN('79232123823359799118286999567')
    } else {
      ratio = new BN('79228162514264337593543950336')
    }
  
    if ((tick & 2) !== 0) {
      ratio = signedShiftRight(ratio.mul(new BN('79236085330515764027303304731')), 96, 256)
    }
    if ((tick & 4) !== 0) {
      ratio = signedShiftRight(ratio.mul(new BN('79244008939048815603706035061')), 96, 256)
    }
    if ((tick & 8) !== 0) {
      ratio = signedShiftRight(ratio.mul(new BN('79259858533276714757314932305')), 96, 256)
    }
    if ((tick & 16) !== 0) {
      ratio = signedShiftRight(ratio.mul(new BN('79291567232598584799939703904')), 96, 256)
    }
    if ((tick & 32) !== 0) {
      ratio = signedShiftRight(ratio.mul(new BN('79355022692464371645785046466')), 96, 256)
    }
    if ((tick & 64) !== 0) {
      ratio = signedShiftRight(ratio.mul(new BN('79482085999252804386437311141')), 96, 256)
    }
    if ((tick & 128) !== 0) {
      ratio = signedShiftRight(ratio.mul(new BN('79736823300114093921829183326')), 96, 256)
    }
    if ((tick & 256) !== 0) {
      ratio = signedShiftRight(ratio.mul(new BN('80248749790819932309965073892')), 96, 256)
    }
    if ((tick & 512) !== 0) {
      ratio = signedShiftRight(ratio.mul(new BN('81282483887344747381513967011')), 96, 256)
    }
    if ((tick & 1024) !== 0) {
      ratio = signedShiftRight(ratio.mul(new BN('83390072131320151908154831281')), 96, 256)
    }
    if ((tick & 2048) !== 0) {
      ratio = signedShiftRight(ratio.mul(new BN('87770609709833776024991924138')), 96, 256)
    }
    if ((tick & 4096) !== 0) {
      ratio = signedShiftRight(ratio.mul(new BN('97234110755111693312479820773')), 96, 256)
    }
    if ((tick & 8192) !== 0) {
      ratio = signedShiftRight(ratio.mul(new BN('119332217159966728226237229890')), 96, 256)
    }
    if ((tick & 16384) !== 0) {
      ratio = signedShiftRight(ratio.mul(new BN('179736315981702064433883588727')), 96, 256)
    }
    if ((tick & 32768) !== 0) {
      ratio = signedShiftRight(ratio.mul(new BN('407748233172238350107850275304')), 96, 256)
    }
    if ((tick & 65536) !== 0) {
      ratio = signedShiftRight(ratio.mul(new BN('2098478828474011932436660412517')), 96, 256)
    }
    if ((tick & 131072) !== 0) {
      ratio = signedShiftRight(ratio.mul(new BN('55581415166113811149459800483533')), 96, 256)
    }
    if ((tick & 262144) !== 0) {
      ratio = signedShiftRight(ratio.mul(new BN('38992368544603139932233054999993551')), 96, 256)
    }
  
    return signedShiftRight(ratio, 32, 256)
  }

  
function tickIndexToSqrtPriceNegative(tickIndex: number) {
    const tick = Math.abs(tickIndex)
    let ratio: BN
  
    if ((tick & 1) !== 0) {
      ratio = new BN('18445821805675392311')
    } else {
      ratio = new BN('18446744073709551616')
    }
  
    if ((tick & 2) !== 0) {
      ratio = signedShiftRight(ratio.mul(new BN('18444899583751176498')), 64, 256)
    }
    if ((tick & 4) !== 0) {
      ratio = signedShiftRight(ratio.mul(new BN('18443055278223354162')), 64, 256)
    }
    if ((tick & 8) !== 0) {
      ratio = signedShiftRight(ratio.mul(new BN('18439367220385604838')), 64, 256)
    }
    if ((tick & 16) !== 0) {
      ratio = signedShiftRight(ratio.mul(new BN('18431993317065449817')), 64, 256)
    }
    if ((tick & 32) !== 0) {
      ratio = signedShiftRight(ratio.mul(new BN('18417254355718160513')), 64, 256)
    }
    if ((tick & 64) !== 0) {
      ratio = signedShiftRight(ratio.mul(new BN('18387811781193591352')), 64, 256)
    }
    if ((tick & 128) !== 0) {
      ratio = signedShiftRight(ratio.mul(new BN('18329067761203520168')), 64, 256)
    }
    if ((tick & 256) !== 0) {
      ratio = signedShiftRight(ratio.mul(new BN('18212142134806087854')), 64, 256)
    }
    if ((tick & 512) !== 0) {
      ratio = signedShiftRight(ratio.mul(new BN('17980523815641551639')), 64, 256)
    }
    if ((tick & 1024) !== 0) {
      ratio = signedShiftRight(ratio.mul(new BN('17526086738831147013')), 64, 256)
    }
    if ((tick & 2048) !== 0) {
      ratio = signedShiftRight(ratio.mul(new BN('16651378430235024244')), 64, 256)
    }
    if ((tick & 4096) !== 0) {
      ratio = signedShiftRight(ratio.mul(new BN('15030750278693429944')), 64, 256)
    }
    if ((tick & 8192) !== 0) {
      ratio = signedShiftRight(ratio.mul(new BN('12247334978882834399')), 64, 256)
    }
    if ((tick & 16384) !== 0) {
      ratio = signedShiftRight(ratio.mul(new BN('8131365268884726200')), 64, 256)
    }
    if ((tick & 32768) !== 0) {
      ratio = signedShiftRight(ratio.mul(new BN('3584323654723342297')), 64, 256)
    }
    if ((tick & 65536) !== 0) {
      ratio = signedShiftRight(ratio.mul(new BN('696457651847595233')), 64, 256)
    }
    if ((tick & 131072) !== 0) {
      ratio = signedShiftRight(ratio.mul(new BN('26294789957452057')), 64, 256)
    }
    if ((tick & 262144) !== 0) {
      ratio = signedShiftRight(ratio.mul(new BN('37481735321082')), 64, 256)
    }
  
    return ratio
  }
  