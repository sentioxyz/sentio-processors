import { Counter, Gauge, scaleDown } from '@sentio/sdk'
import { ERC20Processor } from '@sentio/sdk/eth/builtin'
import * as constant from "./constant.js"
import { TCROContext, TCROProcessor, LiquidateBorrowEvent, AccrueInterestEvent } from './types/eth/tcro.js'
import { LCROContext, LCROProcessor } from './types/eth/lcro.js'
import { getPriceBySymbol } from '@sentio/sdk/utils'
import { WCROProcessor, TransferEvent, WCROContext } from './types/eth/wcro.js'
import { TectonicCoreProcessor } from './types/eth/tectoniccore.js'
import { EthChainId } from "@sentio/sdk/eth";
import { getERC20Contract } from '@sentio/sdk/eth/builtin/erc20'
import './aave_v3.js'
import { TectonicStakingPoolV3Context, TectonicStakingPoolV3Processor, TonicReleasedEvent, TonicStakedEvent, TonicUnstakedEvent } from './types/eth/tectonicstakingpoolv3.js'
import { DepositEvent, TONICVaultContext, TONICVaultProcessor, UpgradeEvent, WithdrawEvent } from './types/eth/tonicvault.js'
import { DeferLiquidityCheckAdapterContext, DeferLiquidityCheckAdapterProcessor, SwapAndRepayCallTrace } from './types/eth/deferliquiditycheckadapter.js'

const MintEventHandler = async (event: any, ctx: TCROContext | LCROContext) => {
  const tokenType = constant.MAIN_POOLS.includes(ctx.address) ? "main_pool" : "lcro_pool"

  const minter = event.args.minter
  const tSymbol = constant.TOKEN_SYMBOL.get(ctx.address.toLowerCase())!
  const collateralSymbol = (constant.COLLATERAL_TOKENS.get(tSymbol))!
  const collateralDecimal = (constant.COLLATERAL_DECIMAL.get(collateralSymbol))!
  const mintAmount = Number(event.args.mintAmount) / Math.pow(10, collateralDecimal)
  const mintTokens = Number(event.args.mintTokens) / Math.pow(10, 8)

  ctx.eventLogger.emit("Mint", {
    distinctId: minter,
    mintAmount,
    mintTokens,
    tSymbol,
    project: "tectonic",
    tokenType,
    coin_symbol: collateralSymbol
  })

  ctx.eventLogger.emit("BorrowOrSupply", {
    distinctId: minter,
    mintAmount,
    mintTokens,
    tSymbol,
    project: "tectonic",
    tokenType,
    coin_symbol: collateralSymbol
  })

  ctx.meter.Counter("borrow_or_supply_tx").add(1, { event: "Mint", tokenType, project: "tectonic" })
  ctx.meter.Counter("collateral_counter").add(mintAmount, { tSymbol, coin_symbol: collateralSymbol, tokenType, project: "tectonic" })
  ctx.meter.Counter("tTokens_counter").add(mintTokens, { tSymbol, coin_symbol: collateralSymbol, tokenType, project: "tectonic" })
}

const RedeemEventHandler = async (event: any, ctx: TCROContext | LCROContext) => {
  const tokenType = constant.MAIN_POOLS.includes(ctx.address) ? "main_pool" : "lcro_pool"

  const redeemer = event.args.redeemer
  const tSymbol = constant.TOKEN_SYMBOL.get(ctx.address.toLowerCase())!
  const collateralSymbol = (constant.COLLATERAL_TOKENS.get(tSymbol))!
  const collateralDecimal = (constant.COLLATERAL_DECIMAL.get(collateralSymbol))!

  const redeemAmount = Number(event.args.redeemAmount) / Math.pow(10, collateralDecimal)
  const redeemTokens = Number(event.args.redeemTokens) / Math.pow(10, 8)


  ctx.eventLogger.emit("Redeem", {
    distinctId: redeemer,
    redeemAmount,
    redeemTokens,
    tSymbol,
    tokenType,
    coin_symbol: collateralSymbol,
    project: "tectonic"
  })

  ctx.eventLogger.emit("BorrowOrSupply", {
    distinctId: redeemer,
    redeemAmount,
    redeemTokens,
    tSymbol,
    tokenType,
    coin_symbol: collateralSymbol,
    project: "tectonic"
  })

  ctx.meter.Counter("borrow_or_supply_tx").add(1, { event: "Redeem", project: "tectonic" })
  ctx.meter.Counter("collateral_counter").sub(redeemAmount, { tSymbol, coin_symbol: collateralSymbol, tokenType, project: "tectonic" })
  ctx.meter.Counter("tTokens_counter").sub(redeemTokens, { tSymbol, coin_symbol: collateralSymbol, tokenType, project: "tectonic" })

}

