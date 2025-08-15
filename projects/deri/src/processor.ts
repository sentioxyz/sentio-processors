import { DTokenContext, DTokenProcessor, getDTokenContract, getDTokenContractOnContext, TransferEvent } from "./types/eth/dtoken.js";
import { PoolContext, PoolProcessor, NewImplementationEvent, getPoolContract, getPoolContractOnContext } from "./types/eth/pool.js";
import {
  getPoolImplementationContractOnContext,
  PoolImplementationContext,
  PoolImplementationProcessor,
  AddMarketEvent,
  AddMarginEvent,
  AddLiquidityEvent,
  RemoveLiquidityEvent,
  RemoveMarginEvent,
  PoolImplementationBoundContractView
} from "./types/eth/poolimplementation.js";
import { getVBep20DelegatorContractOnContext } from "./types/eth/vbep20delegator.js";
import { EventLogger } from "@sentio/sdk";
import { BigDecimal, Gauge } from "@sentio/sdk"
import { ignoreEthCallException, token } from "@sentio/sdk/utils"
import { getVaultImplementationContractOnContext } from "./types/eth/vaultimplementation.js";
import { AddSymbolEvent, getSymbolManagerImplementationContractOnContext, RemoveSymbolEvent, SymbolManagerImplementationBoundContractView, SymbolManagerImplementationContext, SymbolManagerImplementationProcessor, TradeEvent } from "./types/eth/symbolmanagerimplementation.js";
import { getComptrollerContractOnContext } from "./types/eth/comptroller.js";
import { getVenusChainlinkOracleContractOnContext, VenusChainlinkOracleBoundContractView } from "./types/eth/venuschainlinkoracle.js";
import { EthChainId, EthContext } from "@sentio/sdk/eth";
import { getSymbolContractOnContext, SymbolProcessor, SymbolContext, SymbolProcessorTemplate } from "./types/eth/symbol.js";
import { getSymbolImplementationFuturesContractOnContext } from "./types/eth/symbolimplementationfutures.js";
import { getSymbolImplementationPowerContractOnContext } from "./types/eth/symbolimplementationpower.js"
import { getSymbolImplementationGammaContract, getSymbolImplementationGammaContractOnContext } from "./types/eth/symbolimplementationgamma.js"
import { ethers } from 'ethers';
import { getSymbolImplementationOptionContractOnContext } from "./types/eth/symbolimplementationoption.js";


const poolState = EventLogger.register("PoolState")
const poolInfo = EventLogger.register("PoolInfo")
const lpState = EventLogger.register("LpState")
const marketState = EventLogger.register("MarketState")
const marketInfo = EventLogger.register("MarketInfo")
const indexedSymbols = EventLogger.register("IndexedSymbols")
const tdState = EventLogger.register("TdState")
const positionState = EventLogger.register("PositionState")
const vaultInfo = EventLogger.register("VaultInfo")
const vaultBalanceInfo = EventLogger.register("VaultBalanceInfo")
const symbolManagerState = EventLogger.register("SymbolManagerState")
const symbolState = EventLogger.register("SymbolState")
const symbolInfo = EventLogger.register("SymbolInfo")

const symbolTemplate = new SymbolProcessorTemplate()
    .onEventNewImplementation(onSymbolImplementation)

async function getMarket(underlying: string, poolContract: PoolImplementationBoundContractView) {
  if (underlying == ethers.ZeroAddress) {
    return poolContract.vTokenETH()
  }
  const tokenB0 = await poolContract.tokenB0()
  if (underlying == tokenB0) {
    return poolContract.vTokenB0()
  } else {
    return poolContract.markets(underlying)
  }
}

async function recordMarketsIn(ctx: EthContext, marketsIn: string[], eventName: string, vault: string, oracleContract: VenusChainlinkOracleBoundContractView) {
  for (var idx = 0; idx < marketsIn.length; idx++) {
    const market = marketsIn[idx]
    if (market.toLocaleLowerCase() == "0xA07c5b74C9B40447a954e1466938b865b6BBea36".toLowerCase()) {
      //VBNB
      ctx.eventLogger.emit(eventName + "_MarketsIn", {
        vToken: market,
        vTokenSymbol: "VBNB",
      })

    } else {
      const marketContract = getVBep20DelegatorContractOnContext(ctx, market)
      const vToken = market
      const underlying = await marketContract.underlying()
      const vTokenSymbol = await marketContract.symbol()
      const underlyingToken = await token.getERC20TokenInfo(ctx.chainId, underlying)
      const underlyingSymbol = underlyingToken.symbol
      const underlyingPrice = await oracleContract.getUnderlyingPrice(market)
      const exchangeRate = await marketContract.exchangeRateStored()
      const vTokenBalance = await marketContract.balanceOf(vault)
      ctx.eventLogger.emit(eventName + "_MarketsIn", {
        vToken,
        underlying,
        underlyingSymbol,
        vTokenSymbol,
        underlyingPrice,
        exchangeRate,
        vTokenBalance
      })
    }
  }
}

