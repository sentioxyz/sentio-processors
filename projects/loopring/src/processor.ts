import {
  LOOPRING_WALLET_MODULE,
  LOOPRING_WALLET_FACTORY1,
  LOOPRING_WALLET_FACTORY2,
  LOOPRING_WALLET_FACTORY3,
  LOOPRING_WALLET_FACTORY4,
  LOOPRING_WALLET_FACTORY5,
  LOOPRING_EXCHANGE,
  EVENT1,
  EVENT,
  EVENT2
} from "./constant"

import { ContractContext, ContractView, BoundContractView, GenericProcessor, BigDecimal } from "@sentio/sdk"
import { token, conversion  } from "@sentio/sdk/lib/utils"
import {
  ExchangeV3Context,
  ExchangeV3Processor,
  WithdrawalCompletedEvent,
  DepositRequestedEvent,
  SubmitBlocksCallTrace
} from "./types/exchangev3"
import type { BaseContract, BigNumber } from 'ethers'
import { processBlockStruct } from "./parse";
import { toBigDecimal } from "@sentio/sdk/lib/utils/conversion"

GenericProcessor.bind(EVENT1, {address: LOOPRING_WALLET_MODULE}).onAllEvents(walletCounter)
GenericProcessor.bind(EVENT, {address: LOOPRING_WALLET_FACTORY1}).onAllEvents(walletCounter)
GenericProcessor.bind(EVENT, {address: LOOPRING_WALLET_FACTORY2}).onAllEvents(walletCounter)
GenericProcessor.bind(EVENT, {address: LOOPRING_WALLET_FACTORY3}).onAllEvents(walletCounter)
GenericProcessor.bind(EVENT, {address: LOOPRING_WALLET_FACTORY4}).onAllEvents(walletCounter)
GenericProcessor.bind(EVENT2, {address: LOOPRING_WALLET_FACTORY5}).onAllEvents(walletCounter)

ExchangeV3Processor.bind({address: LOOPRING_EXCHANGE})
    .onEventDepositRequested(depositGauge)
    .onEventWithdrawalCompleted(withdrawGauge)
    .onCallSubmitBlocks(async (call: SubmitBlocksCallTrace, ctx: ExchangeV3Context) => {
      if (call.error) {
        return
      }
      ctx.meter.Counter("submit_block").add(1)
      // console.log(ctx.contract.provider)
      const tx = await ctx.contract.provider.getTransaction(call.transactionHash)
      const gasPrice = tx.gasPrice
      // const gasUsed = call.result.gasUsed
      const receipt = await ctx.contract.provider.getTransactionReceipt(call.transactionHash)
      const gasUsed = receipt.gasUsed
      if (gasPrice !== undefined) {
        const gasSpent = toBigDecimal(gasUsed).multipliedBy(token.scaleDown(gasPrice!, 18))
        ctx.meter.Counter("eth_spent_on_gas").add(gasSpent)
      }
      for (const block of call.args.blocks) {
        processBlockStruct(block, call.transactionHash, ctx)
      }
    })

async function walletCounter(event: any, ctx: ContractContext<BaseContract, BoundContractView<BaseContract, ContractView<BaseContract>>>) {
  ctx.meter.Counter("wallet_count").add(1)
}

async function depositGauge(event: DepositRequestedEvent, ctx: ExchangeV3Context) {
  const tokenInfo = await getTokenInfo(event.args.token)
  const amount = await scaleDown(event.args.amount, tokenInfo.decimal)

  if (!tokenInfo.symbol.startsWith("LP-")) {
    ctx.meter.Gauge("deposit").record(amount, {tokenId: tokenInfo.symbol})
    ctx.meter.Gauge("deposit_count").record(1)
  }
}

async function withdrawGauge(event: WithdrawalCompletedEvent, ctx: ExchangeV3Context) {
  const tokenInfo = await getTokenInfo(event.args.token)
  const amount = await scaleDown(event.args.amount, tokenInfo.decimal)

  if (!tokenInfo.symbol.startsWith("LP-")) {
    ctx.meter.Gauge("withdraw").record(amount, {token: tokenInfo.symbol})
    ctx.meter.Gauge("withdraw_count").record(1)
  }
}

const scaleDown = async function (amount: BigNumber, decimal: number) {
  const divider = (new BigDecimal(10)).pow(decimal)
  return conversion.toBigDecimal(amount).div(divider)
}

async function getTokenInfo(address: string): Promise<token.TokenInfo> {
  if (address !== "0x0000000000000000000000000000000000000000") {
    return await token.getERC20TokenInfo(address)
  } else {
    return token.NATIVE_ETH
  }
}
