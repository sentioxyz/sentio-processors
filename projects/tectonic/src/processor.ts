import { Counter, Gauge, scaleDown } from '@sentio/sdk'
import { ERC20Processor } from '@sentio/sdk/eth/builtin'
import * as constant from "./constant.js"
import { TCROContext, TCROProcessor, LiquidateBorrowEvent, AccrueInterestEvent } from './types/eth/tcro.js'
import { LCROContext, LCROProcessor } from './types/eth/lcro.js'
import { getPriceBySymbol } from '@sentio/sdk/utils'
import { WCROProcessor, TransferEvent, WCROContext } from './types/eth/wcro.js'
import { TectonicCoreProcessor } from './types/eth/tectoniccore.js'
import { EthChainId } from "@sentio/sdk/eth";

// import './aave_v3.js'
import { TectonicStakingPoolV3Context, TectonicStakingPoolV3Processor, TonicReleasedEvent, TonicStakedEvent, TonicUnstakedEvent } from './types/eth/tectonicstakingpoolv3.js'
import { DepositEvent, ReplaceNftsBurnTokenEvent, ReplaceNftsMintTokenEvent, StakeNftEvent, TONICVaultContext, TONICVaultProcessor, UnStakeNftEvent, UpgradeEvent, WithdrawEvent } from './types/eth/tonicvault.js'
import { CreateLongNShortPositionEvent, DeferLiquidityCheckAdapterContext, DeferLiquidityCheckAdapterProcessor, FlashLoanAndLiquidateCallTrace, SwapAndDepositCallTrace, SwapAndDepositEvent, SwapAndRepayCallTrace, SwapAndRepayEvent } from './types/eth/deferliquiditycheckadapter.js'