async function recordSymbols(ctx: EthContext, symbolManagerContract: SymbolManagerImplementationBoundContractView, event: AddLiquidityEvent | RemoveLiquidityEvent) {
  try {
  //symbols
    const symbolsLength = await symbolManagerContract.getSymbolsLength()
    for (var i = 0; i < symbolsLength; i++) {
      const symbol = await symbolManagerContract.indexedSymbols(i)
      const symbolContract = getSymbolContractOnContext(ctx, symbol)
      const symbolName = await symbolContract.symbol()
      const indexPrice = await symbolContract.indexPrice()
      const fundingTimestamp = await symbolContract.fundingTimestamp()
      const tradersPnl = await symbolContract.tradersPnl()
      const initialMarginRequired = await symbolContract.initialMarginRequired()
      const type = symbolType(symbolName)
      if (type == "futures" || type == "option" || type == "power") {
        const cumulativeFundingPerVolume = await symbolContract.cumulativeFundingPerVolume()
        const netVolume = await symbolContract.netVolume()
        if (netVolume != 0n) {
          symbolState.emit(ctx, {
            pool: event.address,
            symbolAddress: symbol,
            symbol: symbolName,
            indexPrice,
            fundingTimestamp,
            cumulativeFundingPerVolume,
            tradersPnl,
            initialMarginRequired,
          })
        }
      } else {
        const gammaContract = getSymbolImplementationGammaContractOnContext(ctx, symbol)
        const netPowerVolume = await gammaContract.netPowerVolume()

        if (netPowerVolume != 0n) {
          const cumulaitveFundingPerPowerVolume = await gammaContract.cumulaitveFundingPerPowerVolume()
          const cumulativeFundingPerRealFuturesVolume = await gammaContract.cumulativeFundingPerRealFuturesVolume()
          symbolState.emit(ctx, {
            pool: event.address,
            symbol: symbolName,
            symbolAddress: symbol,
            indexPrice,
            fundingTimestamp,
            cumulaitveFundingPerPowerVolume,
            cumulativeFundingPerRealFuturesVolume,
            tradersPnl,
            initialMarginRequired,
          })
        }
      }
    }
  } catch (e) {
    console.log("symbol" + event.name + ctx.blockNumber)
    console.log(event)
    console.log(e)
  }
}

async function recordSymbolsForMargin(ctx: EthContext, symbolManagerContract: SymbolManagerImplementationBoundContractView, event: AddMarginEvent | RemoveMarginEvent) {
  try {
  //symbols
    const symbolsLength = await symbolManagerContract.getSymbolsLength()
    for (var i = 0; i < symbolsLength; i++) {
      const symbol = await symbolManagerContract.indexedSymbols(i)
      const symbolContract = getSymbolContractOnContext(ctx, symbol)
      const symbolName = await symbolContract.symbol()
      const indexPrice = await symbolContract.indexPrice()
      const fundingTimestamp = await symbolContract.fundingTimestamp()
      const tradersPnl = await symbolContract.tradersPnl()
      const initialMarginRequired = await symbolContract.initialMarginRequired()
      // const netVolume = await symbolContract.netVolume()
      const type = symbolType(symbolName)
      if (type == "futures" || type == "option" || type == "power") {
        const cumulativeFundingPerVolume = await symbolContract.cumulativeFundingPerVolume()
        symbolState.emit(ctx, {
          pool: event.address,
          symbolAddress: symbol,
          symbol: symbolName,
          indexPrice,
          fundingTimestamp,
          cumulativeFundingPerVolume,
          tradersPnl,
          initialMarginRequired,
        })
      } else {
          const gammaContract = getSymbolImplementationGammaContractOnContext(ctx, symbol)
          const cumulaitveFundingPerPowerVolume = await gammaContract.cumulaitveFundingPerPowerVolume()
          const cumulativeFundingPerRealFuturesVolume = await gammaContract.cumulativeFundingPerRealFuturesVolume()
          symbolState.emit(ctx, {
            pool: event.address,
            symbol: symbolName,
            symbolAddress: symbol,
            indexPrice,
            fundingTimestamp,
            cumulaitveFundingPerPowerVolume,
            cumulativeFundingPerRealFuturesVolume,
            tradersPnl,
            initialMarginRequired,
          })
      }
    }
  } catch (e) {
    console.log("symbol" + event.name + ctx.blockNumber)
    console.log(event)
    console.log(e)
  }
}


