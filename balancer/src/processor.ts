import {
  BALANCER_VAULT_ADDRESS,
  BALANCER_VAULT_START_BLOCK,
  WETH9_ADDRESS
} from './constant'
import { FlashLoanEvent, InternalBalanceChangedEvent, SwapEvent } from './types/Vault'
import { VaultProcessor, VaultContext } from './types/vault_processor'
import { ERC20BalanceContext, ERC20BalanceProcessor } from './types/erc20balance_processor'

// feature request:
// the ideal way to write this is find all flashloan events without filtering
// for blocks where the event is emitted, get the balance of the token at that block
// and compare the percentage
// right now we filtered flashloan token to be WETH
// but this is unscalable if we assume the token type is any ERC20
const flashLoanHandler = async function(event: FlashLoanEvent, ctx: VaultContext) {
  const loanAmount = Number(event.args.amount.toBigInt() / 10n ** 12n) / 10**6
  ctx.meter.Gauge('weth_flashloan_amount').record(loanAmount)
}

const swapHandler = async function(event: SwapEvent, ctx: VaultContext) {
  const amountIn = Number(event.args.amountIn.toBigInt() / 10n ** 12n) / 10**6
  const amountOut = Number(event.args.amountOut.toBigInt() / 10n ** 12n) / 10**6
  const poolId = event.args.poolId
  const tokenIn = event.args.tokenIn
  const tokenOut = event.args.tokenOut
  ctx.meter.Gauge('swap_amountIn').record(amountIn, {"poolId": poolId, "tokenIn": tokenIn, "tokenOut": tokenOut})
  ctx.meter.Gauge('swap_amountOut').record(amountOut, {"poolId": poolId, "tokenIn": tokenIn, "tokenOut": tokenOut})
}

const internalBalanceProcessor = async function(event: InternalBalanceChangedEvent, ctx: VaultContext) {
  const delta = Number(event.args.delta.toBigInt() / 10n ** 12n) / 10**6
  const token = event.args.token
  ctx.meter.Gauge('internal_balance_delta').record(delta, {"token": token})
}


const balanceProcessor = async function (block: any, ctx: ERC20BalanceContext) {
  const balance = Number((await ctx.contract.balanceOf(BALANCER_VAULT_ADDRESS)).toBigInt() / 10n ** 12n) / (10**6)
  ctx.meter.Gauge('weth_balance').record(balance)
}

const ethFlashLoanFilter = VaultProcessor.filters.FlashLoan(null, WETH9_ADDRESS)

VaultProcessor.bind({address: BALANCER_VAULT_ADDRESS, startBlock: BALANCER_VAULT_START_BLOCK})
.onFlashLoan(flashLoanHandler, ethFlashLoanFilter)
.onSwap(swapHandler)
.onInternalBalanceChanged(internalBalanceProcessor)

ERC20BalanceProcessor.bind({address: WETH9_ADDRESS, startBlock: BALANCER_VAULT_START_BLOCK})
.onBlock(balanceProcessor)