const MintEventHandler = async (event: any, ctx: TCROContext | LCROContext) => {
  let tokenType
  if (constant.MAIN_POOLS.includes(ctx.address)) {
    tokenType = "main_pool"
  }
  else if (constant.DEFI_POOLS.includes(ctx.address)) {
    tokenType = "defi_pool"
  }
  else {
    tokenType = "lcro_pool"
  }

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
  let tokenType
  if (constant.MAIN_POOLS.includes(ctx.address)) {
    tokenType = "main_pool"
  }
  else if (constant.DEFI_POOLS.includes(ctx.address)) {
    tokenType = "defi_pool"
  }
  else {
    tokenType = "lcro_pool"
  }
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
  let tokenType
  if (constant.MAIN_POOLS.includes(ctx.address)) {
    tokenType = "main_pool"
  }
  else if (constant.DEFI_POOLS.includes(ctx.address)) {
    tokenType = "defi_pool"
  }
  else {
    tokenType = "lcro_pool"
  }
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
  let tokenType
  if (constant.MAIN_POOLS.includes(ctx.address)) {
    tokenType = "main_pool"
  }
  else if (constant.DEFI_POOLS.includes(ctx.address)) {
    tokenType = "defi_pool"
  }
  else {
    tokenType = "lcro_pool"
  }
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
  let tokenType
  if (constant.MAIN_POOLS.includes(ctx.address)) {
    tokenType = "main_pool"
  }
  else if (constant.DEFI_POOLS.includes(ctx.address)) {
    tokenType = "defi_pool"
  }
  else {
    tokenType = "lcro_pool"
  }
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
  let tokenType
  if (constant.MAIN_POOLS.includes(ctx.address)) {
    tokenType = "main_pool"
  }
  else if (constant.DEFI_POOLS.includes(ctx.address)) {
    tokenType = "defi_pool"
  }
  else {
    tokenType = "lcro_pool"
  }

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
  let tokenType
  if (constant.MAIN_POOLS.includes(ctx.address)) {
    tokenType = "main_pool"
  }
  else if (constant.DEFI_POOLS.includes(ctx.address)) {
    tokenType = "defi_pool"
  }
  else {
    tokenType = "lcro_pool"
  }

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
  let tokenType
  if (constant.MAIN_POOLS.includes(ctx.address)) {
    tokenType = "main_pool"
  }
  else if (constant.DEFI_POOLS.includes(ctx.address)) {
    tokenType = "defi_pool"
  }
  else {
    tokenType = "lcro_pool"
  }
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


// //main_pools
// for (let i = 0; i < constant.MAIN_POOLS.length; i++) {
//   let address = constant.MAIN_POOLS[i]
//   TCROProcessor.bind({
//     address: address,
//     network: EthChainId.CRONOS,
//     // startBlock: 570286
//   })
//     .onEventMint(MintEventHandler)
//     .onEventBorrow(BorrowEventHandler)
//     .onEventRepayBorrow(RepayBorrowEventHandler)
//     .onEventRedeem(RedeemEventHandler)
//     .onEventLiquidateBorrow(LiquidateBorrowHandler)
//     .onEventReservesAdded(ReservesAddedHandler)
//     .onEventAccrueInterest(AccrueInterestHandler)
//     .onTimeInterval(OnTimeIntervalHandler, 60, 10)
// }

// //lcro_pools
// for (let i = 0; i < constant.LCRO_POOLS.length; i++) {
//   let address = constant.LCRO_POOLS[i]
//   LCROProcessor.bind({
//     address: address,
//     network: EthChainId.CRONOS,
//     // startBlock: 570286
//   })
//     .onEventMint(MintEventHandler)
//     .onEventBorrow(BorrowEventHandler)
//     .onEventRepayBorrow(RepayBorrowEventHandler)
//     .onEventRedeem(RedeemEventHandler)
//     .onEventLiquidateBorrow(LiquidateBorrowHandler)
//     .onEventReservesAdded(ReservesAddedHandler)
//     .onEventAccrueInterest(AccrueInterestHandler)
//     .onTimeInterval(OnTimeIntervalHandler, 60, 10)
// }

//defi_pools
for (let i = 0; i < constant.DEFI_POOLS.length; i++) {
  let address = constant.DEFI_POOLS[i]
  LCROProcessor.bind({
    address: address,
    network: EthChainId.CRONOS,
    // startBlock: 12672954
  })
    .onEventMint(
        MintEventHandler
    )
    // .onEventBorrow(BorrowEventHandler)
    // .onEventRepayBorrow(RepayBorrowEventHandler)
    // .onEventRedeem(RedeemEventHandler)
    // .onEventLiquidateBorrow(LiquidateBorrowHandler)
    // .onEventReservesAdded(ReservesAddedHandler)
    // .onEventAccrueInterest(AccrueInterestHandler)
    // .onTimeInterval(OnTimeIntervalHandler, 60, 10)
}

// //Tonic
// TectonicCoreProcessor.bind({
//   address: constant.SOCKET_ADDRESS,
//   network: EthChainId.CRONOS,
//   // startBlock: 570286
// })
//   .onEventDistributedBorrowerTonic(async (event, ctx) => {


//     const hash = event.transactionHash
//     try {
//       const tToken = event.args.tToken.toLowerCase()
//       const borrower = event.args.borrower
//       const tonicDelta = Number(event.args.tonicDelta) / Math.pow(10, 18)
//       const tonicBorrowIndex = "index" + event.args.tonicBorrowIndex
//       const tSymbol = constant.TOKEN_SYMBOL.get(tToken)!

//       ctx.eventLogger.emit("DistributedBorrowerTonic", {
//         distinctId: borrower,
//         tSymbol,
//         tonicDelta,
//         tonicBorrowIndex,
//         coin_symbol: "tonic", project: "tectonic"
//       })

//       ctx.meter.Counter("tonic_counter").add(tonicDelta, { tSymbol, coin_symbol: "tonic", event: "DistributedBorrowerTonic", project: "tectonic" })
//     } catch (error) {
//       console.log(error.message, hash)
//     }
//   })
//   .onEventDistributedSupplierTonic(async (event, ctx) => {


//     const hash = event.transactionHash

//     try {
//       const tToken = event.args.tToken.toLowerCase()
//       const supplier = event.args.supplier
//       let tonicDelta = 0
//       tonicDelta = Number(event.args.tonicDelta) / Math.pow(10, 18)
//       let tonicSupplyIndex = ""
//       tonicSupplyIndex = "index" + event.args.tonicSupplyIndex
//       const tSymbol = constant.TOKEN_SYMBOL.get(tToken)!

//       ctx.eventLogger.emit("DistributedSupplierTonic", {
//         distinctId: supplier,
//         tSymbol,
//         tonicDelta,
//         tonicSupplyIndex,
//         coin_symbol: "tonic", project: "tectonic"
//       })

//       ctx.meter.Counter("tonic_counter").add(tonicDelta, { tSymbol, coin_symbol: "tonic", event: "DistributedSupplierTonic", project: "tectonic" })

//     } catch (error) {
//       console.log(error.message, hash)
//     }
//   })



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
  ctx.meter.Counter("tonic_released_counter").add(Number(event.args.tonicReleased) / 10 ** 18)

}

// TectonicStakingPoolV3Processor.bind({
//   address: constant.TONIC_STAKING_ADDRESS,
//   network: EthChainId.CRONOS,
//   // startBlock: 570286
// })
//   .onEventTonicStaked(TonicStakedHandler)
//   .onEventTonicUnstaked(TonicUnstakedEventHandler)
//   .onEventTonicReleased(TonicReleasedEventHandler)


