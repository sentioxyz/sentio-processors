import {
  BALANCER_VAULT_ADDRESS,
  BALANCER_VAULT_START_BLOCK,
  WETH9_ADDRESS
} from './constant'
import { FlashLoanEvent, InternalBalanceChangedEvent, SwapEvent } from './types/vault'
import { VaultProcessor, VaultContext, getVaultContract } from './types/vault'
import { ERC20BalanceContext, ERC20BalanceProcessor, getERC20BalanceContract } from './types/erc20balance'
import type {BigNumber} from 'ethers'
import {BigNumber as BN} from "bignumber.js";

export const toBn = (ethersBn: BigNumber | BigInt) => new BN(ethersBn.toString());

// helper functions to handle decimals
const DECIMAL_MAP = new Map<string, number>()

const getDecimal = async function(tokenAddress: string, chainId: number):Promise<number> {
  const key = chainId + tokenAddress
  if (DECIMAL_MAP.has(key)) {
    return DECIMAL_MAP.get(key)!
  }
  const contract = getERC20BalanceContract(tokenAddress, chainId)
  const decimal = await contract.decimals()
  DECIMAL_MAP.set(key, decimal)
  return decimal
}
const getNormalizedAmount = async function(tokenAddress: string, amount: BigNumber, chainId: number) {
  const decimal = await getDecimal(tokenAddress, chainId)
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
  const loanAmount = await getNormalizedAmount(token, event.args.amount, ctx.chainId)
  ctx.meter.Gauge('weth_flashloan_amount').record(loanAmount)
}

const swapHandler = async function(event: SwapEvent, ctx: VaultContext) {

  const poolId = event.args.poolId
  const tokenIn = event.args.tokenIn
  const tokenOut = event.args.tokenOut
  const amountIn = await getNormalizedAmount(tokenIn, event.args.amountIn, ctx.chainId)
  const amountOut = await getNormalizedAmount(tokenOut, event.args.amountOut, ctx.chainId)
  ctx.meter.Gauge('swap_amountIn').record(amountIn, {"poolId": poolId, "tokenIn": tokenIn, "tokenOut": tokenOut})
  ctx.meter.Gauge('swap_amountOut').record(amountOut, {"poolId": poolId, "tokenIn": tokenIn, "tokenOut": tokenOut})
  const previousTokenInBalance = await getERC20BalanceContract(tokenIn, ctx.chainId).balanceOf(BALANCER_VAULT_ADDRESS, {blockTag: event.blockNumber - 1})
  const previousTokenIn = await getNormalizedAmount(tokenIn, previousTokenInBalance, ctx.chainId)
  const previousTokenOutBalance = await getERC20BalanceContract(tokenOut, ctx.chainId).balanceOf(BALANCER_VAULT_ADDRESS, {blockTag: event.blockNumber - 1})
  const previousTokenOut = await getNormalizedAmount(tokenOut, previousTokenOutBalance, ctx.chainId)
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
  const delta = await getNormalizedAmount(token, event.args.delta, ctx.chainId)
  ctx.meter.Gauge('internal_balance_delta').record(delta, {"token": token})
  const previousBalance = await getNormalizedAmount(token, await getERC20BalanceContract(token, ctx.chainId).balanceOf(BALANCER_VAULT_ADDRESS, {blockTag: event.blockNumber - 1}), ctx.chainId)
  if (previousBalance > 1) {
    ctx.meter.Gauge('internal_balance_delta_ratio').record(delta / (previousBalance))
  }
}


const balanceProcessor = async function (block: any, ctx: ERC20BalanceContext) {
  const balance = await getNormalizedAmount(WETH9_ADDRESS, await ctx.contract.balanceOf(BALANCER_VAULT_ADDRESS), ctx.chainId)
  ctx.meter.Gauge('weth_balance').record(balance)
}

const ethFlashLoanFilter = VaultProcessor.filters.FlashLoan(null, WETH9_ADDRESS)

VaultProcessor.bind({address: BALANCER_VAULT_ADDRESS, startBlock: BALANCER_VAULT_START_BLOCK})
.onFlashLoan(flashLoanHandler, ethFlashLoanFilter)
.onSwap(swapHandler)
.onInternalBalanceChanged(internalBalanceProcessor)

VaultProcessor.bind({address: BALANCER_VAULT_ADDRESS, network: 42161})
    .onFlashLoan(flashLoanHandler, ethFlashLoanFilter)
    .onSwap(swapHandler)
    .onInternalBalanceChanged(internalBalanceProcessor)

VaultProcessor.bind({address: BALANCER_VAULT_ADDRESS, network: 137})
    .onFlashLoan(flashLoanHandler, ethFlashLoanFilter)
    .onSwap(swapHandler)
    .onInternalBalanceChanged(internalBalanceProcessor)

// TODO: add more networks. I did not add before balanceProcessor requires passing in a different WETH address.
ERC20BalanceProcessor.bind({address: WETH9_ADDRESS, startBlock: BALANCER_VAULT_START_BLOCK})
    .onBlock(balanceProcessor)
