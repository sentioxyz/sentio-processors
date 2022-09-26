import { ERC20Context, ERC20Processor } from '@sentio/sdk/lib/builtin/erc20'
import { getChainName, getER20NormalizedAmount } from "@sentio/sdk/lib/utils"

import { AnyswapERC20Context, AnyswapERC20Processor } from "./types/anyswaperc20";
import { AnyswapRouterContext, AnyswapRouterProcessor } from './types/anyswaprouter';
import { LogAnySwapInEvent, LogAnySwapOut_address_address_address_uint256_uint256_uint256_Event, LogAnySwapOut_address_address_string_uint256_uint256_uint256_Event } from './types/anyswaprouter';

const anyEthAddress = "0x0615dbba33fe61a31c7ed131bda6655ed76748b1"
const routerAddress = "0xba8da9dcf11b50b03fd5284f164ef5cdef910705"
const wethAddress = "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2"

const anyEthTotalSupplyProcessor = async function (_: any, ctx: AnyswapERC20Context) {
  const totalSupply = await getER20NormalizedAmount(anyEthAddress, await ctx.contract.totalSupply(), 1)
  ctx.meter.Gauge('anyETH_total_supply').record(totalSupply)
}

const wethBalanceProcessor = async function (block: any, ctx: ERC20Context) {
  const balance = await getER20NormalizedAmount(wethAddress, await ctx.contract.balanceOf(anyEthAddress), 1)
  ctx.meter.Gauge('weth_balance').record(balance)
}

// netSwapFlow is defined as all anyswapOut events - anyswapIn events
const handleSwapIn = async function (event: LogAnySwapInEvent, ctx: AnyswapRouterContext) {
  const inAmount = await getER20NormalizedAmount(anyEthAddress, event.args.amount, 1)
  ctx.meter.Counter('anyswapIn').add(inAmount, { "from": getChainName(event.args.fromChainID.toString()) })
  ctx.meter.Counter('netSwapFlow').sub(inAmount)
}

// there are two anyswapOut events with different parameter type in the same contract
// below is an example of how Sentio's code gen handle such case
const handleSwapOut1 = async function (event: LogAnySwapOut_address_address_address_uint256_uint256_uint256_Event, ctx: AnyswapRouterContext) {
  const outAmount = await getER20NormalizedAmount(anyEthAddress, event.args.amount, 1)
  ctx.meter.Gauge('anyswapOut').record(outAmount, { "to": getChainName(event.args.toChainID.toString()) })
  ctx.meter.Counter('anyswapOutTotal').add(outAmount)
  ctx.meter.Counter('netSwapFlow').add(outAmount)
}

const handleSwapOut2 = async function (event: LogAnySwapOut_address_address_string_uint256_uint256_uint256_Event, ctx: AnyswapRouterContext) {
  const outAmount = await getER20NormalizedAmount(anyEthAddress, event.args.amount, 1)
  ctx.meter.Counter('anyswapOutTotal').add(outAmount)
  ctx.meter.Counter('netSwapFlow').add(outAmount)
  ctx.meter.Gauge('anyswapOut').record(outAmount, { "to": getChainName(event.args.toChainID.toString()) })
}

const inFilter = AnyswapRouterProcessor.filters.LogAnySwapIn(null, anyEthAddress)
const outFilter1 = AnyswapRouterProcessor.filters['LogAnySwapOut(address,address,address,uint256,uint256,uint256)'](anyEthAddress)
const outFilter2 = AnyswapRouterProcessor.filters['LogAnySwapOut(address,address,string,uint256,uint256,uint256)'](anyEthAddress)

//startBlock is optional, you can specify a start block or leave it blank and Sentio will
//automatically detect and use the creation block of the contract
AnyswapERC20Processor.bind({address: anyEthAddress, startBlock: 14215865})
  .onBlock(anyEthTotalSupplyProcessor)

ERC20Processor.bind({address: wethAddress})
  .onBlock(wethBalanceProcessor)

AnyswapRouterProcessor.bind({address: routerAddress})
  .onEventLogAnySwapIn(handleSwapIn, inFilter)
  .onEventLogAnySwapOut_address_address_address_uint256_uint256_uint256_(handleSwapOut1,outFilter1)
  .onEventLogAnySwapOut_address_address_string_uint256_uint256_uint256_(handleSwapOut2, outFilter2)