const BorrowEventHandler = async (event: any, ctx: TCROContext | LCROContext) => {
  const tokenType = constant.MAIN_POOLS.includes(ctx.address) ? "main_pool" : "lcro_pool"

  const borrower = event.args.borrower
  const tSymbol = constant.TOKEN_SYMBOL.get(ctx.address.toLowerCase())!
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
    tokenType,
    accountBorrows,
    coin_symbol: collateralSymbol,
    project: "tectonic"
  })

  ctx.eventLogger.emit("BorrowOrSupply", {
    distinctId: borrower,
    borrowAmount,
    tSymbol,
    tokenType,
    accountBorrows,
    coin_symbol: collateralSymbol,
    project: "tectonic"
  })

  ctx.meter.Counter("borrow_or_supply_tx").add(1, { event: "Borrow", project: "tectonic" })
  ctx.meter.Counter("borrow_counter").add(borrowAmount, { tSymbol, coin_symbol: collateralSymbol, tokenType, project: "tectonic" })
  ctx.meter.Gauge("borrow_amount_usd_gauge").record(borrowAmountUSD, { tSymbol, coin_symbol: collateralSymbol, tokenType, project: "tectonic" })
}

const RepayBorrowEventHandler = async (event: any, ctx: TCROContext | LCROContext) => {
  const tokenType = constant.MAIN_POOLS.includes(ctx.address) ? "main_pool" : "lcro_pool"

  const payer = event.args.payer
  const borrower = event.args.borrower
  const tSymbol = constant.TOKEN_SYMBOL.get(ctx.address.toLowerCase())!
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
    tokenType,
    coin_symbol: collateralSymbol,
    project: "tectonic"
  })

  ctx.eventLogger.emit("BorrowOrSupply", {
    distinctId: payer,
    borrower,
    repayAmount,
    accountBorrows,
    tSymbol,
    tokenType,
    coin_symbol: collateralSymbol,
    project: "tectonic"
  })

  ctx.meter.Counter("borrow_or_supply_tx").add(1, { event: "RepayBorrow", project: "tectonic" })
  ctx.meter.Counter("borrow_counter").sub(repayAmount, { tSymbol, coin_symbol: collateralSymbol, tokenType, project: "tectonic" })
}

const LiquidateBorrowHandler = async (event: LiquidateBorrowEvent, ctx: TCROContext | LCROContext) => {
  const tokenType = constant.MAIN_POOLS.includes(ctx.address) ? "main_pool" : "lcro_pool"

  const liquidator = event.args.liquidator
  const borrower = event.args.borrower
  const tSymbol = constant.TOKEN_SYMBOL.get(ctx.address.toLowerCase())!
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
    tokenType,
    coin_symbol: collateralSymbol, project: "tectonic"
  })

  ctx.meter.Counter("liquidation_amount_counter").add(repayAmount, { tSymbol, coin_symbol: collateralSymbol, tokenType, project: "tectonic" })
}

const AccrueInterestHandler = async (event: AccrueInterestEvent, ctx: TCROContext | LCROContext) => {
  const tokenType = constant.MAIN_POOLS.includes(ctx.address) ? "main_pool" : "lcro_pool"

  const tSymbol = constant.TOKEN_SYMBOL.get(ctx.address.toLowerCase())!
  const collateralSymbol = (constant.COLLATERAL_TOKENS.get(tSymbol))!
  const collateralDecimal = (constant.COLLATERAL_DECIMAL.get(collateralSymbol))!
  const interestAccumulated = Number(scaleDown(event.args.interestAccumulated, collateralDecimal))
  try {
    const reserveFactor = Number(scaleDown(await ctx.contract.reserveFactorMantissa(), 18))
    const protocolInterestRevenue = interestAccumulated * reserveFactor
    // console.log(`reserveFactor ${reserveFactor} ${protocolInterestRevenue} ${interestAccumulated}`)

    ctx.meter.Gauge("protocolInterestRevenue").record(protocolInterestRevenue, { tSymbol, coin_symbol: collateralSymbol, tokenType, project: "tectonic" })
    ctx.meter.Counter("protocolInterestRevenue_counter").add(protocolInterestRevenue, { tSymbol, coin_symbol: collateralSymbol, tokenType, project: "tectonic" })

    ctx.eventLogger.emit("AccrueInterest", {
      tSymbol,
      protocolInterestRevenue,
      tokenType,
      coin_symbol: collateralSymbol, project: "tectonic"
    })
  }
  catch (e) {
    console.log(e.message, `get reserveFactorMantissa() issue at ${ctx.transactionHash}`)
  }
}

