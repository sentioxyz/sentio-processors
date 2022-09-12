import {LOOPRING_WALLET_MODULE,
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
import type {Context, ContractView, BoundContractView} from "@sentio/sdk"
import {GenericProcessor} from "@sentio/sdk"
import { ExchangeV3Context, ExchangeV3Processor, WithdrawalCompletedEvent } from "./types/exchangev3"
import { DepositRequestedEvent } from "./types/exchangev3"
import type {BaseContract} from 'ethers'
import {getERC20BalanceContract} from './types/internal/erc20balance_processor'
import {getERC20ByteContract} from './types/internal/erc20byte_processor'
import { BigDecimal } from "@sentio/sdk"
import { toBigDecimal } from "@sentio/sdk/lib/utils"
import type { BigNumber} from 'ethers'
import {utils} from 'ethers'

// helper functions to handle decimals
class TokenInfo {
  symbol: string
  decimal: number

  constructor(symbol: string, decimal: number){
    this.symbol = symbol
    this.decimal = decimal
  }
} 
const TOKEN_MAP = new Map<string, TokenInfo>()
// try to force a more recent block when retrieving erc20 tokenInfo
const recent_block = 15494785 

const getTokenInfo = async function(tokenAddress: string, chainId: number):Promise<TokenInfo> {
  const key = chainId + tokenAddress
  if (TOKEN_MAP.has(key)) {
    return TOKEN_MAP.get(key)!
  }
  const contract = getERC20BalanceContract(tokenAddress, chainId)
  const contractByte = getERC20ByteContract(tokenAddress, chainId)
  const decimal = await contract.decimals({blockTag: recent_block})
  let symbol = "UNKNOWN"
  try {
    symbol = await contract.symbol({blockTag: recent_block})
  } catch (e) {
    symbol = utils.parseBytes32String(await contractByte.symbol({blockTag: recent_block}))
  }

  const result = new TokenInfo(symbol, decimal)
  TOKEN_MAP.set(tokenAddress, result)
  return result
}
const scaleDown = async function(amount: BigNumber, decimal:number) {
  const divider = (new BigDecimal(10)).pow(decimal)
  return toBigDecimal(amount).div(divider)
}


const walletCounter = async function(event: any, ctx: Context<BaseContract, BoundContractView<BaseContract, ContractView<BaseContract>>>) {
  ctx.meter.Counter("wallet_count").add(1)
}

const depositGauge = async function(event: DepositRequestedEvent, ctx: ExchangeV3Context) {
  const token = event.args.token
  var tokenInfo
  if(token !== "0x0000000000000000000000000000000000000000") {
    tokenInfo = await getTokenInfo(token, 1)
  } else {
    tokenInfo = new TokenInfo("ETH", 18)
  }
  const amount = await scaleDown(event.args.amount, tokenInfo.decimal)

  // const tokenId = event.args.tokenId.toString()
  // const amount = Number(event.args.amount.toBigInt())

  ctx.meter.Gauge("deposit").record(amount, {tokenId: tokenInfo.symbol})
  ctx.meter.Gauge("deposit_count").record(1)
  // ctx.meter.Gauge("deposit").record(amount, {tokenId: tokenId})
}

const withdrawGauge = async function(event: WithdrawalCompletedEvent, ctx: ExchangeV3Context) {
  const token = event.args.token
  var tokenInfo

  if(token !== "0x0000000000000000000000000000000000000000") {
    tokenInfo = await getTokenInfo(token, 1)
  } else {
    tokenInfo = new TokenInfo("ETH", 18)
  }
  const amount = await scaleDown(event.args.amount, tokenInfo.decimal)
  // const amount = Number(event.args.amount.toBigInt())

  ctx.meter.Gauge("withdraw").record(amount, {token: tokenInfo.symbol})
  ctx.meter.Gauge("withdraw_count").record(1)
  // ctx.meter.Gauge("withdraw").record(amount, {token: token})

}

GenericProcessor.bind(EVENT1, {address: LOOPRING_WALLET_MODULE}).onAllEvents(walletCounter)
GenericProcessor.bind(EVENT, {address: LOOPRING_WALLET_FACTORY1}).onAllEvents(walletCounter)
GenericProcessor.bind(EVENT, {address: LOOPRING_WALLET_FACTORY2}).onAllEvents(walletCounter)
GenericProcessor.bind(EVENT, {address: LOOPRING_WALLET_FACTORY3}).onAllEvents(walletCounter)
GenericProcessor.bind(EVENT, {address: LOOPRING_WALLET_FACTORY4}).onAllEvents(walletCounter)
GenericProcessor.bind(EVENT2, {address: LOOPRING_WALLET_FACTORY5}).onAllEvents(walletCounter)

ExchangeV3Processor.bind({address: LOOPRING_EXCHANGE})
.onDepositRequested(depositGauge)
.onWithdrawalCompleted(withdrawGauge)



