import { DTokenContext, DTokenProcessor, getDTokenContract, getDTokenContractOnContext, TransferEvent } from "./types/eth/dtoken.js";
import { PoolContext, PoolProcessor, NewImplementationEvent, getPoolContract } from "./types/eth/pool.js";
import {
  getPoolImplementationContract,
  getPoolImplementationContractOnContext,
  PoolImplementationContext,
  PoolImplementationProcessor,
  AddMarketEvent,
  AddMarginEvent,
  AddLiquidityEvent,
  RemoveLiquidityEvent,
  RemoveMarginEvent
} from "./types/eth/poolimplementation.js";
import { getVBep20DelegatorContractOnContext } from "./types/eth/vbep20delegator.js";

import { EthChainId, BigDecimal, Gauge } from "@sentio/sdk"
import { token } from "@sentio/sdk/utils"
import { getVaultImplementationContractOnContext } from "./types/eth/vaultimplementation.js";
import { AddSymbolEvent, getSymbolManagerImplementationContractOnContext, RemoveSymbolEvent, SymbolManagerImplementationBoundContractView, SymbolManagerImplementationContext, SymbolManagerImplementationProcessor, TradeEvent } from "./types/eth/symbolmanagerimplementation.js";
import { getComptrollerContractOnContext } from "./types/eth/comptroller.js";
import { getVenusChainlinkOracleContractOnContext, VenusChainlinkOracleBoundContractView } from "./types/eth/venuschainlinkoracle.js";
import { EthContext } from "@sentio/sdk/eth";
import { getSymbolContractOnContext, SymbolProcessor, SymbolContext } from "./types/eth/symbol.js";
import { getSymbolImplementationFuturesContractOnContext } from "./types/eth/symbolimplementationfutures.js";
import { getSymbolImplementationGammaContractOnContext } from "./types/eth/symbolimplementationgamma.js"