async function recordSymbolsForTrade(
  ctx: EthContext,
  symbolManagerContract: SymbolManagerImplementationBoundContractView,
  pool: string,
  evt: TradeEvent,
  activeSymbols: Set<string>) {
  try {
  //symbols
  const symbolsLength = await symbolManagerContract.getSymbolsLength()
  const pTokenId = evt.args.pTokenId
  for (var symbol of activeSymbols) {
    const symbolContract = getSymbolImplementationFuturesContractOnContext(ctx, symbol)
    const symbolId = await symbolContract.symbolId()
    const symbolName = await symbolContract.symbol()
      const type = symbolType(symbolName)
      if (type == "futures" || type == "option" || type == "power") {
        const netVolume = await symbolContract.netVolume()
        const netCost = await symbolContract.netCost()
        const indexPrice = await symbolContract.indexPrice()
        const fundingTimestamp = await symbolContract.fundingTimestamp()
        const cumulativeFundingPerVolume = await symbolContract.cumulativeFundingPerVolume()
        const tradersPnl = await symbolContract.tradersPnl()
        const initialMarginRequired = await symbolContract.initialMarginRequired()
        const nPositionHolders = await symbolContract.nPositionHolders()
        const lastNetVolume = await symbolContract.lastNetVolume()
        const lastNetVolumeBlock = await symbolContract.lastNetVolumeBlock()
        // var openVolume
        // try {
        //  openVolume = await symbolContract.openVolume()
        // } catch (e) {
        //   console.log("error fetching openVolume")
        //   console.log(e)
        // }

        const position = await symbolContract.positions(pTokenId)

        symbolState.emit(ctx, {
          pool,
          symbol: symbolName,
          symbolAddress: symbol,
          netVolume,
          netCost,
          indexPrice,
          fundingTimestamp,
          cumulativeFundingPerVolume,
          tradersPnl,
          initialMarginRequired,
          nPositionHolders,
          lastNetVolume,
          lastNetVolumeBlock,
          // openVolume
        })
          positionState.emit(ctx, {
            pool,
            symbol: symbolName,
            symbolAddress: symbol,
            pTokenId: pTokenId,
            volume: position.volume,
            cost: position.cost,
            cumulativeFundingPerVolume: position.cumulativeFundingPerVolume
          })
        } else {
        const symbolGammaContract = getSymbolImplementationGammaContractOnContext(ctx, symbol)
        // const indexPrice = await symbolGammaContract.indexPrice()
        // const fundingTimestamp = await symbolGammaContract.fundingTimestamp()
        // const cumulaitveFundingPerPowerVolume = await symbolGammaContract.cumulaitveFundingPerPowerVolume()
        // const cumulativeFundingPerRealFuturesVolume = await symbolGammaContract.cumulativeFundingPerRealFuturesVolume()
        // const tradersPnl = await symbolGammaContract.tradersPnl()
        // const initialMarginRequired = await symbolGammaContract.initialMarginRequired()
        // const netPowerVolume = await symbolGammaContract.netPowerVolume()
        // const netRealFuturesVolume = await symbolGammaContract.netRealFuturesVolume()
        // const netCost = await symbolGammaContract.netCost()
        // const nPositionHolders = await symbolGammaContract.nPositionHolders()
        const position = await symbolGammaContract.positions(pTokenId)

        positionState.emit(ctx, {
          pool,
          symbol: symbolName,
          symbolAddress: symbol,
          powerVolume: position.powerVolume,
          realFuturesVolume: position.realFuturesVolume,
          cost: position.cost,
          cumulaitveFundingPerPowerVolume: position.cumulaitveFundingPerPowerVolume,
          cumulativeFundingPerRealFuturesVolume: position.cumulativeFundingPerRealFuturesVolume
        })
      }
    }
} catch (e) {
  console.log(evt)
  console.log("symbol" + evt.name + ctx.blockNumber)
  console.log(e)
}
}

