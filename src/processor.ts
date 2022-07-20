import { ERC20Context, ERC20Processor } from './types/erc20_processor'
// import { X2y2Context, X2y2Processor } from './types/x2y2_processor'
import { AnyswapERC20Context, AnyswapERC20Processor } from "./types/anyswaperc20_processor";
import { AnyswapRouterContext, AnyswapRouterProcessor } from './types/anyswaprouter_processor';
import { LogAnySwapInEvent, LogAnySwapOut_address_address_address_uint256_uint256_uint256_Event, LogAnySwapOut_address_address_string_uint256_uint256_uint256_Event } from './types/AnyswapRouter';
// import { TransferEvent } from './types/ERC20'

const startBlock = 14215845 

const anyEthAddress = "0x0615dbba33fe61a31c7ed131bda6655ed76748b1"
const routerAddress = "0xba8da9dcf11b50b03fd5284f164ef5cdef910705"
const wethAddress = "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2"

const anyEthTotalSupplyProcessor = async function (_: any, ctx: AnyswapERC20Context) {
  const totalSupply = Number((await ctx.contract.totalSupply()).toBigInt() / BigInt(10 ** 18))

  ctx.meter.Histogram('anyETH_total_supply').record(totalSupply)
}

const wethBalanceProcessor = async function (_: any, ctx: ERC20Context) {
  const balance = Number((await ctx.contract.balanceOf(anyEthAddress)).toBigInt() / BigInt(10 ** 18))
  ctx.meter.Histogram('weth_balance').record(balance)
}

const handleSwapIn = async function (event: LogAnySwapInEvent, ctx: AnyswapRouterContext) {
  const inAmount = Number(event.args.amount.toBigInt() / BigInt(10 ** 18))
  ctx.meter.Counter('anyswapInTotal').add(inAmount)
}

const handleSwapOut1 = async function (event: LogAnySwapOut_address_address_address_uint256_uint256_uint256_Event, ctx: AnyswapRouterContext) {
  const outAmount = Number(event.args.amount.toBigInt() / BigInt(10 ** 18))
  ctx.meter.Counter('anyswapOutTotal').add(outAmount)
}

const handleSwapOut2 = async function (event: LogAnySwapOut_address_address_string_uint256_uint256_uint256_Event, ctx: AnyswapRouterContext) {
  const outAmount = Number(event.args.amount.toBigInt() / BigInt(10 ** 18))
  ctx.meter.Counter('anyswapOutTotal').add(outAmount)
}

const inFilter = AnyswapRouterProcessor.filters.LogAnySwapIn(null, anyEthAddress)
const outFilter1 = AnyswapRouterProcessor.filters['LogAnySwapOut(address,address,address,uint256,uint256,uint256)'](anyEthAddress)
const outFilter2 = AnyswapRouterProcessor.filters['LogAnySwapOut(address,address,string,uint256,uint256,uint256)'](anyEthAddress)


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
