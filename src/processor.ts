import { ERC20Context, ERC20Processor } from './types/erc20_processor'
// import { X2y2Context, X2y2Processor } from './types/x2y2_processor'
import { AnyswapERC20Context, AnyswapERC20Processor } from "./types/anyswaperc20_processor";
import { AnyswapRouterContext, AnyswapRouterProcessor } from './types/anyswaprouter_processor';
import { LogAnySwapInEvent, LogAnySwapOut_address_address_address_uint256_uint256_uint256_Event, LogAnySwapOut_address_address_string_uint256_uint256_uint256_Event } from './types/AnyswapRouter';
import { BscAnyswapRouterContext, BscAnyswapRouterProcessor } from './types/bscanyswaprouter_processor';
import { LogAnySwapInEvent as BscLogAnySwapInEvent, LogAnySwapOutEvent as BscLogAnySwapOutEvent } from './types/BscAnyswapRouter';
import { Bep20Context, Bep20Processor } from './types/bep20_processor';
//Chain to chainID
const CHAIN_ID_MAP = new Map<number, String>(
  [
    [1, "Ethereum"],
    [10, "Optimism"],
    [25, "Cronos"],
    [56, "BSC"],
    [66, "OKC"],
    [128, "Huobi"],
    [137, "Polygon"],
    [250, "Fantom"],
    [321, "KCC"],
    [42161, "Arbitrum"],
    [43114, "Avalanche"]
  ]
)
// import { TransferEvent } from './types/ERC20'

const startBlock = 14215845
const startBlock_BSC = 13312128
const startBlock_Ropsten = 12549988

// ETH addresses
const anyEthAddress = "0x0615dbba33fe61a31c7ed131bda6655ed76748b1"
const routerAddress = "0xba8da9dcf11b50b03fd5284f164ef5cdef910705"
const wethAddress = "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2"

// BSC addresses
const anyETHAddress_BSC = "0xdebb1d6a2196f2335ad51fbde7ca587205889360"
const routerAddress_BSC = "0xd1c5966f9f5ee6881ff6b261bbeda45972b1b5f3"
const wethAddress_BSC = "0x2170ed0880ac9a755fd29b2688956bd959f933f8"

// Ropsten addresses
const MTT_address = "0x39e68dd41af6fd870f27a6b77cbcffa64626b0f3"
const pool_address = "0x6A29C3E7DC05B2888243644DB079ff8Edf890665"

var totalSupply: number
const anyEthTotalSupplyProcessor = async function (_: any, ctx: AnyswapERC20Context) {
  totalSupply = Number((await ctx.contract.totalSupply()).toBigInt() / 10n ** 12n) / (10**6)

  ctx.meter.Histogram('anyETH_total_supply').record(totalSupply)
}

//netBalance is weth_balance - anyswap balance
const wethBalanceProcessor = async function (block: any, ctx: ERC20Context) {
  const balance = Number((await ctx.contract.balanceOf(anyEthAddress)).toBigInt() / 10n ** 12n) / (10**6)
  ctx.meter.Histogram('weth_balance').record(balance)
  ctx.meter.Histogram('netBalance').record(balance - totalSupply)
}

// netSwapFlow is defined as all anyswapOut events - anyswapIn events
const handleSwapIn = async function (event: LogAnySwapInEvent, ctx: AnyswapRouterContext) {
  const inAmount = Number(event.args.amount.toBigInt() / 10n ** 12n) / (10**6)
  const chainID = Number(event.args.fromChainID)
  const chainName = CHAIN_ID_MAP.get(chainID)
  ctx.meter.Counter('anyswapInTotal').add(inAmount)
  ctx.meter.Counter('anyswapIn_' + String(chainName)).add(inAmount)
  ctx.meter.Counter('netSwapFlow').sub(inAmount)
}

const handleSwapOut1 = async function (event: LogAnySwapOut_address_address_address_uint256_uint256_uint256_Event, ctx: AnyswapRouterContext) {
  const outAmount = Number(event.args.amount.toBigInt() / 10n ** 12n) / (10**6)

  const chainID = Number(event.args.toChainID)
  const chainName = CHAIN_ID_MAP.get(chainID)
  ctx.meter.Histogram('anyswapOut_' + String(chainName)).record(outAmount)

  ctx.meter.Counter('anyswapOutTotal').add(outAmount)
  ctx.meter.Counter('netSwapFlow').add(outAmount)
}

const handleSwapOut2 = async function (event: LogAnySwapOut_address_address_string_uint256_uint256_uint256_Event, ctx: AnyswapRouterContext) {
  const outAmount = Number(event.args.amount.toBigInt() / 10n ** 12n) / (10**6)
  ctx.meter.Counter('anyswapOutTotal').add(outAmount)
  ctx.meter.Counter('netSwapFlow').add(outAmount)

  const chainID = Number(event.args.toChainID)
  const chainName = CHAIN_ID_MAP.get(chainID)
  ctx.meter.Histogram('anyswapOut_' + String(chainName)).record(outAmount)
}