function isSettled(evt: TradeEvent, symbolId: string, activeSymbols: string[]) {
  if (evt.args.symbolId.toLowerCase() == symbolId.toLowerCase()) {
    return true
  }
  for (var i = 0; i < activeSymbols.length; i ++) {
    if ((activeSymbols[i]).toLowerCase() == symbolId.toLowerCase()) {
      return true
    }
  }
  return false
}

function symbolType(symbol: string) {
  if (symbol.endsWith('-C') || symbol.endsWith('-P')) {
    return 'option'
  }
  if (symbol.endsWith('^2')) {
    return 'power'
  }
  if (symbol.endsWith('-Gamma')) {
    return 'gamma'
  }
  return 'futures'
}

async function onTransfer(evt: TransferEvent, ctx: DTokenContext) {
  const tokenId = evt.args.tokenId
  const from = evt.args.from
  const to = evt.args.to

  ctx.meter.Counter("totalMinted").add(1)
  ctx.eventLogger.emit("Dtoken_minted", {
    message: `token transferred from ${from} to ${to} for tokenId: ${tokenId}`,
    tokenId,
    from,
    to
  })
}

async function onImplementation(evt: NewImplementationEvent, ctx: PoolContext) {
  try {
    const address = evt.args.newImplementation
    const newContract = getPoolImplementationContractOnContext(ctx, ctx.address)
    const poolProxyContract = getPoolContractOnContext(ctx, ctx.address)

    const vaultTemplate = await newContract.vaultTemplate()
    const tokenWETH = await newContract.tokenWETH()
    const lToken = await newContract.lToken()
    const pToken = await newContract.pToken()
    const oracleManager = await newContract.oracleManager()
    const swapper = await newContract.swapper()
    const privileger = await ignoreEthCallException(newContract.privileger(), false)
    const rewardVault = await ignoreEthCallException(newContract.rewardVault())

    // try {
    //   privileger = await newContract.privileger()
    //   rewardVault = await newContract.rewardVault()
    // } catch (e) {
    //   console.log("error fetching privileger or rewardVault")
    //   console.log(e)
    // }
    const decimalsB0 = await newContract.decimalsB0()
    const reserveRatioB0 = await newContract.reserveRatioB0()
    const minRatioB0 = await newContract.minRatioB0()
    const poolInitialMarginMultiplier = await newContract.poolInitialMarginMultiplier()
    const protocolFeeCollectRatio = await newContract.protocolFeeCollectRatio()
    const minLiquidationReward = await newContract.minLiquidationReward()
    const maxLiquidationReward = await newContract.maxLiquidationReward()
    const liquidationRewardCutRatio = await newContract.liquidationRewardCutRatio()
    const tokenB0 = await newContract.tokenB0()
    const vTokenB0 = await newContract.vTokenB0()
    const vTokenETH = await newContract.vTokenETH()
    const vaultImplementation = await newContract.vaultImplementation()
    // await newContract.vaultImplementation.comptroller() need ABI
    const symbolManager = await newContract.symbolManager()

    poolInfo.emit(ctx, {
      pool: address,
      vaultTemplate,
      vaultImplementation,
      tokenB0,
      tokenWETH,
      vTokenB0,
      vTokenETH,
      lToken,
      pToken,
      oracleManager,
      swapper,
      symbolManager,
      privileger,
      rewardVault,
      decimalsB0,
      reserveRatioB0,
      minRatioB0,
      poolInitialMarginMultiplier,
      protocolFeeCollectRatio,
      minLiquidationReward,
      maxLiquidationReward,
      liquidationRewardCutRatio,
      message: "new implementation deployed"
    })
  } catch (e) {
    console.log(evt)
    console.log(e)
  }
}

async function onAddMarket(evt: AddMarketEvent, ctx: PoolImplementationContext) {
  const market = evt.args.market
  const marketContract = getVBep20DelegatorContractOnContext(ctx, market)
  const underlying = await marketContract.underlying()
  const marketSymbol = await marketContract.symbol()
  const underlyingToken = await token.getERC20TokenInfo(ctx.chainId, underlying)
  const assetSymbol = underlyingToken.symbol

  marketInfo.emit(ctx, {
    pool: evt.address,
    asset: underlying,
    market,
    assetSymbol,
    marketSymbol,
  })
}

