import { DTokenContext, DTokenProcessor, TransferEvent } from "./types/eth/dtoken.js";
import { PoolContext, PoolProcessor, NewImplementationEvent, getPoolContract } from "./types/eth/pool.js";
import {
  getPoolImplementationContract,
  getPoolImplementationContractOnContext
} from "./types/eth/poolimplementation.js";
import { EthChainId, BigDecimal, Gauge } from "@sentio/sdk"

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
  const address = evt.args.newImplementation
  const newContract = getPoolImplementationContractOnContext(ctx, ctx.address)
  const vaultTemplate = await newContract.vaultTemplate()
  const tokenWETH = await newContract.tokenWETH()
  const lToken = await newContract.lToken()
  const pToken = await newContract.pToken()
  const oracleManager = await newContract.oracleManager()
  const swapper = await newContract.swapper()
  const privileger = await newContract.privileger()
  const rewardVault = await newContract.rewardVault()
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

}

DTokenProcessor.bind({address: "0xc5b1dE3769921E8b43222e3C221ab495193440C0", network: EthChainId.BINANCE})
.onEventTransfer(onTransfer)

DTokenProcessor.bind({address: "0x25d5aD687068799739FF7B0e18C7cbff403AcB64", network: EthChainId.BINANCE})
.onEventTransfer(onTransfer)

PoolProcessor.bind({address: "0x243681B8Cd79E3823fF574e07B2378B8Ab292c1E", network: EthChainId.BINANCE})
.onEventNewImplementation(onImplementation)