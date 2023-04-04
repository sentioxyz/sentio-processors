import { CHAIN_IDS, Counter, Gauge } from '@sentio/sdk'
import { ERC20Processor } from '@sentio/sdk/eth/builtin'
import * as constant from "./constant.js"
import { TCROContext, TCROProcessor } from './types/eth/tcro.js'
import { LCROProcessor } from './types/eth/lcro.js'
import { getPriceBySymbol } from '@sentio/sdk/utils'


const MintEventHandler = async (event: any, ctx: TCROContext) => {
  const minter = event.args.minter
  const mintAmount = Number(event.args.mintAmount) / Math.pow(10, 18)
  const mintTokens = Number(event.args.mintTokens) / Math.pow(10, 8)
  const CRO_price = (await getPriceBySymbol("CRO", ctx.timestamp))!
  const symbol = constant.T_TOKEN_SYMBOL.get(ctx.address.toLowerCase())!
  const volume = mintAmount * CRO_price

  ctx.eventLogger.emit("Mint", {
    distinctId: minter,
    mintAmount,
    mintTokens,
    symbol,
    coin_symbol: "cro", //get CRO price in Ethereum. TO DO: update more price symbols in cronos
    volume
  })

  ctx.meter.Counter("Collateral_counter").add(mintAmount, { symbol })
  ctx.meter.Counter("tTokens_counter").add(mintTokens, { symbol })

}

const RedeemEventHandler = async (event: any, ctx: TCROContext) => {
  const redeemer = event.args.redeemer
  const redeemAmount = Number(event.args.redeemAmount) / Math.pow(10, 18)
  const redeemTokens = Number(event.args.redeemTokens) / Math.pow(10, 8)
  const symbol = constant.T_TOKEN_SYMBOL.get(ctx.address.toLowerCase())!

  ctx.eventLogger.emit("Redeem", {
    distinctId: redeemer,
    redeemAmount,
    redeemTokens,
    symbol,
    coin_symbol: "cro", //get CRO price in Ethereum. TO DO: update more price symbols in cronos
  })

  ctx.meter.Counter("Collateral_counter").sub(redeemAmount, { symbol })
  ctx.meter.Counter("tTokens_counter").sub(redeemTokens, { symbol })
}

const BorrowEventHandler = async (event: any, ctx: TCROContext) => {
  const borrower = event.args.borrower
  const borrowAmount = Number(event.args.borrowAmount) / Math.pow(10, 18)
  const accountBorrows = Number(event.args.accountBorrows)
  const symbol = constant.T_TOKEN_SYMBOL.get(ctx.address.toLowerCase())!

  ctx.eventLogger.emit("Borrow", {
    distinctId: borrower,
    borrowAmount,
    symbol,
    accountBorrows,
    coin_symbol: "cro", //get CRO price in Ethereum. TO DO: update more price symbols in cronos
    name
  })

  ctx.meter.Counter("Collateral_counter").sub(borrowAmount, { symbol })
}

const RepayBorrowEventHandler = async (event: any, ctx: TCROContext) => {
  const payer = event.args.payer
  const borrower = event.args.borrower
  const repayAmount = Number(event.args.repayAmount) / Math.pow(10, 18)
  const accountBorrows = Number(event.args.accountBorrows)
  const symbol = constant.T_TOKEN_SYMBOL.get(ctx.address.toLowerCase())!

  ctx.eventLogger.emit("RepayBorrow", {
    distinctId: payer,
    borrower,
    repayAmount,
    accountBorrows,
    symbol,
    coin_symbol: "cro", //get CRO price in Ethereum. TO DO: update more price symbols in cronos
  })

  ctx.meter.Counter("Collateral_counter").add(repayAmount, { symbol })
}
const AllEventHandler = async (event: any, ctx: TCROContext) => {
  const totalBorrows = Number(await ctx.contract.totalBorrows()) / Math.pow(10, 8)
  const totalSupply = Number(await ctx.contract.totalSupply()) / Math.pow(10, 8)
  const totalReserves = Number(await ctx.contract.totalReserves()) / Math.pow(10, 8)
  const symbol = constant.T_TOKEN_SYMBOL.get(ctx.address.toLowerCase())!

  ctx.meter.Gauge("totalBorrows").record(totalBorrows, { symbol })
  ctx.meter.Gauge("totalSupply").record(totalSupply, { symbol })
  ctx.meter.Gauge("totalReserves").record(totalReserves, { symbol })

}


//t_tokens
for (let i = 0; i < constant.T_TOKEN_POOLS.length; i++) {
  let address = constant.T_TOKEN_POOLS[i]
  TCROProcessor.bind({ address: address, network: CHAIN_IDS.CRONOS, startBlock: 7400000 })
    .onEventMint(MintEventHandler)
    .onEventBorrow(BorrowEventHandler)
    .onEventRepayBorrow(RepayBorrowEventHandler)
    .onEventRedeem(RedeemEventHandler)
    .onAllEvents(AllEventHandler)
}