const ReservesAddedHandler = async (event: any, ctx: TCROContext | LCROContext) => {
  const tokenType = constant.MAIN_POOLS.includes(ctx.address) ? "main_pool" : "lcro_pool"

  const tSymbol = constant.TOKEN_SYMBOL.get(ctx.address.toLowerCase())!
  const collateralSymbol = (constant.COLLATERAL_TOKENS.get(tSymbol))!
  const collateralDecimal = (constant.COLLATERAL_DECIMAL.get(collateralSymbol))!
  const protocolLiquidationRevenue = Number(scaleDown(event.args.addAmount, collateralDecimal))
  ctx.meter.Gauge("protocolLiquidationRevenue").record(protocolLiquidationRevenue, { tSymbol, coin_symbol: collateralSymbol, tokenType, project: "tectonic" })
  ctx.meter.Counter("protocolLiquidationRevenue_counter").add(protocolLiquidationRevenue, { tSymbol, coin_symbol: collateralSymbol, tokenType, project: "tectonic" })

  ctx.eventLogger.emit("ReservesAdded", {
    tSymbol,
    protocolLiquidationRevenue,
    tokenType,
    coin_symbol: collateralSymbol, project: "tectonic"
  })

}

const OnTimeIntervalHandler = async (_: any, ctx: TCROContext | LCROContext) => {
  const tokenType = constant.MAIN_POOLS.includes(ctx.address) ? "main_pool" : "lcro_pool"

  const tSymbol = constant.TOKEN_SYMBOL.get(ctx.address.toLowerCase())!
  const collateralSymbol = (constant.COLLATERAL_TOKENS.get(tSymbol))!
  const collateralDecimal = (constant.COLLATERAL_DECIMAL.get(collateralSymbol))!

  const totalBorrows = Number(await ctx.contract.totalBorrows()) / Math.pow(10, collateralDecimal)
  const totalSupply = Number(await ctx.contract.totalSupply()) / Math.pow(10, 8)
  const totalReserves = Number(await ctx.contract.totalReserves()) / Math.pow(10, collateralDecimal)
  ctx.meter.Gauge("totalBorrows").record(totalBorrows, { tSymbol, coin_symbol: collateralSymbol, tokenType, project: "tectonic" })
  ctx.meter.Gauge("totalSupply").record(totalSupply, { tSymbol, coin_symbol: collateralSymbol, tokenType, project: "tectonic" })
  ctx.meter.Gauge("totalReserves").record(totalReserves, { tSymbol, coin_symbol: collateralSymbol, tokenType, project: "tectonic" })

  // const collateralAddress = (constant.COLLATERAL_ADDRESSES.get(collateralSymbol))!
  try {
    // const tvl = Number(await getERC20Contract(ctx.chainId, collateralAddress).balanceOf(ctx.address)) / Math.pow(10, collateralDecimal)
    const tvl = Number(await ctx.contract.getCash()) / Math.pow(10, collateralDecimal)
    ctx.meter.Gauge("tvl").record(tvl, { tSymbol, coin_symbol: collateralSymbol, tokenType, project: "tectonic" })
  } catch (e) { console.log(`get tvl error at ${ctx.address}, ${ctx.transactionHash}`) }
}


//main_pools
for (let i = 0; i < constant.MAIN_POOLS.length; i++) {
  let address = constant.MAIN_POOLS[i]
  TCROProcessor.bind({
    address: address,
    network: EthChainId.CRONOS,
    // startBlock: 8000000
  })
    .onEventMint(MintEventHandler)
    .onEventBorrow(BorrowEventHandler)
    .onEventRepayBorrow(RepayBorrowEventHandler)
    .onEventRedeem(RedeemEventHandler)
    .onEventLiquidateBorrow(LiquidateBorrowHandler)
    .onEventReservesAdded(ReservesAddedHandler)
    .onEventAccrueInterest(AccrueInterestHandler)
    .onTimeInterval(OnTimeIntervalHandler, 60, 10)
}

