import { Counter, Gauge, scaleDown } from '@sentio/sdk'
import { ERC20Processor } from '@sentio/sdk/eth/builtin'
import * as constant from "./constant.js"
import { TCROContext, TCROProcessor, LiquidateBorrowEvent, AccrueInterestEvent } from './types/eth/tcro.js'
import { LCROProcessor } from './types/eth/lcro.js'
import { getPriceBySymbol } from '@sentio/sdk/utils'
import { WCROProcessor, TransferEvent, WCROContext } from './types/eth/wcro.js'
import { TectonicCoreProcessor } from './types/eth/tectoniccore.js'
import { EthChainId } from "@sentio/sdk/eth";
// import './aave_v3.js'

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

  ctx.eventLogger.emit("BorrowOrSupply", {
    distinctId: minter,
    mintAmount,
    mintTokens,
    tSymbol,
    coin_symbol: collateralSymbol
  })

  ctx.meter.Counter("borrow_or_supply_tx").add(1, { event: "Mint" })
  ctx.meter.Counter("collateral_counter").add(mintAmount, { tSymbol, coin_symbol: collateralSymbol })
  ctx.meter.Counter("tTokens_counter").add(mintTokens, { tSymbol, coin_symbol: collateralSymbol })
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

  ctx.eventLogger.emit("BorrowOrSupply", {
    distinctId: redeemer,
    redeemAmount,
    redeemTokens,
    tSymbol,
    coin_symbol: collateralSymbol
  })

  ctx.meter.Counter("borrow_or_supply_tx").add(1, { event: "Redeem" })
  ctx.meter.Counter("collateral_counter").sub(redeemAmount, { tSymbol, coin_symbol: collateralSymbol })
  ctx.meter.Counter("tTokens_counter").sub(redeemTokens, { tSymbol, coin_symbol: collateralSymbol })

}

const BorrowEventHandler = async (event: any, ctx: TCROContext) => {
  const borrower = event.args.borrower
  const tSymbol = constant.T_TOKEN_SYMBOL.get(ctx.address.toLowerCase())!
  const collateralSymbol = (constant.COLLATERAL_TOKENS.get(tSymbol))!
  const collateralDecimal = (constant.COLLATERAL_DECIMAL.get(collateralSymbol))!
  const borrowAmount = Number(event.args.borrowAmount) / Math.pow(10, collateralDecimal)
  const accountBorrows = Number(event.args.accountBorrows)
  const collateralPrice = (await getPriceBySymbol(collateralSymbol, ctx.timestamp))!
  const borrowAmountUSD = borrowAmount * collateralPrice

  ctx.eventLogger.emit("Borrow", {
    distinctId: borrower,
    borrowAmount,
    tSymbol,
    accountBorrows,
    coin_symbol: collateralSymbol
  })

  ctx.eventLogger.emit("BorrowOrSupply", {
    distinctId: borrower,
    borrowAmount,
    tSymbol,
    accountBorrows,
    coin_symbol: collateralSymbol
  })

  ctx.meter.Counter("borrow_or_supply_tx").add(1, { event: "Borrow" })
  ctx.meter.Counter("borrow_counter").add(borrowAmount, { tSymbol, coin_symbol: collateralSymbol })
  ctx.meter.Gauge("borrow_amount_usd_gauge").record(borrowAmountUSD, { tSymbol, coin_symbol: collateralSymbol })
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

  ctx.eventLogger.emit("BorrowOrSupply", {
    distinctId: payer,
    borrower,
    repayAmount,
    accountBorrows,
    tSymbol,
    coin_symbol: collateralSymbol
  })

  ctx.meter.Counter("borrow_or_supply_tx").add(1, { event: "RepayBorrow" })
  ctx.meter.Counter("borrow_counter").sub(repayAmount, { tSymbol, coin_symbol: collateralSymbol })
}

