import { DYDX_PERPETUAL_ADDR, DYDX_V2_STARTBLOCK, USDC_ADDR} from './constant'
import { LogDepositEvent, LogWithdrawalPerformedEvent, LogMintWithdrawalPerformedEvent } from './types/DydxPerpetual'
import { DydxPerpetualContext, DydxPerpetualProcessor } from './types/dydxperpetual_processor'
import { ERC20BalanceContext, ERC20BalanceProcessor, getERC20BalanceContract } from './types/erc20balance_processor'
const USDC_DECIMAL = 6
// another flexible processing example:
// https://github.com/NethermindEth/Forta-Agents/blob/main/DYDX-Bots/Perpetual-Large-Deposits-Withdrawals/src/agent.ts#L48
const logDepositEventHandler =async (event:LogDepositEvent, ctx: DydxPerpetualContext) => {
  // deducted 10^6 from this tx and log amount
  //https://etherscan.io/tx/0xae3f3d6aaf8a63c5dab6780a811f1e6b514e193381ea6d2c1b2f245821358d5a
  const amount = Number(event.args.quantizedAmount.toBigInt()) / 10 ** USDC_DECIMAL
  ctx.meter.Gauge('deposit').record(amount)
  const lastBalance = Number(await getERC20BalanceContract(USDC_ADDR).balanceOf(DYDX_PERPETUAL_ADDR, {blockTag: ctx.blockNumber.toNumber() - 1})) / 10**USDC_DECIMAL
  ctx.meter.Gauge('deposit_ratio').record(amount / lastBalance )
}

// feature request:
// get data directly from contract storage
// https://github.com/NethermindEth/Forta-Agents/blob/main/DYDX-Bots/Perpetual-Large-Deposits-Withdrawals/src/token.address.fetcher.ts#L30
// related info: https://docs.starkware.co/starkex-v4/starkex-deep-dive/starkex-specific-concepts#assetinfo-assettype-and-assetid 
const logWithdrawalPerformedEventHandler =async (event:LogWithdrawalPerformedEvent, ctx: DydxPerpetualContext) => {
  const amount = Number(event.args.quantizedAmount.toBigInt())  / 10 ** USDC_DECIMAL
  
  ctx.meter.Gauge('withdrawl').record(amount)
  
  const lastBalance = Number(await getERC20BalanceContract(USDC_ADDR).balanceOf(DYDX_PERPETUAL_ADDR, {blockTag: ctx.blockNumber.toNumber() - 1})) / 10**USDC_DECIMAL
  ctx.meter.Gauge('withdraw_ratio').record(amount / lastBalance )
}

const logMintWithdrawalPerformedEventHandler =async (event:LogMintWithdrawalPerformedEvent, ctx: DydxPerpetualContext) => {
  const amount = Number(event.args.quantizedAmount.toBigInt() )/ 10 ** USDC_DECIMAL
  ctx.meter.Gauge('mintWithdrawl').record(amount)
  const lastBalance = Number(await getERC20BalanceContract(USDC_ADDR).balanceOf(DYDX_PERPETUAL_ADDR, {blockTag: ctx.blockNumber.toNumber() - 1})) / 10**USDC_DECIMAL
  ctx.meter.Gauge('mintWithdrawl_ratio').record(amount / lastBalance )
}

// USDC uses 6 for decimal
const balanceProcessor = async function (block: any, ctx: ERC20BalanceContext) {
  const balance = Number((await ctx.contract.balanceOf(DYDX_PERPETUAL_ADDR)).toBigInt() ) / 10 ** 6
  ctx.meter.Gauge('usdc_balance').record(balance)
}

ERC20BalanceProcessor.bind({address: USDC_ADDR, startBlock: DYDX_V2_STARTBLOCK})
.onBlock(balanceProcessor)

//TODO: change starting block
DydxPerpetualProcessor.bind({address: DYDX_PERPETUAL_ADDR, startBlock: 13424545})
.onLogDeposit(logDepositEventHandler)
.onLogMintWithdrawalPerformed(logMintWithdrawalPerformedEventHandler)
.onLogWithdrawalPerformed(logWithdrawalPerformedEventHandler)
