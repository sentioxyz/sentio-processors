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
    EVENT2, TOKEN_ARRAY
} from "./constant"
import { ERC20Context, ERC20Processor, getERC20Contract } from '@sentio/sdk/lib/builtin/erc20'
import { ContractContext, ContractView, BoundContractView, GenericProcessor, BigDecimal } from "@sentio/sdk"
import { token, conversion  } from "@sentio/sdk/lib/utils"
import {getPriceByType} from "@sentio/sdk/lib/utils/price"
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
import {deposit, withdraw} from "./metrics";
import { RichClientError } from "nice-grpc-error-details";
import { Status } from "nice-grpc-common";

GenericProcessor.bind(EVENT1, {address: LOOPRING_WALLET_MODULE}).onAllEvents(walletCounter)
GenericProcessor.bind(EVENT, {address: LOOPRING_WALLET_FACTORY1}).onAllEvents(walletCounter)
GenericProcessor.bind(EVENT, {address: LOOPRING_WALLET_FACTORY2}).onAllEvents(walletCounter)
GenericProcessor.bind(EVENT, {address: LOOPRING_WALLET_FACTORY3}).onAllEvents(walletCounter)
GenericProcessor.bind(EVENT, {address: LOOPRING_WALLET_FACTORY4}).onAllEvents(walletCounter)
GenericProcessor.bind(EVENT2, {address: LOOPRING_WALLET_FACTORY5}).onAllEvents(walletCounter)

async function getTokenDetails(ctx: ExchangeV3Context, address: string): Promise<[token.TokenInfo, BigNumber]> {
  const tokenInfo = await getTokenInfo(address)
  let amount: any
  if (tokenInfo.symbol === "ETH") {
    try {
      amount = await ctx.contract.provider.getBalance("0x674bdf20a0f284d710bc40872100128e2d66bd3f")
    } catch (e) {
      console.log(e)
      amount = 0
    }
  } else {
    try {
      amount = await getERC20Contract(address).balanceOf("0x674bdf20a0f284d710bc40872100128e2d66bd3f",
          {blockTag: Number(ctx.blockNumber)})
    } catch (e) {
      console.log("error", e)
      amount = 0
    }
  }
  return [tokenInfo, amount]
}

const tvl = async function (_: any, ctx: ExchangeV3Context) {
  console.log("new round of tvl")
  for (let i = 0; i < TOKEN_ARRAY.length; i++) {
    const [tokenInfo, amount] = await getTokenDetails(ctx, TOKEN_ARRAY[i])
    const scaledAmount = await scaleDown(amount, tokenInfo.decimal)
    let price : any
    try {
      price = await getPriceByType("ethereum_mainnet", TOKEN_ARRAY[i], ctx.timestamp)
    } catch (error) {
      if (error instanceof RichClientError && error.code === Status.NOT_FOUND) {
       continue
      }
      throw error
    }
    console.log("price", price, "scaledAmount", scaledAmount.toNumber(),
        "scaledAmount", amount.toString(), "tokenInfo", tokenInfo.symbol,
        "block", Number(ctx.blockNumber), "timestamp", ctx.timestamp, "address", TOKEN_ARRAY[i])
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
      ctx.meter.Counter("submit_block").add(1)
      // console.log(ctx.contract.provider)
      const tx = await ctx.contract.provider.getTransaction(call.transactionHash)
      const gasPrice = tx.gasPrice
      const gasUsedFromCall = call.result.gasUsed
      const receipt = await ctx.contract.provider.getTransactionReceipt(call.transactionHash)
      const gasUsed = receipt.gasUsed
      if (gasPrice !== undefined) {
        const gasSpent = toBigDecimal(gasUsed).multipliedBy(token.scaleDown(gasPrice!, 18))
        const gasSpent2 = new BigDecimal(gasUsedFromCall).multipliedBy(token.scaleDown(gasPrice!, 18))

        ctx.meter.Counter("eth_spent_on_gas").add(gasSpent)
        ctx.meter.Counter("eth_spent_on_gas2").add(gasSpent2)

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
    deposit.record(ctx, amount, {tokenId: tokenInfo.symbol, address: event.args.token})
  }
}

async function withdrawGauge(event: WithdrawalCompletedEvent, ctx: ExchangeV3Context) {
  const tokenInfo = await getTokenInfo(event.args.token)
  const amount = await scaleDown(event.args.amount, tokenInfo.decimal)

  if (!tokenInfo.symbol.startsWith("LP-")) {
    withdraw.record(ctx, amount, {token: tokenInfo.symbol, address: event.args.token})
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