async function recordMarketsIn(ctx: EthContext, marketsIn: string[], eventName: string, vault: string, oracleContract: VenusChainlinkOracleBoundContractView) {
  var markets = ""
  for (var idx = 0; idx < marketsIn.length; idx++) {
    const market = marketsIn[idx]
    markets = markets + "-" + market
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

async function recordSymbols(ctx: EthContext, symbolManagerContract: SymbolManagerImplementationBoundContractView, eventName: String) {
  try {  
  //symbols
    const symbolsLength = await symbolManagerContract.getSymbolsLength()
    for (var i = 0; i < symbolsLength; i++) {
      const symbol = await symbolManagerContract.indexedSymbols(i)
      const symbolContract = getSymbolContractOnContext(ctx, symbol)
      const symbolName = await symbolContract.symbol()
      const indexPrice = await symbolContract.indexPrice()
      const fundingTimestamp = await symbolContract.fundingTimestamp()
      const cumulativeFundingPerVolume = await symbolContract.cumulativeFundingPerVolume()
      const tradersPnl = await symbolContract.tradersPnl()
      const initialMarginRequired = await symbolContract.initialMarginRequired()
      const cumulativeFundingPerRealFuturesVolume = await symbolContract.initialMarginRequired()
      ctx.eventLogger.emit(eventName + "_Symbol", {
        indexPrice, 
        fundingTimestamp,
        cumulativeFundingPerVolume,
        tradersPnl,
        initialMarginRequired,
        cumulativeFundingPerRealFuturesVolume,
        symbol
      })
    }
  } catch (e) {
    console.log("symbol" + eventName + ctx.blockNumber)
    console.log(e)
  }
}

async function recordSymbolsForTrade(
  ctx: EthContext, 
  symbolManagerContract: SymbolManagerImplementationBoundContractView, 
  evt: TradeEvent, 
  activeSymbols: string[]) {
  try {
  //symbols
  const symbolsLength = await symbolManagerContract.getSymbolsLength()
  const pTokenId = evt.args.pTokenId
  for (var i = 0; i < symbolsLength; i++) {
    const symbol = await symbolManagerContract.indexedSymbols(i)
    const symbolContract = getSymbolImplementationFuturesContractOnContext(ctx, symbol)
    const symbolId = await symbolContract.symbolId()
    const symbolName = await symbolContract.symbol()
    if (isSettled(evt, symbolId, activeSymbols)) {
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
        var openVolume
        try {
         openVolume = await symbolContract.openVolume()
        } catch (e) {
          console.log("error fetching openVolume")
          console.log(e)
        }

        const positions = await symbolContract.positions(pTokenId)
        
        ctx.eventLogger.emit(evt.name + "_Symbol", {
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
          openVolume,
          symbol,
          volume: positions.volume,
          cost: positions.cost,
          "popositions-cumulativeFundingPerVolume": positions.cumulativeFundingPerVolume
        })
      } else {
        const symbolGammaContract = getSymbolImplementationGammaContractOnContext(ctx, symbol)
        const indexPrice = await symbolGammaContract.indexPrice()
        const fundingTimestamp = await symbolGammaContract.fundingTimestamp()
        const cumulaitveFundingPerPowerVolume = await symbolGammaContract.cumulaitveFundingPerPowerVolume()
        const cumulativeFundingPerRealFuturesVolume = await symbolGammaContract.cumulativeFundingPerRealFuturesVolume()
        const tradersPnl = await symbolGammaContract.tradersPnl()
        const initialMarginRequired = await symbolGammaContract.initialMarginRequired()
        const netPowerVolume = await symbolGammaContract.netPowerVolume()
        const netRealFuturesVolume = await symbolGammaContract.netRealFuturesVolume()
        const netCost = await symbolGammaContract.netCost()
        const nPositionHolders = await symbolGammaContract.nPositionHolders()
        const positions = await symbolGammaContract.positions(pTokenId)

        ctx.eventLogger.emit(evt.name + "_Symbol", {
          indexPrice,
          fundingTimestamp,
          cumulaitveFundingPerPowerVolume,
          cumulativeFundingPerRealFuturesVolume,
          tradersPnl,
          initialMarginRequired,
          netPowerVolume,
          netRealFuturesVolume,
          netCost,
          nPositionHolders,
          symbol,
          powerVolume: positions.powerVolume,
          realFuturesVolume: positions.realFuturesVolume,
          cost: positions.cost,
          "positions-cumulaitveFundingPerPowerVolume": positions.cumulaitveFundingPerPowerVolume,
          "positions-cumulativeFundingPerRealFuturesVolume": positions.cumulativeFundingPerRealFuturesVolume
        })
      }
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
    message: `token transferred from ${from} to ${to} for tokenId: ${tokenId}`
  })
}

async function onImplementation(evt: NewImplementationEvent, ctx: PoolContext) {
  try {
    const address = evt.args.newImplementation
    const newContract = getPoolImplementationContractOnContext(ctx, ctx.address)
    const vaultTemplate = await newContract.vaultTemplate()
    const tokenWETH = await newContract.tokenWETH()
    const lToken = await newContract.lToken()
    const pToken = await newContract.pToken()
    const oracleManager = await newContract.oracleManager()
    const swapper = await newContract.swapper()
    var privileger
    var rewardVault
    try {
      privileger = await newContract.privileger()
      rewardVault = await newContract.rewardVault()
    } catch (e) {
      console.log(e)
    }
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

    ctx.eventLogger.emit("NewImplementation", {
      vaultTemplate,
      tokenWETH,
      lToken,
      pToken,
      oracleManager,
      swapper,
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
      tokenB0,
      vTokenB0,
      vTokenETH,
      vaultImplementation,
      // vaultImplementation.comptroller,
      symbolManager,
      message: "new implementation deployed"
    })
  } catch (e) {
    console.log(evt.name)
    console.log(e)
  }
}

async function onAddMarket(evt: AddMarketEvent, ctx: PoolImplementationContext) {
  const market = evt.args.market
  const marketContract = getVBep20DelegatorContractOnContext(ctx, market)
  const underlying = await marketContract.underlying()
  const vTokenSymbol = await marketContract.symbol()
  const underlyingToken = await token.getERC20TokenInfo(ctx.chainId, underlying)
  const underlyingSymbol = underlyingToken.symbol

  ctx.eventLogger.emit("AddMarket", {
    message: `market added for ${market}`,
    underlying,
    vToken: market,
    underlyingSymbol,
    vTokenSymbol
  })
}

async function onChangeLiquidity(evt: AddLiquidityEvent | RemoveLiquidityEvent, ctx: PoolImplementationContext) {
  // try {
    const lTokenId = evt.args.lTokenId
    const poolContract = getPoolImplementationContractOnContext(ctx, evt.address)
    const lToken = await poolContract.lToken()
    const lTokenContract = getDTokenContractOnContext(ctx, lToken)
    const pool_liquidity =  await poolContract.liquidity()
    const lpsPnl = await poolContract.lpsPnl()
    const pool_cumulativePnlPerLiquidity = await poolContract.cumulativePnlPerLiquidity()
    const lpInfos = await poolContract.lpInfos(lTokenId)
    const account = await lTokenContract.getOwnerOf(lTokenId)

    //vault 
    const vault = lpInfos.vault
    const vaultContract = getVaultImplementationContractOnContext(ctx, vault)
    const vaultLiquidity = await vaultContract.getVaultLiquidity()
    const vaultComptroller = await vaultContract.comptroller()
    const comptrollerContract = getComptrollerContractOnContext(ctx, vaultComptroller)
    const oracle = await comptrollerContract.oracle()
    const oracleContract = getVenusChainlinkOracleContractOnContext(ctx, oracle)

    // markets in
    const marketsIn = await vaultContract.getMarketsIn()
    await recordMarketsIn(ctx, marketsIn, evt.name, vault, oracleContract)

    //symbol manager
    const symbolManager = await poolContract.symbolManager()
    const symbolManagerContract = await getSymbolManagerImplementationContractOnContext(ctx, symbolManager)
    const initialMarginRequired = await symbolManagerContract.initialMarginRequired()

    await recordSymbols(ctx, symbolManagerContract, evt.name) 

    ctx.eventLogger.emit(evt.name, {
      pool_liquidity,
      lpsPnl,
      pool_cumulativePnlPerLiquidity,
      account,
      lTokenId,
      vault,
      amountB0: lpInfos.amountB0,
      liquidity: lpInfos.liquidity,
      cumulativePnlPerLiquidity: lpInfos.cumulativePnlPerLiquidity,
      vaultLiquidity,
      // TODO: markets in
      // markets,
      initialMarginRequired,
      message: evt.name + ` for ${lTokenId}`
    })
  // } catch (e) {
  //   console.log(e)
  // }
}

async function onChangeMargin(evt: AddMarginEvent | RemoveMarginEvent, ctx: PoolImplementationContext) {
  try {
  const pTokenId = evt.args.pTokenId
  const poolContract = getPoolImplementationContractOnContext(ctx, evt.address)
  const lToken = await poolContract.lToken()
  const lTokenContract = getDTokenContractOnContext(ctx, lToken)
  const account = await lTokenContract.getOwnerOf(pTokenId)


  const tdInfos = await poolContract.tdInfos(pTokenId)
  const vault = tdInfos.vault
  const vaultContract = getVaultImplementationContractOnContext(ctx, vault)
  const vaultLiquidity = await vaultContract.getVaultLiquidity()
  const vaultComptroller = await vaultContract.comptroller()
  const comptrollerContract = getComptrollerContractOnContext(ctx, vaultComptroller)
  const oracle = await comptrollerContract.oracle()
  const oracleContract = getVenusChainlinkOracleContractOnContext(ctx, oracle)
  const marketsIn = await vaultContract.getMarketsIn()


  await recordMarketsIn(ctx, marketsIn, evt.name, vault, oracleContract)
  //symbol manager
  const symbolManager = await poolContract.symbolManager()
  const symbolManagerContract = await getSymbolManagerImplementationContractOnContext(ctx, symbolManager)
  const initialMarginRequired = await symbolManagerContract.initialMarginRequired()
  
  await recordSymbols(ctx, symbolManagerContract, evt.name) 

  ctx.eventLogger.emit(evt.name, {
    vault,
    account,
    amountB0: tdInfos.amountB0,
    vaultLiquidity,
    // TODO: markets in
    markets: marketsIn.join("-"),
    initialMarginRequired,
    message: evt.name + ` for ${pTokenId}`
  })
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
  const vaultContract = getVaultImplementationContractOnContext(ctx, vault)
  const vaultLiquidity = await vaultContract.getVaultLiquidity()
  const activeSymbols = await symbolManagerContract.getActiveSymbols(pTokenId)

  await recordSymbolsForTrade(ctx, symbolManagerContract, evt, activeSymbols)

  ctx.eventLogger.emit("Trade",  {
    lpsPnl,
    cumulativePnlPerLiquidity,
    protocolFeeAccrued,
    account,
    pTokenId,
    vault: tdInfos.vault,
    amountB0: tdInfos.amountB0,
    vaultLiquidity,
    symbols: activeSymbols.join("-")
  })
} catch (e) {
  console.log(evt)
  console.log(e)
}
}

async function onChangeSymbol(evt: AddSymbolEvent | RemoveSymbolEvent, ctx: SymbolManagerImplementationContext) {
  const symbol = evt.args.symbol
  const symbolManagerContract = getSymbolManagerImplementationContractOnContext(ctx, ctx.address)
  const symbolsLength = await symbolManagerContract.getSymbolsLength()
  var symbols = ""
  for (var i = 0; i < symbolsLength; i++) {
    const indexedSymbols = await symbolManagerContract.indexedSymbols(i)
    symbols = symbols + indexedSymbols + "-"
  }
  ctx.eventLogger.emit(evt.name, {
    symbols,
    symbol,
    message: evt.name + " " + symbol
  })
}

async function onSymbolImplementation(evt: NewImplementationEvent, ctx: SymbolManagerImplementationContext) {
  try {
    const symbolManagerContract = getSymbolImplementationFuturesContractOnContext(ctx, ctx.address)

    const oracleManager = await symbolManagerContract.oracleManager()
    const symbolId = await symbolManagerContract.symbolId()
    const priceId = await symbolManagerContract.priceId()
    const feeRatio = await symbolManagerContract.feeRatio()
    const alpha = await symbolManagerContract.alpha()
    const fundingPeriod = await symbolManagerContract.fundingPeriod()
    const minTradeVolume = await symbolManagerContract.minTradeVolume()
    const initialMarginRatio = await symbolManagerContract.initialMarginRatio()
    const maintenanceMarginRatio = await symbolManagerContract.maintenanceMarginRatio()
    const pricePercentThreshold = await symbolManagerContract.pricePercentThreshold()
    const timeThreshold = await symbolManagerContract.timeThreshold()
    const startingPriceShiftLimit = await symbolManagerContract.startingPriceShiftLimit()
    const jumpLimitRatio = await symbolManagerContract.jumpLimitRatio()
    const initialOpenVolume = await symbolManagerContract.initialOpenVolume()
    const isCloseOnly = await symbolManagerContract.isCloseOnly()

    ctx.eventLogger.emit("SymbolImplementation", {
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
  } catch (e) {
    console.log(evt)
    console.log(e)
  }
}
DTokenProcessor.bind({address: "0xc5b1dE3769921E8b43222e3C221ab495193440C0", network: EthChainId.BINANCE})
.onEventTransfer(onTransfer)

DTokenProcessor.bind({address: "0x25d5aD687068799739FF7B0e18C7cbff403AcB64", network: EthChainId.BINANCE})
.onEventTransfer(onTransfer)

PoolProcessor.bind({address: "0x243681B8Cd79E3823fF574e07B2378B8Ab292c1E", network: EthChainId.BINANCE})
.onEventNewImplementation(onImplementation)

PoolImplementationProcessor.bind({address: "0x243681B8Cd79E3823fF574e07B2378B8Ab292c1E", network: EthChainId.BINANCE, startBlock: 25007586})
.onEventAddMarket(onAddMarket)
.onEventAddLiquidity(onChangeLiquidity)
.onEventRemoveLiquidity(onChangeLiquidity)
.onEventAddMargin(onChangeMargin)
.onEventRemoveMargin(onChangeMargin)

SymbolManagerImplementationProcessor.bind({address: "0x543A9FA25ba9a16612274DD707Ac4462eD6988FA", network: EthChainId.BINANCE, startBlock: 25007586})
.onEventTrade(onTrade)
.onEventAddSymbol(onChangeSymbol)
.onEventNewImplementation(onSymbolImplementation)

// SymbolProcessor.bind({address: "0x543A9FA25ba9a16612274DD707Ac4462eD6988FA", network: EthChainId.BINANCE})
// .onEventNewImplementation(onSymbolImplementation)
