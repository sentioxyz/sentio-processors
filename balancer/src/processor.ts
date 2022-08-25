import {
  BALANCER_VAULT_ADDRESS,
  BALANCER_VAULT_START_BLOCK,
  WETH9_ADDRESS
} from './constant'
import { FlashLoanEvent, InternalBalanceChangedEvent, SwapEvent } from './types/Vault'
import { VaultProcessor, VaultContext, getVaultContract } from './types/vault_processor'
import { ERC20BalanceContext, ERC20BalanceProcessor, getERC20BalanceContract } from './types/erc20balance_processor'
import type {BigNumber} from 'ethers'
import {BigNumber as BN} from "bignumber.js";

export const toBn = (ethersBn: BigNumber | BigInt) => new BN(ethersBn.toString());

// helper functions to handle decimals
const DECIMAL_MAP = new Map<string, number>()

const getDecimal = async function(tokenAddress: string):Promise<number> {
  if (DECIMAL_MAP.has(tokenAddress)) {
    return DECIMAL_MAP.get(tokenAddress)!
  }
  const decimal = await getERC20BalanceContract(tokenAddress).decimals()
  DECIMAL_MAP.set(tokenAddress, decimal)
  return decimal
}
const getNormalizedAmount = async function(tokenAddress: string, amount: BigNumber) {
  const decimal = await getDecimal(tokenAddress)
  // TODO: toNumber() can overflow
  return toBn(amount).div(toBn(10n ** BigInt(decimal))).toNumber()
}

// feature request:
// the ideal way to write this is find all flashloan events without filtering
// for blocks where the event is emitted, get the balance of the token at that block
// and compare the percentage
// right now we filtered flashloan token to be WETH
// but this is unscalable if we assume the token type is any ERC20
// example of Forta getting balance for a specific block: 
//  https://github.com/NethermindEth/Forta-Agents/blob/main/Balancer-Bots/Large-Pool-Balance-Change/src/agent.ts#L37

const flashLoanHandler = async function(event: FlashLoanEvent, ctx: VaultContext) {
  const token = event.args.token
  const loanAmount = await getNormalizedAmount(token, event.args.amount)
  ctx.meter.Gauge('weth_flashloan_amount').record(loanAmount)
}

const swapHandler = async function(event: SwapEvent, ctx: VaultContext) {

  const poolId = event.args.poolId
  const tokenIn = event.args.tokenIn
  const tokenOut = event.args.tokenOut
  const amountIn = await getNormalizedAmount(tokenIn, event.args.amountIn)
  const amountOut = await getNormalizedAmount(tokenOut, event.args.amountOut)
  ctx.meter.Gauge('swap_amountIn').record(amountIn, {"poolId": poolId, "tokenIn": tokenIn, "tokenOut": tokenOut})
  ctx.meter.Gauge('swap_amountOut').record(amountOut, {"poolId": poolId, "tokenIn": tokenIn, "tokenOut": tokenOut})
  const previousTokenIn = await getNormalizedAmount(tokenIn, await getERC20BalanceContract(tokenIn).balanceOf(BALANCER_VAULT_ADDRESS, {blockTag: event.blockNumber - 1}))
  const previousTokenOut = await getNormalizedAmount(tokenOut, await getERC20BalanceContract(tokenOut).balanceOf(BALANCER_VAULT_ADDRESS, {blockTag: event.blockNumber - 1}))
  // don't record if previous balance is too small
  if (previousTokenIn > 1) {
    ctx.meter.Gauge('swap_amountIn_ratio').record(amountIn / (previousTokenIn))
  }
  if (previousTokenOut> 1) {
    ctx.meter.Gauge('swap_amountOut_ratio').record(amountOut / (previousTokenOut))
  }
}

const internalBalanceProcessor = async function(event: InternalBalanceChangedEvent, ctx: VaultContext) {
  const token = event.args.token
  const delta = await getNormalizedAmount(token, event.args.delta)
  ctx.meter.Gauge('internal_balance_delta').record(delta, {"token": token})
  const previousBalance = await getNormalizedAmount(token, await getERC20BalanceContract(token).balanceOf(BALANCER_VAULT_ADDRESS, {blockTag: event.blockNumber - 1}))
  if (previousBalance > 1) {
    ctx.meter.Gauge('internal_balance_delta_ratio').record(delta / (previousBalance))
  }
}


const balanceProcessor = async function (block: any, ctx: ERC20BalanceContext) {
  const balance = await getNormalizedAmount(WETH9_ADDRESS, await ctx.contract.balanceOf(BALANCER_VAULT_ADDRESS))
  ctx.meter.Gauge('weth_balance').record(balance)
}

const ethFlashLoanFilter = VaultProcessor.filters.FlashLoan(null, WETH9_ADDRESS)

VaultProcessor.bind({address: BALANCER_VAULT_ADDRESS, startBlock: BALANCER_VAULT_START_BLOCK})
.onFlashLoan(flashLoanHandler, ethFlashLoanFilter)
.onSwap(swapHandler)
.onInternalBalanceChanged(internalBalanceProcessor)

ERC20BalanceProcessor.bind({address: WETH9_ADDRESS, startBlock: BALANCER_VAULT_START_BLOCK})
.onBlock(balanceProcessor)

