import { EthChainId, EthContext, GenericProcessor, GlobalContext, GlobalProcessor } from '@sentio/sdk/eth'
import { scaleDown } from '@sentio/sdk'
import { L2ERC20TokenBridgeContext, L2ERC20TokenBridgeProcessor } from './types/eth/l2erc20tokenbridge.js'
import {
  DepositFinalizedEventObject,
  L2StandardBridgeContext,
  L2StandardBridgeProcessor,
  WithdrawalInitiatedEventObject
} from './types/eth/l2standardbridge.js'
import { L2OpUSDCBridgeAdapterProcessor } from './types/eth/l2opusdcbridgeadapter.js'
import { token } from '@sentio/sdk/utils'

const network = EthChainId.SONEIUM_TESTNET
const startBlock = 0

GlobalProcessor.bind({ network, startBlock }).onTransaction(async (tx, ctx) => {
  ctx.eventLogger.emit('l2_tx', {
    distinctId: tx.from,
    value: scaleDown(tx.value, 18)
  })
})

const tokenMap = new Map<string, token.TokenInfo | undefined>()

async function getTokenInfo(address1: string, address2: string, ctx: EthContext): Promise<token.TokenInfo | undefined> {
  if (address1 == '0x0000000000000000000000000000000000000000') {
    return token.NATIVE_ETH
  } else {
    if (!tokenMap.has(address2)) {
      const info = await token.getERC20TokenInfo(ctx, address2)
      tokenMap.set(address2, info)
    }
    return tokenMap.get(address2)
  }
}

async function handleDepositFinalized(
  args: DepositFinalizedEventObject,
  ctx: L2ERC20TokenBridgeContext | L2StandardBridgeContext
) {
  const { l1Token, l2Token, from, to, amount, extraData } = args
  const tokenInfo = await getTokenInfo(l1Token, l2Token, ctx)
  ctx.eventLogger.emit('bridge', {
    distinctId: from,
    type: 'in',
    from,
    to,
    symbol: tokenInfo?.symbol,
    amount: tokenInfo ? scaleDown(amount, tokenInfo.decimal) : amount,
    extraData
  })
}

async function handleWithdrawlInitiated(
  args: WithdrawalInitiatedEventObject,
  ctx: L2ERC20TokenBridgeContext | L2StandardBridgeContext
) {
  const { l1Token, l2Token, from, to, amount, extraData } = args
  const tokenInfo = await getTokenInfo(l1Token, l2Token, ctx)
  ctx.eventLogger.emit('bridge', {
    distinctId: from,
    type: 'out',
    from,
    to,
    symbol: tokenInfo?.symbol,
    amount: tokenInfo ? scaleDown(amount, tokenInfo.decimal) : amount,
    extraData
  })
}

L2ERC20TokenBridgeProcessor.bind({
  network,
  startBlock,
  address: '0x4d68C6dA4bFD81A664A4E92B0a6cceEEE7c70011'
})
  .onEventDepositFinalized((evt, ctx) => {
    const { _l1Token: l1Token, _l2Token: l2Token, _from: from, _to: to, _amount: amount, _data: extraData } = evt.args
    return handleDepositFinalized({ l1Token, l2Token, from, to, amount, extraData }, ctx)
  })
  .onEventWithdrawalInitiated((evt, ctx) => {
    const { _l1Token: l1Token, _l2Token: l2Token, _from: from, _to: to, _amount: amount, _data: extraData } = evt.args
    return handleWithdrawlInitiated({ l1Token, l2Token, from, to, amount, extraData }, ctx)
  })

L2StandardBridgeProcessor.bind({
  network,
  startBlock,
  address: '0x4200000000000000000000000000000000000010'
})
  .onEventDepositFinalized((evt, ctx) => handleDepositFinalized(evt.args, ctx))
  .onEventWithdrawalInitiated((evt, ctx) => handleWithdrawlInitiated(evt.args, ctx))

L2OpUSDCBridgeAdapterProcessor.bind({
  network,
  startBlock,
  address: '0x7A60495f1A31FE09540Ea5961B28c9FaCD132dA2'
})
  .onEventMessageReceived((evt, ctx) => {
    const { _spender: from, _user: to, _amount: amount } = evt.args
    ctx.eventLogger.emit('bridge', {
      distinctId: from,
      type: 'in',
      from,
      to,
      symbol: 'USDC',
      amount: scaleDown(amount, 6)
    })
  })
  .onEventMessageSent((evt, ctx) => {
    const { _user: from, _to: to, _amount: amount } = evt.args
    ctx.eventLogger.emit('bridge', {
      distinctId: from,
      type: 'out',
      from,
      to,
      symbol: 'USDC',
      amount: scaleDown(amount, 6)
    })
  })