const LiquidateBorrowHandler = async (event: LiquidateBorrowEvent, ctx: TCROContext) => {
  // const hash = event.transactionHash

  const liquidator = event.args.liquidator
  const borrower = event.args.borrower
  const tSymbol = constant.T_TOKEN_SYMBOL.get(ctx.address.toLowerCase())!
  const collateralSymbol = (constant.COLLATERAL_TOKENS.get(tSymbol))!
  const collateralDecimal = (constant.COLLATERAL_DECIMAL.get(collateralSymbol))!
  const repayAmount = Number(event.args.repayAmount) / Math.pow(10, collateralDecimal)
  const tTokenCollateral = event.args.tTokenCollateral
  const seizeTokens = Number(event.args.seizeTokens) / Math.pow(10, 8)

  // console.log(`Liquidate txHash ${hash}, tSymbol ${tSymbol},repayAmount ${repayAmount},tTokenCollateral ${tTokenCollateral},seizeTokens ${seizeTokens}  `)

  ctx.eventLogger.emit("LiquidateBorrow", {
    distinctId: liquidator,
    borrower,
    repayAmount,
    seizeTokens,
    tSymbol,
    coin_symbol: collateralSymbol
  })

  ctx.meter.Counter("liquidation_amount_counter").add(repayAmount, { tSymbol, coin_symbol: collateralSymbol })
}

const AccrueInterestHandler = async (event: AccrueInterestEvent, ctx: TCROContext) => {
  const tSymbol = constant.T_TOKEN_SYMBOL.get(ctx.address.toLowerCase())!
  const collateralSymbol = (constant.COLLATERAL_TOKENS.get(tSymbol))!
  const collateralDecimal = (constant.COLLATERAL_DECIMAL.get(collateralSymbol))!
  const interestAccumulated = Number(scaleDown(event.args.interestAccumulated, collateralDecimal))
  try {
    const reserveFactor = Number(scaleDown(await ctx.contract.reserveFactorMantissa(), 18))
    const protocolInterestRevenue = interestAccumulated * reserveFactor

    ctx.meter.Gauge("protocolInterestRevenue").record(protocolInterestRevenue, { tSymbol, coin_symbol: collateralSymbol })
    ctx.meter.Counter("protocolInterestRevenue_counter").add(protocolInterestRevenue, { tSymbol, coin_symbol: collateralSymbol })

    ctx.eventLogger.emit("AccrueInterest", {
      tSymbol,
      protocolInterestRevenue,
      coin_symbol: collateralSymbol
    })
  }
  catch (e) {
    console.log(e.message, `get reserveFactorMantissa() issue at ${ctx.transactionHash}`)
  }
}

const ReservesAddedHandler = async (event: any, ctx: TCROContext) => {
  const tSymbol = constant.T_TOKEN_SYMBOL.get(ctx.address.toLowerCase())!
  const collateralSymbol = (constant.COLLATERAL_TOKENS.get(tSymbol))!
  const collateralDecimal = (constant.COLLATERAL_DECIMAL.get(collateralSymbol))!
  const protocolLiquidationRevenue = Number(scaleDown(event.args.addAmount, collateralDecimal))
  ctx.meter.Gauge("protocolLiquidationRevenue").record(protocolLiquidationRevenue, { tSymbol, coin_symbol: collateralSymbol })
  ctx.meter.Counter("protocolLiquidationRevenue_counter").add(protocolLiquidationRevenue, { tSymbol, coin_symbol: collateralSymbol })

  ctx.eventLogger.emit("ReservesAdded", {
    tSymbol,
    protocolLiquidationRevenue,
    coin_symbol: collateralSymbol
  })

}