//lcro_pools
for (let i = 0; i < constant.LCRO_POOLS.length; i++) {
  let address = constant.LCRO_POOLS[i]
  LCROProcessor.bind({
    address: address,
    network: EthChainId.CRONOS,
    // startBlock: 8000000
  })
    .onEventMint(MintEventHandler)
    .onEventBorrow(BorrowEventHandler)
    .onEventRepayBorrow(RepayBorrowEventHandler)
    .onEventRedeem(RedeemEventHandler)
    .onEventLiquidateBorrow(LiquidateBorrowHandler)
    .onEventReservesAdded(ReservesAddedHandler)
    .onEventAccrueInterest(AccrueInterestHandler)
    .onTimeInterval(OnTimeIntervalHandler, 60, 10)
}

//Tonic
TectonicCoreProcessor.bind({
  address: constant.SOCKET_ADDRESS,
  network: EthChainId.CRONOS,
  // startBlock: 8000000
})
  .onEventDistributedBorrowerTonic(async (event, ctx) => {
    const hash = event.transactionHash
    try {
      const tToken = event.args.tToken.toLowerCase()
      const borrower = event.args.borrower
      const tonicDelta = Number(event.args.tonicDelta) / Math.pow(10, 18)
      const tonicBorrowIndex = "index" + event.args.tonicBorrowIndex
      const tSymbol = constant.TOKEN_SYMBOL.get(tToken)!

      ctx.eventLogger.emit("DistributedBorrowerTonic", {
        distinctId: borrower,
        tSymbol,
        tonicDelta,
        tonicBorrowIndex,
        coin_symbol: "tonic", project: "tectonic"
      })

      ctx.meter.Counter("tonic_counter").add(tonicDelta, { tSymbol, coin_symbol: "tonic", event: "DistributedBorrowerTonic", project: "tectonic" })
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
      const tSymbol = constant.TOKEN_SYMBOL.get(tToken)!

      ctx.eventLogger.emit("DistributedSupplierTonic", {
        distinctId: supplier,
        tSymbol,
        tonicDelta,
        tonicSupplyIndex,
        coin_symbol: "tonic", project: "tectonic"
      })

      ctx.meter.Counter("tonic_counter").add(tonicDelta, { tSymbol, coin_symbol: "tonic", event: "DistributedSupplierTonic", project: "tectonic" })

    } catch (error) {
      console.log(error.message, hash)
    }


  })


//Tonic staking
const TonicStakedHandler = async (event: TonicStakedEvent, ctx: TectonicStakingPoolV3Context) => {
  ctx.eventLogger.emit("TonicStaked", {
    distinctId: event.args.user,
    tonicStaked: Number(event.args.tonicStaked) / 10 ** 18,
    xTonicMinted: Number(event.args.xTonicMinted) / 10 ** 18,
    coin_symbol: "tonic"
  })
  ctx.meter.Counter("tonic_staked_counter").add(Number(event.args.tonicStaked) / 10 ** 18)
}

const TonicUnstakedEventHandler = async (event: TonicUnstakedEvent, ctx: TectonicStakingPoolV3Context) => {
  ctx.eventLogger.emit("TonicUnstaked", {
    distinctId: event.args.user,
    xTonicLocked: Number(event.args.xTonicLocked) / 10 ** 18,
    releasableBlockNum: event.args.releasableBlockNum
  })
}

const TonicReleasedEventHandler = async (event: TonicReleasedEvent, ctx: TectonicStakingPoolV3Context) => {
  ctx.eventLogger.emit("TonicReleased", {
    distinctId: event.args.user,
    xTonicBurned: Number(event.args.xTonicBurned) / 10 ** 18,
    tonicReleased: Number(event.args.tonicReleased) / 10 ** 18,
    coin_symbol: "tonic"
  })
  ctx.meter.Counter("tonic_staked_counter").sub(Number(event.args.tonicReleased) / 10 ** 18)
}