async function onChangeLiquidity(evt: AddLiquidityEvent | RemoveLiquidityEvent, ctx: PoolImplementationContext) {
  // try {
    const address = evt.address
    const underlying = evt.args.underlying
    const lTokenId = evt.args.lTokenId
    const poolContract = getPoolImplementationContractOnContext(ctx, evt.address)
    const lToken = await poolContract.lToken()
    const lTokenContract = getDTokenContractOnContext(ctx, lToken)
    const liquidity =  await poolContract.liquidity()
    const lpsPnl = await poolContract.lpsPnl()
    const cumulativePnlPerLiquidity = await poolContract.cumulativePnlPerLiquidity()
    const lpInfo = await poolContract.lpInfos(lTokenId)
    const account = await lTokenContract.getOwnerOf(lTokenId)

    poolState.emit(ctx, {
      pool: address,
      liquidity,
      lpsPnl,
      cumulativePnlPerLiquidity
    })

    //vault
    const vault = lpInfo.vault

    const vaultContract = getVaultImplementationContractOnContext(ctx, vault)
    const vaultLiquidity = await vaultContract.getVaultLiquidity()
    const vaultComptroller = await vaultContract.comptroller()
    const comptrollerContract = getComptrollerContractOnContext(ctx, vaultComptroller)
    const oracle = await comptrollerContract.oracle()
    const oracleContract = getVenusChainlinkOracleContractOnContext(ctx, oracle)

    // markets in
    const marketsIn = await vaultContract.getMarketsIn()
    // await recordMarketsIn(ctx, marketsIn, evt.name, vault, oracleContract)
    lpState.emit(ctx,{
      pool: evt.address,
      lTokenId,
      vault: lpInfo.vault,
      amountB0: lpInfo.amountB0,
      liquidity: lpInfo.liquidity,
      cumulativePnlPerLiquidity: lpInfo.cumulativePnlPerLiquidity,
      vaultLiquidity,
      marketsIn: marketsIn.join("-")
    })

    const market = await getMarket(underlying, poolContract)
    const marketContract = getVBep20DelegatorContractOnContext(ctx, market)
    const marketBalance = await marketContract.balanceOf(vault)
    const exchangeRateStored = await marketContract.exchangeRateStored()
    marketState.emit(ctx, {
      pool: evt.address,
      lTokenId,
      vault,
      asset: underlying,
      market,
      marketBalance,
      exchangeRateStored
    })

    //symbol manager
    const symbolManager = await poolContract.symbolManager()
    const symbolManagerContract = await getSymbolManagerImplementationContractOnContext(ctx, symbolManager)
    const initialMarginRequired = await symbolManagerContract.initialMarginRequired()

    symbolManagerState.emit(ctx, {
      pool: evt.address,
      managerAddress: symbolManager,
      initialMarginRequired
    })

    await recordSymbols(ctx, symbolManagerContract, evt)
    console.log(`${ctx.blockNumber} - ${ctx.timestamp.getTime()} - ${Date.now()} - ${Date.now() - ctx.timestamp.getTime()}`)

    // ctx.eventLogger.emit(evt.name, {
    //   pool_liquidity,
    //   lpsPnl,
    //   pool_cumulativePnlPerLiquidity,
    //   account,
    //   lTokenId,
    //   vault,
    //   amountB0: lpInfos.amountB0,
    //   liquidity: lpInfos.liquidity,
    //   cumulativePnlPerLiquidity: lpInfos.cumulativePnlPerLiquidity,
    //   vaultLiquidity,
    //   // TODO: markets in
    //   // markets,
    //   initialMarginRequired,
    //   message: evt.name + ` for ${lTokenId}`
    // })
  // } catch (e) {
  //   console.log(e)
  // }
}