const AllEventHandler = async (event: any, ctx: TCROContext) => {
  if (event.name == "RepayBorrow" || "Mint" || "Borrow" || "Redeem") {
    const totalBorrows = Number(await ctx.contract.totalBorrows()) / Math.pow(10, 8)
    const totalSupply = Number(await ctx.contract.totalSupply()) / Math.pow(10, 8)
    const tSymbol = constant.T_TOKEN_SYMBOL.get(ctx.address.toLowerCase())!
    const collateralSymbol = (constant.COLLATERAL_TOKENS.get(tSymbol))!
    const collateralDecimal = (constant.COLLATERAL_DECIMAL.get(collateralSymbol))!
    const totalReserves = Number(await ctx.contract.totalReserves()) / Math.pow(10, collateralDecimal)


    ctx.meter.Gauge("totalBorrows").record(totalBorrows, { tSymbol, coin_symbol: collateralSymbol })
    ctx.meter.Gauge("totalSupply").record(totalSupply, { tSymbol, coin_symbol: collateralSymbol })
    ctx.meter.Gauge("totalReserves").record(totalReserves, { tSymbol, coin_symbol: collateralSymbol })
  }
  else {
    const tSymbol = constant.T_TOKEN_SYMBOL.get(ctx.address.toLowerCase())!
    ctx.eventLogger.emit(event.name, {
      tSymbol
    })
  }

}


//t_tokens
for (let i = 0; i < constant.T_TOKEN_POOLS.length; i++) {
  let address = constant.T_TOKEN_POOLS[i]
  TCROProcessor.bind({ address: address, network: EthChainId.CRONOS })
    .onEventMint(MintEventHandler)
    .onEventBorrow(BorrowEventHandler)
    .onEventRepayBorrow(RepayBorrowEventHandler)
    .onEventRedeem(RedeemEventHandler)
    //.onEventLiquidateBorrow(LiquidateBorrowHandler)
    .onEventReservesAdded(ReservesAddedHandler)
    .onEventAccrueInterest(AccrueInterestHandler)
    .onAllEvents(AllEventHandler)
}


// //liquidation interest. TO DO: check if treasury address is correct
// const filter = WCROProcessor.filters.Transfer('0xcdcabcbe21a4f18cefacb37715fc6baa0d4e98c0')

// WCROProcessor.bind({ address: constant.WCRO_ADDRESS, network: CHAIN_IDS.CRONOS })
//   .onEventTransfer(async (event: TransferEvent, ctx: WCROContext) => {
//     if (event.args[2]) {
//       const amount = Number(event.args[2]) / Math.pow(10, 18)
//       ctx.meter.Counter('liquidation_interest_counter').add(amount, { coin_symbol: 'cro' })
//     }
//   }, filter)

//Tonic
TectonicCoreProcessor.bind({ address: constant.SOCKET_ADDRESS, network: EthChainId.CRONOS })
  .onEventDistributedBorrowerTonic(async (event, ctx) => {
    const hash = event.transactionHash
    try {
      const tToken = event.args.tToken.toLowerCase()
      const borrower = event.args.borrower
      const tonicDelta = Number(event.args.tonicDelta) / Math.pow(10, 18)
      const tonicBorrowIndex = "index" + event.args.tonicBorrowIndex
      const tSymbol = constant.T_TOKEN_SYMBOL.get(tToken)!

      ctx.eventLogger.emit("DistributedBorrowerTonic", {
        distinctId: borrower,
        tSymbol,
        tonicDelta,
        tonicBorrowIndex,
        coin_symbol: "tonic",
      })

      ctx.meter.Counter("tonic_counter").add(tonicDelta, { tSymbol, coin_symbol: "tonic", event: "DistributedBorrowerTonic" })
    } catch (error) {
      console.log(error.message, hash)
    }
  })
  .onEventDistributedSupplierTonic(async (event, ctx) => {
    const hash = event.transactionHash

    try {
      const tToken = event.args.tToken.toLowerCase()
      const supplier = event.args.supplier
      let tonicDelta = 0
      tonicDelta = Number(event.args.tonicDelta) / Math.pow(10, 18)
      let tonicSupplyIndex = ""
      tonicSupplyIndex = "index" + event.args.tonicSupplyIndex
      const tSymbol = constant.T_TOKEN_SYMBOL.get(tToken)!

      ctx.eventLogger.emit("DistributedSupplierTonic", {
        distinctId: supplier,
        tSymbol,
        tonicDelta,
        tonicSupplyIndex,
        coin_symbol: "tonic",
      })

      ctx.meter.Counter("tonic_counter").add(tonicDelta, { tSymbol, coin_symbol: "tonic", event: "DistributedSupplierTonic" })

    } catch (error) {
      console.log(error.message, hash)
    }


  })