//Tonic Vault
const DepositHandler = async (event: DepositEvent, ctx: TONICVaultContext) => {
  const pid = event.args.pid.toString() || "no pid"
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
      pid: previousPid
    })
    ctx.meter.Counter(`vault_deposit_counter`).add(amount, {
      pid: event.args.newPid.toString()
    })
    ctx.meter.Counter(`vault_upgrade_counter`).add(amount, {
      pid: event.args.newPid.toString()
    })
  }
  catch (e) { console.log(`get userStake error at ${ctx.transactionHash}`) }
}

const VaultWithdrawHandler = async (event: WithdrawEvent, ctx: TONICVaultContext) => {
  try {
    const userStake = await ctx.contract.getUserStake(event.args.user, event.args.stakeId, { blockTag: Number(ctx.blockNumber) - 1 })
    console.log(`user stake ${userStake[0]}, ${userStake[1]}`)
    const pid = userStake[1].toString()
    ctx.eventLogger.emit("VaultWithdraw", {
      distinctId: event.args.user,
      amount: Number(event.args.amount) / Math.pow(10, 18),
      stakeId: event.args.stakeId,
      pid
    })
    ctx.meter.Counter(`vault_withdraw_counter`).add(Number(event.args.amount) / Math.pow(10, 18), {
      pid
    })
    ctx.meter.Counter(`vault_deposit_counter`).sub(Number(event.args.amount) / Math.pow(10, 18), {
      pid
    })
  }
  catch (e) { console.log(`get userStake error 2 at ${ctx.transactionHash}`) }
}

const StakeNftHandler = async (event: StakeNftEvent, ctx: TONICVaultContext) => {
  const tokenNumbers = event.args.tokenIds.length
  ctx.eventLogger.emit("StakeNft", {
    distinctId: event.args.user,
    pid: event.args.pid.toString(),
    tokenContract: event.args.tokenContract,
    tokenNumbers
  })
  ctx.meter.Counter(`vault_staked_nft_counter`).add(tokenNumbers, {
    pid: event.args.pid.toString(),
    tokenContract: event.args.tokenContract
  })
}

const UnstakeNftHandler = async (event: UnStakeNftEvent, ctx: TONICVaultContext) => {
  const tokenNumbers = event.args.tokenIds.length
  ctx.eventLogger.emit("UnstakeNft", {
    distinctId: event.args.user,
    pid: event.args.pid.toString(),
    tokenContract: event.args.tokenContract,
    tokenNumbers
  })
  ctx.meter.Counter(`vault_staked_nft_counter`).sub(tokenNumbers, {
    pid: event.args.pid.toString(),
    tokenContract: event.args.tokenContract
  })
}

const ReplaceNftsMintTokenHandler = async (event: ReplaceNftsMintTokenEvent, ctx: TONICVaultContext) => {
  const stakeTokenNumbers = event.args.stakeTokenIds.length
  const unstakeTokenNumbers = event.args.unstakeTokenIds.length
  const deltaBoostAmount = event.args.deltaBoostAmount
  ctx.eventLogger.emit("ReplaceNftMintToken", {
    distinctId: event.args.user,
    pid: event.args.pid.toString(),
    tokenContract: event.args.tokenContract,
    stakeTokenNumbers,
    unstakeTokenNumbers,
    deltaBoostAmount
  })
  ctx.meter.Counter(`vault_staked_nft_counter`).add(stakeTokenNumbers - unstakeTokenNumbers, {
    pid: event.args.pid.toString(),
    tokenContract: event.args.tokenContract
  })
}

const ReplaceNftsBurnTokenHandler = async (event: ReplaceNftsBurnTokenEvent, ctx: TONICVaultContext) => {
  const stakeTokenNumbers = event.args.stakeTokenIds.length
  const unstakeTokenNumbers = event.args.unstakeTokenIds.length
  const deltaBoostAmount = event.args.deltaBoostAmount
  ctx.eventLogger.emit("ReplaceNftBurnToken", {
    distinctId: event.args.user,
    pid: event.args.pid.toString(),
    tokenContract: event.args.tokenContract,
    stakeTokenNumbers,
    unstakeTokenNumbers,
    deltaBoostAmount
  })
  ctx.meter.Counter(`vault_staked_nft_counter`).add(stakeTokenNumbers - unstakeTokenNumbers, {
    pid: event.args.pid.toString(),
    tokenContract: event.args.tokenContract
  })
}

// TONICVaultProcessor.bind({
//   address: constant.TONIC_VAULT_ADDRESS,
//   network: EthChainId.CRONOS,
//   // startBlock: 570286
// })
//   .onEventDeposit(DepositHandler)
//   .onEventUpgrade(UpgradeHandler)
//   .onEventWithdraw(VaultWithdrawHandler)
//   .onEventStakeNft(StakeNftHandler)
//   .onEventUnStakeNft(UnstakeNftHandler)
//   .onEventReplaceNftsMintToken(ReplaceNftsMintTokenHandler)
//   .onEventReplaceNftsBurnToken(ReplaceNftsBurnTokenHandler)