async function onChangeMargin(evt: AddMarginEvent | RemoveMarginEvent, ctx: PoolImplementationContext) {
  try {
  const poolAddress = evt.address
  const underlying = evt.args.underlying
  const pTokenId = evt.args.pTokenId
  const poolContract = getPoolImplementationContractOnContext(ctx, evt.address)
  const lToken = await poolContract.lToken()
  const lTokenContract = getDTokenContractOnContext(ctx, lToken)
  const account = await lTokenContract.getOwnerOf(pTokenId)
  const lpsPnl = await poolContract.lpsPnl()
  const cumulativePnlPerLiquidity = await poolContract.cumulativePnlPerLiquidity()

  const tdInfos = await poolContract.tdInfos(pTokenId)
  const vault = tdInfos.vault
  const vaultContract = getVaultImplementationContractOnContext(ctx, vault)
  const vaultLiquidity = await vaultContract.getVaultLiquidity()

  const vaultComptroller = await vaultContract.comptroller()
  const comptrollerContract = getComptrollerContractOnContext(ctx, vaultComptroller)
  const oracle = await comptrollerContract.oracle()
  const oracleContract = getVenusChainlinkOracleContractOnContext(ctx, oracle)
  const marketsIn = await vaultContract.getMarketsIn()
  tdState.emit(ctx, {
    pool: poolAddress,
    pTokenId,
    vault,
    amountB0: tdInfos.amountB0,
    vaultLiquidity,
    marketsIn: marketsIn.join("-")
  })

  // await recordMarketsIn(ctx, marketsIn, evt.name, vault, oracleContract)
  //symbol manager
  const market = await getMarket(underlying, poolContract)
  const marketContract = getVBep20DelegatorContractOnContext(ctx, market)
  const marketBalance = await marketContract.balanceOf(vault)
  const exchangeRateStored = await marketContract.exchangeRateStored()
  marketState.emit(ctx, {
    pool: evt.address,
    pTokenId,
    vault,
    asset: underlying,
    market,
    marketBalance,
    exchangeRateStored
  })

  if (evt.name == "RemoveMargin") {
    const symbolManager = await poolContract.symbolManager()
    const symbolManagerContract = await getSymbolManagerImplementationContractOnContext(ctx, symbolManager)
    // const initialMarginRequired = await symbolManagerContract.initialMarginRequired()
    const liquidity = await poolContract.liquidity()

    poolState.emit(ctx, {
      pool: poolAddress,
      lpsPnl,
      cumulativePnlPerLiquidity,
      liquidity
    })
    await recordSymbolsForMargin(ctx, symbolManagerContract, evt)

  }
} catch (e) {
  console.log(e)
  console.log(evt)
}
}

async function onTrade(evt: TradeEvent, ctx: SymbolManagerImplementationContext) {
  try {
  const pTokenId = evt.args.pTokenId
  const symbolId = evt.args.symbolId
  const symbolManagerContract = getSymbolManagerImplementationContractOnContext(ctx, ctx.address)
  const pool = await symbolManagerContract.pool()
  const poolContract = getPoolImplementationContractOnContext(ctx, pool)
  const lpsPnl = await poolContract.lpsPnl()
  const cumulativePnlPerLiquidity = await poolContract.cumulativePnlPerLiquidity()
  const protocolFeeAccrued = await poolContract.protocolFeeAccrued()
  const tdInfos = await poolContract.tdInfos(pTokenId)
  const lToken = await poolContract.lToken()
  const lTokenContract = getDTokenContractOnContext(ctx, lToken)
  const account = await lTokenContract.getOwnerOf(pTokenId)
  const vault = tdInfos.vault
  const amountB0 = tdInfos.amountB0
  const vaultContract = getVaultImplementationContractOnContext(ctx, vault)
  const vaultLiquidity = await vaultContract.getVaultLiquidity()
  const marketsIn = await vaultContract.getMarketsIn()

  const activeSymbols = await symbolManagerContract.getActiveSymbols(pTokenId)
  const currentSymbol = await symbolManagerContract.symbols(symbolId)
  const newActiveSymbols = new Set(activeSymbols).add(currentSymbol)
  const liquidity = await poolContract.liquidity()

  poolState.emit(ctx, {
    pool: pool,
    lpsPnl,
    cumulativePnlPerLiquidity,
    protocolFeeAccrued,
    liquidity
  })

  tdState.emit(ctx, {
    pool: pool,
    pTokenId,
    vault,
    amountB0,
    vaultLiquidity,
    marketsIn: marketsIn.join("-")
  })

  await recordSymbolsForTrade(ctx, symbolManagerContract, pool, evt, newActiveSymbols)

  } catch (e) {
    console.log(evt)
    console.log(e)
  }
}

