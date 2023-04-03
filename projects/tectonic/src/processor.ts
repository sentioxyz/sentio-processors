import { CHAIN_IDS, Counter, Gauge } from '@sentio/sdk'
import { ERC20Processor } from '@sentio/sdk/eth/builtin'
import * as constant from "./constant.js"
import { TCROContext, TCROProcessor } from './types/eth/tcro.js'
import { LCROProcessor } from './types/eth/lcro.js'
import { getPriceBySymbol } from '@sentio/sdk/utils'


const MintEventHandler = async (event: any, ctx: TCROContext) => {
  const minter = event.args.minter
  const mintAmount = Number(event.args.mintAmount) / Math.pow(10, 18)
  const tokenDecimal = Number(await ctx.contract.decimals())
  const mintTokens = Number(event.args.mintTokens) / Math.pow(10, tokenDecimal)
  const CRO_price = (await getPriceBySymbol("CRO", ctx.timestamp))!
  const symbol = await ctx.contract.symbol()
  const name = await ctx.contract.name()
  const volume = mintAmount * CRO_price

  ctx.eventLogger.emit("Mint", {
    distinctId: minter,
    mintAmount,
    mintTokens,
    symbol,
    coin_symbol: "cro", //get CRO price in Ethereum. TO DO: update more price symbols in cronos
    name,
    volume
  })

  ctx.meter.Counter("Collateral_counter").add(mintAmount, { symbol, name })
  ctx.meter.Counter("tTokens_counter").add(mintTokens, { symbol, name })

}

const RedeemEventHandler = async (event: any, ctx: TCROContext) => {
  const redeemer = event.args.redeemer
  const redeemAmount = Number(event.args.redeemAmount) / Math.pow(10, 18)
  const tokenDecimal = Number(await ctx.contract.decimals())
  const redeemTokens = Number(event.args.redeemTokens) / Math.pow(10, tokenDecimal)
  const symbol = await ctx.contract.symbol()
  const name = await ctx.contract.name()

  ctx.eventLogger.emit("Redeem", {
    distinctId: redeemer,
    redeemAmount,
    redeemTokens,
    symbol,
    coin_symbol: "cro", //get CRO price in Ethereum. TO DO: update more price symbols in cronos
    name
  })

  ctx.meter.Counter("Collateral_counter").sub(redeemAmount, { symbol, name })
  ctx.meter.Counter("tTokens_counter").sub(redeemTokens, { symbol, name })
}

const BorrowEventHandler = async (event: any, ctx: TCROContext) => {
  const borrower = event.args.borrower
  const borrowAmount = Number(event.args.borrowAmount) / Math.pow(10, 18)
  const accountBorrows = Number(event.args.accountBorrows)
  const symbol = await ctx.contract.symbol()
  const name = await ctx.contract.name()

  ctx.eventLogger.emit("Borrow", {
    distinctId: borrower,
    borrowAmount,
    symbol,
    accountBorrows,
    coin_symbol: "cro", //get CRO price in Ethereum. TO DO: update more price symbols in cronos
    name
  })

  ctx.meter.Counter("Collateral_counter").sub(borrowAmount, { symbol, name })
}

const RepayBorrowEventHandler = async (event: any, ctx: TCROContext) => {
  const payer = event.args.payer
  const borrower = event.args.borrower
  const repayAmount = Number(event.args.repayAmount) / Math.pow(10, 18)
  const accountBorrows = Number(event.args.accountBorrows)
  const symbol = await ctx.contract.symbol()
  const name = await ctx.contract.name()

  ctx.eventLogger.emit("RepayBorrow", {
    distinctId: payer,
    borrower,
    repayAmount,
    accountBorrows,
    symbol,
    coin_symbol: "cro", //get CRO price in Ethereum. TO DO: update more price symbols in cronos
    name
  })

  ctx.meter.Counter("Collateral_counter").add(repayAmount, { symbol, name })
}
const AllEventHandler = async (event: any, ctx: TCROContext) => {
  const tokenDecimal = Number(await ctx.contract.decimals())
  const totalBorrows = Number(await ctx.contract.totalBorrows()) / tokenDecimal
  const totalSupply = Number(await ctx.contract.totalSupply()) / tokenDecimal
  const totalReserves = Number(await ctx.contract.totalReserves()) / tokenDecimal
  const symbol = await ctx.contract.symbol()
  const name = await ctx.contract.name()
  ctx.meter.Gauge("totalBorrows").record(totalBorrows, { symbol, name })
  ctx.meter.Gauge("totalSupply").record(totalSupply, { symbol, name })
  ctx.meter.Gauge("totalReserves").record(totalReserves, { symbol, name })

}


//t_tokens
for (let i = 0; i < constant.T_TOKEN_POOLS.length; i++) {
  let address = constant.T_TOKEN_POOLS[i]
  TCROProcessor.bind({ address: address, network: CHAIN_IDS.CRONOS })
    .onEventMint(MintEventHandler)
    .onEventBorrow(BorrowEventHandler)
    .onEventRepayBorrow(RepayBorrowEventHandler)
    .onEventRedeem(RedeemEventHandler)
    .onAllEvents(AllEventHandler)
}