const SwapAndRepayEventHandler = async (event: SwapAndRepayEvent,
  ctx: DeferLiquidityCheckAdapterContext) => {
  const tSymbol = constant.TOKEN_SYMBOL.get(event.args.tTokenTo.toLowerCase())!
  const collateralSymbol = (constant.COLLATERAL_TOKENS.get(tSymbol))!
  const collateralDecimal = (constant.COLLATERAL_DECIMAL.get(collateralSymbol))!
  ctx.eventLogger.emit("SwapAndRepay", {
    distinctId: event.args.user,
    tTokenFrom: event.args.tTokenFrom,
    swapFromAmount: event.args.swapFromAmount,
    tTokenTo: event.args.tTokenTo,
    actualRepayAmount: scaleDown(event.args.actualRepayAmount, collateralDecimal),
    coin_symbol: collateralSymbol
  })
  ctx.meter.Counter("repay_with_collateral_amount").add(scaleDown(event.args.actualRepayAmount, collateralDecimal), { coin_symbol: collateralSymbol })
}

const SwapAndDepositEventHandler = async (event: SwapAndDepositEvent,
  ctx: DeferLiquidityCheckAdapterContext) => {
  const tSymbol = constant.TOKEN_SYMBOL.get(event.args.tTokenTo.toLowerCase())!
  const collateralSymbol = (constant.COLLATERAL_TOKENS.get(tSymbol))!
  const collateralDecimal = (constant.COLLATERAL_DECIMAL.get(collateralSymbol))!
  ctx.eventLogger.emit("SwapAndDeposit", {
    distinctId: event.args.user,
    tTokenFrom: event.args.tTokenFrom,
    swapFromAmount: event.args.swapFromAmount,
    tTokenTo: event.args.tTokenTo,
    swapToAmount: scaleDown(event.args.swapToAmount, collateralDecimal),
    coin_symbol: collateralSymbol
  })
  ctx.meter.Counter("collateral_swap_amount").add(scaleDown(event.args.swapToAmount, collateralDecimal), { coin_symbol: collateralSymbol })
}

const CreateLongNShortPositionEventHandler = async (event: CreateLongNShortPositionEvent, ctx: DeferLiquidityCheckAdapterContext) => {
  const tSymbol = constant.TOKEN_SYMBOL.get(event.args.tTokenToLong.toLowerCase())!
  const collateralSymbol = (constant.COLLATERAL_TOKENS.get(tSymbol))!
  const collateralDecimal = (constant.COLLATERAL_DECIMAL.get(collateralSymbol))!
  ctx.eventLogger.emit("CreateLongNShortPosition", {
    distinctId: event.args.user,
    tTokenToShort: event.args.tTokenToShort,
    shortAmount: event.args.shortAmount,
    tTokenToLong: event.args.tTokenToLong,
    longAmount: event.args.longAmount,
    finalLongAmount: Number(event.args.finalLongAmount) / 10 ** collateralDecimal,
    coin_symbol: collateralSymbol
  })
  //to check
  ctx.meter.Counter("finalLong_amount").add(Number(event.args.finalLongAmount) / 10 ** collateralDecimal, { coin_symbol: collateralSymbol })
}

const FlashLoanAndLiquidateCallHandler = async (call: FlashLoanAndLiquidateCallTrace, ctx: DeferLiquidityCheckAdapterContext) => {
  if (call.error) {
    return
  }
  const tSymbol = constant.TOKEN_SYMBOL.get(call.args.repayTToken.toLowerCase())!
  const collateralSymbol = (constant.COLLATERAL_TOKENS.get(tSymbol))!
  const collateralDecimal = (constant.COLLATERAL_DECIMAL.get(collateralSymbol))!
  const repayAmount = Number(call.args.repayAmount) / 10 ** collateralDecimal
  ctx.eventLogger.emit("FlashLoanAndLiquidate", {
    distinctId: call.args.borrower,
    repayTToken: call.args.repayTToken,
    seizeTToken: call.args.seizeTToken,
    repayAmount,
    coin_symbol: collateralSymbol
  })
  ctx.meter.Counter("liquidation_bot_amount").add(repayAmount, { coin_symbol: collateralSymbol })
}

// DeferLiquidityCheckAdapterProcessor.bind({
//   address: constant.REPAY_WITH_COLLATERAL,
//   network: EthChainId.CRONOS,
//   // startBlock: 10524700
// })
//   .onEventSwapAndRepay(SwapAndRepayEventHandler)
//   .onEventSwapAndDeposit(SwapAndDepositEventHandler)
//   .onEventCreateLongNShortPosition(CreateLongNShortPositionEventHandler)
//   .onCallFlashLoanAndLiquidate(FlashLoanAndLiquidateCallHandler)