TectonicStakingPoolV3Processor.bind({
  address: constant.TONIC_STAKING_ADDRESS,
  network: EthChainId.CRONOS,
  // startBlock: 8000000
})
  .onEventTonicStaked(TonicStakedHandler)
  .onEventTonicUnstaked(TonicUnstakedEventHandler)
  .onEventTonicReleased(TonicReleasedEventHandler)


//Tonic Vault
const DepositHandler = async (event: DepositEvent, ctx: TONICVaultContext) => {
  const pid = event.args.pid.toString()
  const amount = Number(event.args.amount) / Math.pow(10, 18)
  ctx.meter.Counter(`vault_deposit_counter`).add(amount, {
    pid
  })

  ctx.eventLogger.emit("VaultDeposit", {
    distinctId: event.args.user,
    pid,
    amount,
    stakeId: event.args.stakeId
  })
}

const UpgradeHandler = async (event: UpgradeEvent, ctx: TONICVaultContext) => {
  try {
    const userStake = await ctx.contract.getUserStake(event.args.user, event.args.stakeId, { blockTag: Number(ctx.blockNumber) - 1 })
    const amount = Number(userStake[0]) / 10 ** 18
    const previousPid = userStake[1].toString()
    ctx.eventLogger.emit("VaultUpgrade", {
      distinctId: event.args.user,
      amount,
      previousPid,
      newPid: event.args.newPid.toString(),
      stakeId: event.args.stakeId,
      newUnlockTimestamp: event.args.newUnlockTimestamp,
      newWeightedAmount: event.args.newWeightedAmount
    })
    ctx.meter.Counter(`vault_deposit_counter`).sub(amount, {
      previousPid
    })
    ctx.meter.Counter(`vault_deposit_counter`).add(amount, {
      newPid: event.args.newPid.toString()
    })
    ctx.meter.Counter(`vault_upgrade_counter`).add(amount, {
      newPid: event.args.newPid.toString()
    })
  }
  catch (e) { console.log(`get userStake error at ${ctx.transactionHash}`) }
}

const VaultWithdrawHandler = async (event: WithdrawEvent, ctx: TONICVaultContext) => {
  try {
    const userStake = await ctx.contract.getUserStake(event.args.user, event.args.stakeId, { blockTag: Number(ctx.blockNumber) - 1 })
    const pid = userStake[1].toString()
    ctx.eventLogger.emit("VaultWithdraw", {
      distinctId: event.args.user,
      amount: Number(event.args.amount) / Math.pow(10, 18),
      stakeId: event.args.stakeId,
      pid
    })
    ctx.meter.Counter(`vault_withdraw_counter`).sub(Number(event.args.amount) / Math.pow(10, 18), {
      pid
    })
  }
  catch (e) { console.log(`get userStake error 2 at ${ctx.transactionHash}`) }
}

TONICVaultProcessor.bind({
  address: constant.TONIC_VAULT_ADDRESS,
  network: EthChainId.CRONOS,
  // startBlock: 8000000
})
  .onEventDeposit(DepositHandler)
  .onEventUpgrade(UpgradeHandler)
  .onEventWithdraw(VaultWithdrawHandler)


//repay with collateral
const SwapAndRepayHandler = async (call: SwapAndRepayCallTrace,
  ctx: DeferLiquidityCheckAdapterContext) => {
  const path = call.args.path
  const collateral_address = path[path.length - 1]

  let collateralSymbol = "unk"
  for (let symbol in constant.COLLATERAL_ADDRESSES) {
    if (constant.COLLATERAL_ADDRESSES.get(symbol) == collateral_address) {
      collateralSymbol = symbol
      break
    }
  }
  if (collateralSymbol == "unk") {
    console.log(`get collateral symbol failed at ${ctx.transactionHash}`)
    return
  }
  const collateralDecimal = (constant.COLLATERAL_DECIMAL.get(collateralSymbol))!
  const repayAmount = Number(call.args.repayAmount) / Math.pow(10, collateralDecimal)
  ctx.eventLogger.emit("SwapAndRepay", {
    distinctId: call.args.account,
    tTokenAmount: call.args.tTokenAmount,
    repayAmount,
    collateralSymbol
  })
}

DeferLiquidityCheckAdapterProcessor.bind({
  address: constant.REPAY_WITH_COLLATERAL,
  network: EthChainId.CRONOS,
  // startBlock: 8000000
})
  .onCallSwapAndRepay(SwapAndRepayHandler)