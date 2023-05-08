import {
  EVENT,
  EVENT1,
  EVENT2,
  LOOPRING_EXCHANGE,
  LOOPRING_WALLET_FACTORY1,
  LOOPRING_WALLET_FACTORY2,
  LOOPRING_WALLET_FACTORY3,
  LOOPRING_WALLET_FACTORY4,
  LOOPRING_WALLET_FACTORY5,
  LOOPRING_WALLET_MODULE,
  TOKEN_ARRAY
} from "./constant.js"
import { getERC20Contract } from '@sentio/sdk/eth/builtin/erc20'
import { BoundContractView, ContractContext, ContractView, EthChainId, GenericProcessor } from "@sentio/sdk/eth"
import { getPriceByType, token } from "@sentio/sdk/utils"
import {
  DepositRequestedEvent,
  ExchangeV3Context,
  ExchangeV3Processor,
  SubmitBlocksCallTrace,
  WithdrawalCompletedEvent
} from "./types/eth/exchangev3.js"
import type { BaseContract } from 'ethers'
import { processBlockStruct } from "./parse.js";
import { deposit, withdraw } from "./metrics.js";
// import { RichClientError } from "nice-grpc-error-details";
import { BigDecimal } from "@sentio/sdk";
// import {INFO} from "@sentio/loopring-protocols/src/logs";

GenericProcessor.bind(EVENT1, {address: LOOPRING_WALLET_MODULE}).onAllEvents(walletCounter)
GenericProcessor.bind(EVENT, {address: LOOPRING_WALLET_FACTORY1}).onAllEvents(walletCounter)
GenericProcessor.bind(EVENT, {address: LOOPRING_WALLET_FACTORY2}).onAllEvents(walletCounter)
GenericProcessor.bind(EVENT, {address: LOOPRING_WALLET_FACTORY3}).onAllEvents(walletCounter)
GenericProcessor.bind(EVENT, {address: LOOPRING_WALLET_FACTORY4}).onAllEvents(walletCounter)
GenericProcessor.bind(EVENT2, {address: LOOPRING_WALLET_FACTORY5}).onAllEvents(walletCounter)

async function getTokenDetails(ctx: ExchangeV3Context, address: string): Promise<[token.TokenInfo, bigint]> {
  const tokenInfo = await getTokenInfo(address)
  let amount: bigint
  if (tokenInfo.symbol === "ETH") {
    try {
      amount = await ctx.contract.provider.getBalance("0x674bdf20a0f284d710bc40872100128e2d66bd3f")
    } catch (e) {
      console.log(e)
      amount = 0n
    }
  } else {
    try {
      amount = await getERC20Contract(ctx, address).balanceOf("0x674bdf20a0f284d710bc40872100128e2d66bd3f",
          {blockTag: Number(ctx.blockNumber)})
    } catch (e) {
      console.log("error", e)
      amount = 0n
    }
  }
  return [tokenInfo, amount]
}

const tvl = async function (_: any, ctx: ExchangeV3Context) {
  console.log("new round of tvl")
  for (let i = 0; i < TOKEN_ARRAY.length; i++) {
    const [tokenInfo, amount] = await getTokenDetails(ctx, TOKEN_ARRAY[i])
    const scaledAmount = amount.scaleDown(tokenInfo.decimal)
    const price = await getPriceByType(EthChainId.ETHEREUM, TOKEN_ARRAY[i], ctx.timestamp)
    if (!price) {
      continue
    }
    ctx.meter.Gauge("tvl").record(scaledAmount.multipliedBy(price),
        {token: tokenInfo.symbol, address: TOKEN_ARRAY[i]})
    ctx.meter.Counter("tvl_count").add(1)
  }
}

ExchangeV3Processor.bind({address: LOOPRING_EXCHANGE})
    .onTimeInterval(tvl, 60, 24 * 60 * 30)
    .onEventDepositRequested(depositGauge)
    .onEventWithdrawalCompleted(withdrawGauge)
    .onCallSubmitBlocks(async (call: SubmitBlocksCallTrace, ctx: ExchangeV3Context) => {
      if (call.error) {
        return
      }
      // ctx.logger.info(`SubmitBlocks triggered at ${ctx.blockNumber}`)
      ctx.meter.Counter("submit_block").add(1)
      // const tx = await ctx.contract.provider.getTransaction(call.transactionHash)
      const tx = ctx.transaction
      const gasPrice = tx!.gasPrice
      const gasUsedFromCall = call.result.gasUsed
      // const receipt = await ctx.contract.provider.getTransactionReceipt(call.transactionHash)
      const receipt = ctx.transactionReceipt
      const gasUsed = receipt!.gasUsed
      if (gasPrice !== undefined) {
        const gasSpent = gasUsed.asBigDecimal().multipliedBy(gasPrice.scaleDown(18))
        const gasSpent2 = BigDecimal(gasUsedFromCall).multipliedBy(gasPrice.scaleDown(18))
        ctx.meter.Counter("eth_spent_on_gas").add(gasSpent)
        ctx.meter.Counter("eth_spent_on_gas2").add(gasSpent2)
      }
      for (const block of call.args.blocks) {
        processBlockStruct(block, call.transactionHash, ctx)
      }
    }, {
      transaction: true,
      transactionReceipt: true,
      block: false
    })


async function walletCounter(event: any, ctx: ContractContext<BaseContract, BoundContractView<BaseContract, ContractView<BaseContract>>>) {
  ctx.meter.Counter("wallet_count").add(1)
}

async function depositGauge(event: DepositRequestedEvent, ctx: ExchangeV3Context) {
  const tokenInfo = await getTokenInfo(event.args.token)
  const amount = event.args.amount.scaleDown(tokenInfo.decimal)

  if (!tokenInfo.symbol.startsWith("LP-")) {
    ctx.eventLogger.emit('Deposit', { message: `Deposit ${amount} ${tokenInfo.symbol} at ${ctx.blockNumber}`})
    deposit.record(ctx, amount, {tokenId: tokenInfo.symbol, address: event.args.token})
  }
}

async function withdrawGauge(event: WithdrawalCompletedEvent, ctx: ExchangeV3Context) {
  const tokenInfo = await getTokenInfo(event.args.token)
  const amount = event.args.amount.scaleDown(tokenInfo.decimal)

  if (!tokenInfo.symbol.startsWith("LP-")) {
    ctx.eventLogger.emit("Withdraw", { message: `Withdraw ${amount} ${tokenInfo.symbol} at ${ctx.blockNumber}`})
    withdraw.record(ctx, amount, {token: tokenInfo.symbol, address: event.args.token})
  }
}
//
// const scaleDown = async function (amount: bigint, decimal: number) {
//   const divider = (new BigDecimal(10)).pow(decimal)
//   return conversion.toBigDecimal(amount).div(divider)
// }

async function getTokenInfo(address: string): Promise<token.TokenInfo> {
  if (address !== "0x0000000000000000000000000000000000000000") {
    return await token.getERC20TokenInfo(EthChainId.ETHEREUM, address)
  } else {
    return token.NATIVE_ETH
  }
}
