import { CHAIN_IDS, Counter, Gauge } from '@sentio/sdk'
import { ERC20Processor } from '@sentio/sdk/eth/builtin'
import * as constant from "./constant.js"
import { TCROContext, TCROProcessor } from './types/eth/tcro.js'
import { LCROProcessor } from './types/eth/lcro.js'
import { getPriceBySymbol } from '@sentio/sdk/utils'


const MintEventHandler = async (event: any, ctx: TCROContext) => {
  const minter = event.args.minter
  const tSymbol = constant.T_TOKEN_SYMBOL.get(ctx.address.toLowerCase())!
  const collateralSymbol = (constant.COLLATERAL_TOKENS.get(tSymbol))!
  const collateralDecimal = (constant.COLLATERAL_DECIMAL.get(collateralSymbol))!
  const mintAmount = Number(event.args.mintAmount) / Math.pow(10, collateralDecimal)
  const mintTokens = Number(event.args.mintTokens) / Math.pow(10, 8)


  ctx.eventLogger.emit("Mint", {
    distinctId: minter,
    mintAmount,
    mintTokens,
    tSymbol,
    coin_symbol: collateralSymbol
  })

  ctx.meter.Counter("collateral_counter").add(mintAmount, { tSymbol })
  ctx.meter.Counter("tTokens_counter").add(mintTokens, { tSymbol })
}

const RedeemEventHandler = async (event: any, ctx: TCROContext) => {
  const redeemer = event.args.redeemer
  const tSymbol = constant.T_TOKEN_SYMBOL.get(ctx.address.toLowerCase())!
  const collateralSymbol = (constant.COLLATERAL_TOKENS.get(tSymbol))!
  const collateralDecimal = (constant.COLLATERAL_DECIMAL.get(collateralSymbol))!

  const redeemAmount = Number(event.args.redeemAmount) / Math.pow(10, collateralDecimal)
  const redeemTokens = Number(event.args.redeemTokens) / Math.pow(10, 8)


  ctx.eventLogger.emit("Redeem", {
    distinctId: redeemer,
    redeemAmount,
    redeemTokens,
    tSymbol,
    coin_symbol: collateralSymbol
  })

  ctx.meter.Counter("collateral_counter").sub(redeemAmount, { tSymbol })
  ctx.meter.Counter("tTokens_counter").sub(redeemTokens, { tSymbol })

}

const BorrowEventHandler = async (event: any, ctx: TCROContext) => {
  const borrower = event.args.borrower
  const tSymbol = constant.T_TOKEN_SYMBOL.get(ctx.address.toLowerCase())!
  const collateralSymbol = (constant.COLLATERAL_TOKENS.get(tSymbol))!
  const collateralDecimal = (constant.COLLATERAL_DECIMAL.get(collateralSymbol))!
  const borrowAmount = Number(event.args.borrowAmount) / Math.pow(10, collateralDecimal)
  const accountBorrows = Number(event.args.accountBorrows)

  ctx.eventLogger.emit("Borrow", {
    distinctId: borrower,
    borrowAmount,
    tSymbol,
    accountBorrows,
    coin_symbol: collateralSymbol
  })

  ctx.meter.Counter("borrow_counter").add(borrowAmount, { tSymbol })
}

const RepayBorrowEventHandler = async (event: any, ctx: TCROContext) => {
  const payer = event.args.payer
  const borrower = event.args.borrower
  const tSymbol = constant.T_TOKEN_SYMBOL.get(ctx.address.toLowerCase())!
  const collateralSymbol = (constant.COLLATERAL_TOKENS.get(tSymbol))!
  const collateralDecimal = (constant.COLLATERAL_DECIMAL.get(collateralSymbol))!
  const repayAmount = Number(event.args.repayAmount) / Math.pow(10, collateralDecimal)
  const accountBorrows = Number(event.args.accountBorrows)

  ctx.eventLogger.emit("RepayBorrow", {
    distinctId: payer,
    borrower,
    repayAmount,
    accountBorrows,
    tSymbol,
    coin_symbol: collateralSymbol
  })

  ctx.meter.Counter("borrow_counter").sub(repayAmount, { tSymbol })
}
const AllEventHandler = async (event: any, ctx: TCROContext) => {
  const totalBorrows = Number(await ctx.contract.totalBorrows()) / Math.pow(10, 8)
  const totalSupply = Number(await ctx.contract.totalSupply()) / Math.pow(10, 8)
  const totalReserves = Number(await ctx.contract.totalReserves()) / Math.pow(10, 8)
  const tSymbol = constant.T_TOKEN_SYMBOL.get(ctx.address.toLowerCase())!
  const collateralSymbol = constant.COLLATERAL_TOKENS.get(tSymbol)

  ctx.meter.Gauge("totalBorrows").record(totalBorrows, { tSymbol })
  ctx.meter.Gauge("totalSupply").record(totalSupply, { tSymbol })
  ctx.meter.Gauge("totalReserves").record(totalReserves, { tSymbol })

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