async function recordSymbolInfo(symbolAddress: string, ctx: EthContext) {

  const symbolContract = getSymbolImplementationFuturesContractOnContext(ctx, symbolAddress)
  const symbolName = await symbolContract.symbol()
  const symbolManager = await symbolContract.manager()
  const symbolManagerContract = getSymbolManagerImplementationContractOnContext(ctx, symbolManager)
  const pool = await symbolManagerContract.pool()
  const oracleManager = await symbolContract.oracleManager()
  const symbolId = await symbolContract.symbolId()
  var priceId
  try {
   priceId = await symbolContract.priceId()
  } catch(e) {
    console.log(e)
    console.log("error fetching priceId")
  }
  var feeRatio
  try {
    feeRatio = await symbolContract.feeRatio()
  } catch(e) {
    console.log(e)
    console.log("error fetching feeRatio")
  }
  const fundingPeriod = await symbolContract.fundingPeriod()
  const minTradeVolume = await symbolContract.minTradeVolume()
  const initialMarginRatio = await symbolContract.initialMarginRatio()
  const maintenanceMarginRatio = await symbolContract.maintenanceMarginRatio()
  const isCloseOnly = await symbolContract.isCloseOnly()
  if (symbolName.endsWith('-C') || symbolName.endsWith('-P')) {
    const optionSymbolContract = getSymbolImplementationOptionContractOnContext(ctx, symbolAddress)
    const volatilityId = await optionSymbolContract.volatilityId()
    const alpha = await symbolContract.alpha()
    const pricePercentThreshold = await symbolContract.pricePercentThreshold()
    const timeThreshold = await symbolContract.timeThreshold()

    var feeRatioNotional
    var feeRatioMark
    var startingPriceShiftLimit
    var initialOpenVolume
    try {
      feeRatioNotional = await optionSymbolContract.feeRatioNotional()
      feeRatioMark = await optionSymbolContract.feeRatioMark()
      startingPriceShiftLimit = await symbolContract.startingPriceShiftLimit()
      initialOpenVolume = await symbolContract.initialOpenVolume()

    } catch(e) {
      console.log(e)
      console.log("error fetching feeRatioNotional or feeRatioMark or startingPriceShiftLimit")
    }
    const strikePrice = await optionSymbolContract.strikePrice()
    const minInitialMarginRatio = await optionSymbolContract.minInitialMarginRatio()

    const isCall = await optionSymbolContract.isCall()

    symbolInfo.emit(ctx, {
      symbol: symbolAddress,
      symbolName,
      symbolManager,
      pool,
      oracleManager,
      symbolId,
      priceId,
      volatilityId,
      feeRatioNotional,
      feeRatioMark,
      strikePrice,
      alpha,
      fundingPeriod,
      minTradeVolume,
      initialMarginRatio,
      maintenanceMarginRatio,
      pricePercentThreshold,
      timeThreshold,
      startingPriceShiftLimit,
      minInitialMarginRatio,
      initialOpenVolume,
      isCall,
      isCloseOnly
    })
  } else if (symbolName.includes('^2')) {
    // Power
    const powerSymbolContract = getSymbolImplementationPowerContractOnContext(ctx, symbolAddress)
    const alpha = await symbolContract.alpha()
    const volatilityId = await powerSymbolContract.volatilityId()
    const startingPriceShiftLimit = await powerSymbolContract.startingPriceShiftLimit()
    var jumpLimitRatio
    try {
      jumpLimitRatio = await symbolContract.jumpLimitRatio()
    } catch(e) {
      console.log(e)
      console.log("error fetching jumpLimitRatio")
    }
    var initialOpenVolume
    try {
      initialOpenVolume = await symbolContract.initialOpenVolume()
    } catch(e) {
      console.log(e)
      console.log("error fetching initialOpenVolume")
    }
    const pricePercentThreshold = await symbolContract.pricePercentThreshold()
    const timeThreshold = await symbolContract.timeThreshold()

    symbolInfo.emit(ctx, {
      symbol: symbolAddress,
      symbolName,
      symbolManager,
      pool,
      oracleManager,
      symbolId,
      priceId,
      volatilityId,
      feeRatio,
      alpha,
      fundingPeriod,
      minTradeVolume,
      initialMarginRatio,
      maintenanceMarginRatio,
      pricePercentThreshold,
      timeThreshold,
      startingPriceShiftLimit,
      jumpLimitRatio,
      initialOpenVolume,
      isCloseOnly
    })
  } else if (symbolName.endsWith('-Gamma')) {
    // Gamma
    const gammaContract = getSymbolImplementationGammaContractOnContext(ctx, symbolAddress)
    const powerAlpha = await gammaContract.powerAlpha()
    const futuresAlpha = await gammaContract.futuresAlpha()
    const volatilityId = await gammaContract.volatilityId()

    symbolInfo.emit(ctx, {
      symbol:symbolAddress,
      symbolName,
      symbolManager,
      pool,
      oracleManager,
      symbolId,
      priceId,
      volatilityId,
      feeRatio,
      powerAlpha,
      futuresAlpha,
      fundingPeriod,
      minTradeVolume,
      initialMarginRatio,
      maintenanceMarginRatio,
      isCloseOnly
    })
  } else {
    // Futures
    const optionSymbolContract = getSymbolImplementationOptionContractOnContext(ctx, symbolAddress)
    const alpha = await symbolContract.alpha()
    const startingPriceShiftLimit = await symbolContract.startingPriceShiftLimit()
    var jumpLimitRatio
    try {
      jumpLimitRatio = await symbolContract.jumpLimitRatio()
    } catch(e) {
      console.log(e)
      console.log("error fetching jumpLimitRatio")
    }
    var initialOpenVolume
    try {
      initialOpenVolume = await symbolContract.initialOpenVolume()
    } catch(e) {
      console.log(e)
      console.log("error fetching initialOpenVolume")
    }
    const pricePercentThreshold = await symbolContract.pricePercentThreshold()
    const timeThreshold = await symbolContract.timeThreshold()

    symbolInfo.emit(ctx, {
      symbol: symbolAddress,
      symbolName,
      symbolManager,
      pool,
      oracleManager,
      symbolId,
      priceId,
      feeRatio,
      alpha,
      fundingPeriod,
      minTradeVolume,
      initialMarginRatio,
      maintenanceMarginRatio,
      pricePercentThreshold,
      timeThreshold,
      startingPriceShiftLimit,
      jumpLimitRatio,
      initialOpenVolume,
      isCloseOnly
    })
  }
}