// BSC handlers
var TOTAL_SUPPLY_BSC: number
const anyEthTotalSupplyProcessorBSC = async function (_: any, ctx: Bep20Context) {
  TOTAL_SUPPLY_BSC = Number((await ctx.contract.totalSupply()).toBigInt() / 10n ** 12n) / (10**6)

  ctx.meter.Histogram('anyETH_bsc_total_supply').record(TOTAL_SUPPLY_BSC)
}

//netBalance is weth_balance - anyswap balance
const wethBalanceProcessorBSC = async function (block: any, ctx: Bep20Context) {
  const balance = Number((await ctx.contract.balanceOf(anyETHAddress_BSC)).toBigInt() / 10n ** 12n) / (10**6)
  ctx.meter.Histogram('weth_bsc_balance').record(balance)
  ctx.meter.Histogram('netBalance_bsc').record(balance - TOTAL_SUPPLY_BSC)
}

// netSwapFlow is defined as all anyswapOut events - anyswapIn events
const handleSwapInBSC = async function (event: BscLogAnySwapInEvent, ctx: BscAnyswapRouterContext) {
  const inAmount = Number(event.args.amount.toBigInt() / 10n ** 12n) / (10**6)
  ctx.meter.Counter('anyswapInTotal_bsc').add(inAmount)
  ctx.meter.Counter('netSwapFlow_bsc').sub(inAmount)
}

const handleSwapOutBSC = async function (event: BscLogAnySwapOutEvent, ctx: BscAnyswapRouterContext) {
  const outAmount = Number(event.args.amount.toBigInt() / 10n ** 12n) / (10**6)
  ctx.meter.Counter('anyswapOutTotal_bsc').add(outAmount)
  ctx.meter.Counter('netSwapFlow_bsc').add(outAmount)
}

// Rospten handlers
const mttBalanceProcessor = async function (block: any, ctx: ERC20Context) {
  const balance = Number((await ctx.contract.balanceOf(pool_address)).toBigInt() / 10n ** 12n) / (10**6)
  ctx.meter.Histogram('mtt_balance').record(balance)
}

const inFilter = AnyswapRouterProcessor.filters.LogAnySwapIn(null, anyEthAddress)
const outFilter1 = AnyswapRouterProcessor.filters['LogAnySwapOut(address,address,address,uint256,uint256,uint256)'](anyEthAddress)
const outFilter2 = AnyswapRouterProcessor.filters['LogAnySwapOut(address,address,string,uint256,uint256,uint256)'](anyEthAddress)

//BSC filters
const inFilterBSC = BscAnyswapRouterProcessor.filters.LogAnySwapIn(null, anyETHAddress_BSC)
const outFilterBSC = BscAnyswapRouterProcessor.filters.LogAnySwapOut(anyETHAddress_BSC)

AnyswapERC20Processor.bind(anyEthAddress)
.startBlock(startBlock)
.onBlock(anyEthTotalSupplyProcessor)

ERC20Processor.bind(wethAddress)
.startBlock(startBlock)
.onBlock(wethBalanceProcessor)

AnyswapRouterProcessor.bind(routerAddress)
.startBlock(startBlock)
.onLogAnySwapIn(handleSwapIn, inFilter)
.onLogAnySwapOut_address_address_address_uint256_uint256_uint256_(handleSwapOut1,outFilter1)
.onLogAnySwapOut_address_address_string_uint256_uint256_uint256_(handleSwapOut2, outFilter2)

// BSC processors
Bep20Processor.bind(anyETHAddress_BSC, 56)
.startBlock(startBlock_BSC)
.onBlock(anyEthTotalSupplyProcessorBSC)

Bep20Processor.bind(wethAddress_BSC, 56)
.startBlock(startBlock_BSC)
.onBlock(wethBalanceProcessorBSC)

BscAnyswapRouterProcessor.bind(routerAddress_BSC, 56)
.startBlock(startBlock_BSC)
.onLogAnySwapIn(handleSwapInBSC, inFilterBSC)
.onLogAnySwapOut(handleSwapOutBSC, outFilterBSC)


//Rospten processors
ERC20Processor.bind(MTT_address, 3)
.startBlock(startBlock_Ropsten)
.onBlock(mttBalanceProcessor)

// X2y2Processor.bind('0xB329e39Ebefd16f40d38f07643652cE17Ca5Bac1')
//     .startBlock(14201940)
//     .onBlock(async function (_, ctx: X2y2Context) {
//       const phase = (await ctx.contract.currentPhase()).toString()
//       const reward = await ctx.contract.rewardPerBlockForStaking()

//       ctx.meter.Histogram('reward_per_block').record(reward, { phase })
//     })

// const filter = ERC20Processor.filters.Transfer(
//     '0x0000000000000000000000000000000000000000',
//     '0xb329e39ebefd16f40d38f07643652ce17ca5bac1'
// )

// ERC20Processor.bind('0x1e4ede388cbc9f4b5c79681b7f94d36a11abebc9')
//     .startBlock(14201940)
//     .onTransfer(handleTransfer, filter)

// async function handleTransfer(event: TransferEvent, ctx: ERC20Context) {
//   const val = Number(event.args.value.toBigInt()) / Math.pow(10, 18)
//   ctx.meter.Counter('token').add(val)
// }


