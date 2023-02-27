import * as constant from "./constant.js"
import { BorrowCompleteEvent, RepaySentEvent, RequestControllerEventsContext, RequestControllerEventsProcessor } from "./types/eth/requestcontrollerevents.js"
// import { PtokenProcessor, PtokenContext } from "./types/eth/ptoken.js"
import { ERC20Context, ERC20Processor, TransferEvent } from '@sentio/sdk/eth/builtin/erc20'
import { token } from "@sentio/sdk/utils"
// import { scaleDown } from '@sentio/sdk/lib/utils/token'
import { Gauge, scaleDown } from "@sentio/sdk";

// const borrowerTracker = AccountEventTracker.register("borrowers")



async function borrowComplete(event: BorrowCompleteEvent, ctx: RequestControllerEventsContext) {
  const chainId = ctx.chainId
  // console.lo g(chainId)
  const borrowAmount = event.args.borrowAmount
  const borrower = event.args.borrower
  const pAsset = event.args.loanMarketAsset
  // TODO: need to add all assets to the map or read underlying onchain
  const underlying = constant.CHAIN_PTOKEN_ERC20.get(chainId)!.get(pAsset.toLowerCase())
  if (underlying !== undefined) {
    const tokenInfo = await token.getERC20TokenInfo(underlying.toLowerCase(), chainId)
    const amount = Number(borrowAmount.scaleDown(tokenInfo.decimal))
    const symbol = tokenInfo.symbol
    const label = { symbol: symbol }
    ctx.meter.Gauge("borrow_complete").record(amount, label)
    ctx.meter.Counter("borrow_complete_counter").add(amount, label)
    ctx.eventLogger.emit("borrow", {
      distinctId: borrower,
      amount: amount,
      symbol: symbol
    })
  }
  ctx.meter.Counter("borrow_occurred").add(1, { "pAsset": pAsset })
  ctx.eventLogger.emit("borrowers", { distinctId: borrower })
  // borrowerTracker.trackEvent(ctx, {distinctId: borrower})


}

async function repaySent(event: RepaySentEvent, ctx: RequestControllerEventsContext) {
  // console.log(ctx.chainId)
  const borrowAmount = event.args.repayAmount
  const borrower = event.args.borrower
  const pAsset = event.args.loanMarketAsset
  // TODO: need to add all assets to the map or read underlying onchain
  const underlying = constant.CHAIN_ERC20_PTOKEN.get(ctx.chainId)!.get(pAsset.toLowerCase())
  if (underlying !== undefined) {
    const tokenInfo = await token.getERC20TokenInfo(underlying.toLowerCase(), ctx.chainId)
    const amount = Number(scaleDown(borrowAmount, tokenInfo.decimal))
    const symbol = tokenInfo.symbol
    const label = { symbol: symbol }
    ctx.meter.Gauge("repay_sent").record(amount, label)
    ctx.meter.Counter("repay_sent_counter").add(amount, label)
  }
  ctx.meter.Counter("repay_occurred").add(1, { "pAsset": pAsset })
}

// async function pTokenTotalSupply(block: any, ctx: PtokenContext) {
//   const underlying = PTOKEN_ERC20_MAP.get(ctx.contract.rawContract.address.toLowerCase())
//   if (underlying !== undefined) {
//     const tokenInfo = await token.getERC20TokenInfo(underlying.toLowerCase(), ctx.chainId)
//     const amount = scaleDown(await ctx.contract.totalSupply(), tokenInfo.decimal)
//     const symbol = tokenInfo.symbol
//     const label = {symbol}
//     ctx.meter.Gauge("ptoken_total_supply").record(amount, label)
//   }
// }

async function totalSupply(block: any, ctx: ERC20Context) {
  console.log("total supply at " + ctx.chainId + " " + ctx.contract.address)

  const pToken = constant.CHAIN_ERC20_PTOKEN.get(ctx.chainId)!.get(ctx.contract.address.toLowerCase())
  const tokenInfo = await token.getERC20TokenInfo(ctx.contract.address, ctx.chainId)
  const symbol = tokenInfo.symbol
  const label = { symbol: symbol }

  // console.log(pToken, JSON.stringify(tokenInfo), symbol)

  const totalSupply = Number(scaleDown(await ctx.contract.totalSupply(), tokenInfo.decimal))
  console.log("total supply of " + symbol + " " + totalSupply + " at chain" + ctx.chainId + " " + ctx.contract.address)

  ctx.meter.Gauge("token_total_supply").record(totalSupply, label)
  // some tokes such as usp and pwETH are not wrapped so not getting their balance
  if (pToken !== undefined && pToken !== ctx.contract.address.toLowerCase()) {
    const balance = Number(scaleDown(await ctx.contract.balanceOf(pToken), tokenInfo.decimal))
    ctx.meter.Gauge("ptoken_balance").record(balance, label)
  }
}

RequestControllerEventsProcessor.bind({ address: constant.REQUEST_CONTROLLER_GOERLI, network: 5 })
  .onEventBorrowComplete(borrowComplete)
  .onEventRepaySent(repaySent)

RequestControllerEventsProcessor.bind({ address: constant.REQUEST_CONTROLLER_MOONBASE, network: 1287 })
  .onEventBorrowComplete(borrowComplete)
  .onEventRepaySent(repaySent)

constant.CHAIN_PTOKEN_ERC20.forEach((map, chainId) => {
  console.log(chainId)
  map.forEach((underlying, ptoken) => {
    console.log(chainId)
    console.log(underlying)
    // set a starting block because .totalSupply() returns error on early blocks
    // PtokenProcessor.bind({address: ptoken, network: 5, startBlock: 8300000}).onBlock(pTokenTotalSupply)
    ERC20Processor.bind({ address: underlying, network: chainId })
      .onBlockInterval(totalSupply)
  })
})


