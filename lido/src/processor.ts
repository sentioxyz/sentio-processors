import {
  STETH_TOKEN_ADDRESS,
  WSTETH_TOKEN_ADDRESS,
  AAVE_VAULT_ADDRESS,
  WSTETH_A_VAULT_ADDRESS,
  WSTETH_B_VAULT_ADDRESS,
  STETH_START_BLOCK,
  WSTETH_START_BLOCK
} from './constant'
import { ERC20BalanceContext, ERC20BalanceProcessor } from './types/erc20balance_processor'
const startBlock = 13096883

function balanceHandlerGenerator(vaultName: string, vaultAddress: string) {
  return async function(_:any, ctx: ERC20BalanceContext) {
    const balance = Number((await ctx.contract.balanceOf(vaultAddress)).toBigInt() / 10n**18n)

    ctx.meter.Histogram('lido_'+ vaultName +'_balance').record(balance)
  }
}

ERC20BalanceProcessor.bind({address: STETH_TOKEN_ADDRESS, startBlock: STETH_START_BLOCK})
.onBlock(balanceHandlerGenerator('aave', AAVE_VAULT_ADDRESS))

ERC20BalanceProcessor.bind({address: WSTETH_TOKEN_ADDRESS, startBlock: WSTETH_START_BLOCK})
.onBlock(balanceHandlerGenerator('makerA', WSTETH_A_VAULT_ADDRESS))

ERC20BalanceProcessor.bind({address: WSTETH_TOKEN_ADDRESS, startBlock: WSTETH_START_BLOCK})
.onBlock(balanceHandlerGenerator('makerB', WSTETH_B_VAULT_ADDRESS))

// const seniorPoolHandler = async function(_:any, ctx: SeniorPoolContext) {
//   const totalLoansOutstanding = Number((await ctx.contract.totalLoansOutstanding()).toBigInt() / 10n**6n)
//   const sharePrice = Number((await ctx.contract.sharePrice()).toBigInt() / 10n**6n)
//   const assets = Number((await ctx.contract.assets()).toBigInt() / 10n**6n)

//   ctx.meter.Histogram('goldfinch_totalLoansOutstanding').record(totalLoansOutstanding)
//   ctx.meter.Histogram('goldfinch_sharePrice').record(sharePrice)
//   ctx.meter.Histogram('goldfinch_assets').record(assets)
// }

// SeniorPoolProcessor.bind(seniorPoolAddress)
// .startBlock(startBlock)
// .onBlock(seniorPoolHandler)

// // console.log("beging loop")
// // console.log(goldfinchPools)
// // batch handle Tranched Pools
// for (let i = 0; i < goldfinchPools.data.length; i++) {
//   const tranchedPool = goldfinchPools.data[i];

//   // console.log(tranchedPool)

//   const handler = async function(_:any, ctx: CreditLineContext) {
//     const loanBalance = Number((await ctx.contract.balance()).toBigInt() / 10n**6n)
//     ctx.meter.Histogram('tranchedPool_balance').record(loanBalance, {"idx" : String(i)})
//     ctx.meter.Counter('tranchedPool_balance_total').add(loanBalance)
//   }

//   CreditLineProcessor.bind(tranchedPool.creditLineAddress)
//   .startBlock(tranchedPool.creditLineStartBlock)
//   .onBlock(handler)
// }