async function onChangeSymbol(evt: AddSymbolEvent | RemoveSymbolEvent, ctx: SymbolManagerImplementationContext) {
  // try {
    const symbol = evt.args.symbol
    const symbolManagerContract = getSymbolManagerImplementationContractOnContext(ctx, ctx.address)
    const pool = await symbolManagerContract.pool()
    const symbolsLength = await symbolManagerContract.getSymbolsLength()
    var symbols = ""
    for (var i = 0; i < symbolsLength; i++) {
      const indexedSymbols = await symbolManagerContract.indexedSymbols(i)
      symbols = symbols + indexedSymbols + "-"
    }
    indexedSymbols.emit(ctx, {
      pool,
      indexedSymbols: symbols
    })
    await recordSymbolInfo(symbol, ctx)
    symbolTemplate.bind({address: symbol}, ctx)
  // } catch (e) {
  //   console.log(e)
  //   console.log(evt)
  // }
}

async function onSymbolImplementation(evt: NewImplementationEvent, ctx: SymbolContext) {
  try {
    const symbolAddress = evt.address
    await recordSymbolInfo(symbolAddress, ctx)
  } catch (e) {
    console.log(evt)
    console.log(e)
  }
}
DTokenProcessor.bind({address: "0xc5b1dE3769921E8b43222e3C221ab495193440C0", network: EthChainId.BSC})
.onEventTransfer(onTransfer)

DTokenProcessor.bind({address: "0x25d5aD687068799739FF7B0e18C7cbff403AcB64", network: EthChainId.BSC})
.onEventTransfer(onTransfer)

PoolProcessor.bind({address: "0x243681B8Cd79E3823fF574e07B2378B8Ab292c1E", network: EthChainId.BSC})
.onEventNewImplementation(onImplementation)

PoolImplementationProcessor.bind({address: "0x243681B8Cd79E3823fF574e07B2378B8Ab292c1E", network: EthChainId.BSC
// , startBlock: 28007586
})
.onEventAddMarket(onAddMarket)
.onEventAddLiquidity(onChangeLiquidity)
.onEventRemoveLiquidity(onChangeLiquidity)
.onEventAddMargin(onChangeMargin)
.onEventRemoveMargin(onChangeMargin)

SymbolManagerImplementationProcessor.bind({address: "0x543A9FA25ba9a16612274DD707Ac4462eD6988FA", network: EthChainId.BSC
// , startBlock: 28007586
})
.onEventTrade(onTrade)
.onEventAddSymbol(onChangeSymbol)
// .onEventNewImplementation(onSymbolImplementation)
