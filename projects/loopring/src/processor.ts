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

import { Context, ContractView, BoundContractView, GenericProcessor, BigDecimal } from "@sentio/sdk"
import { getERC20TokenInfo, NATIVE_ETH, toBigDecimal, TokenInfo } from "@sentio/sdk/lib/utils"
import { ExchangeV3Context, ExchangeV3Processor, WithdrawalCompletedEvent, DepositRequestedEvent } from "./types/exchangev3"
import type { BaseContract, BigNumber } from 'ethers'

GenericProcessor.bind(EVENT1, {address: LOOPRING_WALLET_MODULE}).onAllEvents(walletCounter)
GenericProcessor.bind(EVENT, {address: LOOPRING_WALLET_FACTORY1}).onAllEvents(walletCounter)
GenericProcessor.bind(EVENT, {address: LOOPRING_WALLET_FACTORY2}).onAllEvents(walletCounter)
GenericProcessor.bind(EVENT, {address: LOOPRING_WALLET_FACTORY3}).onAllEvents(walletCounter)
GenericProcessor.bind(EVENT, {address: LOOPRING_WALLET_FACTORY4}).onAllEvents(walletCounter)
GenericProcessor.bind(EVENT2, {address: LOOPRING_WALLET_FACTORY5}).onAllEvents(walletCounter)

ExchangeV3Processor.bind({address: LOOPRING_EXCHANGE})
    .onEventDepositRequested(depositGauge)
    .onEventWithdrawalCompleted(withdrawGauge)
    .onCallSubmitBlocks((call, ctx) => {
      ctx.meter.Counter("submit_block").add(1)
      
      for (const block of call.args.blocks) {
        // TODO
      }
    })

async function walletCounter(event: any, ctx: Context<BaseContract, BoundContractView<BaseContract, ContractView<BaseContract>>>) {
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
  return toBigDecimal(amount).div(divider)
}

async function getTokenInfo(address: string): Promise<TokenInfo> {
  if (address !== "0x0000000000000000000000000000000000000000") {
    return await getERC20TokenInfo(address)
  } else {
    return NATIVE_ETH
  }
}
