import { EthContext, GenericProcessor, GlobalContext, GlobalProcessor } from '@sentio/sdk/eth'
import { scaleDown } from '@sentio/sdk'
// import { L2ERC20TokenBridgeContext, L2ERC20TokenBridgeProcessor } from './types/eth/l2erc20tokenbridge.js'
import {
  DepositFinalizedEventObject,
  L2StandardBridgeContext,
  L2StandardBridgeProcessor,
  WithdrawalInitiatedEventObject
} from './types/eth/l2standardbridge.js'
import { L2OpUSDCBridgeAdapterProcessor } from './types/eth/l2opusdcbridgeadapter.js'
import { token } from '@sentio/sdk/utils'
import { User } from './schema/schema.js'
import { LRUCache } from 'lru-cache'
import { network, startBlock, getTokenInfo } from './utils.js'
import './ccip.js'
import './stargate.js'
import { handleACS } from './acs.js'

const bridges = new Map([
  ['0x1f49a3fa2b5B5b61df8dE486aBb6F3b9df066d86'.toLowerCase(), 'Owlto Finance'],
  ['0xB50Ac92D6d8748AC42721c25A3e2C84637385A6b'.toLowerCase(), 'Comet'],
  ['0x5e023c31E1d3dCd08a1B3e8c96f6EF8Aa8FcaCd1'.toLowerCase(), 'rhino.fi'],
  ['0x2fc617e933a52713247ce25730f6695920b3befe'.toLowerCase(), 'Layerswap']
])

const userCache = new LRUCache<string, boolean>({
  max: 1000000
})

interface ContractInfo {
  is_contract: boolean
  name: string
}
const contractCache = new LRUCache<string, ContractInfo>({
  max: 1000000
})

async function getContractInfo(address: string) {
  let info = contractCache.get(address)
  if (!info) {
    const res = await fetch(`https://soneium.blockscout.com/api/v2/addresses/${address}`)
    const data = await res.json()
    info = {
      is_contract: data.is_contract,
      name: data.name
    }
    contractCache.set(address, info)
  }
  return info
}

GlobalProcessor.bind({ network, startBlock }).onTransaction(
  async (tx, ctx) => {
    const user = tx.from
    const contractInfo = tx.to ? await getContractInfo(tx.to) : undefined
    const gasCost = getGasCost(ctx)
    ctx.eventLogger.emit('l2_tx', {
      ...contractInfo,
      distinctId: user,
      to: tx.to,
      value: scaleDown(tx.value, 18),
      gasCost
    })

    let existing = userCache.has(user)
    if (!existing) {
      userCache.set(user, true)
      existing = !!(await ctx.store.get(User, user))
      if (!existing) {
        ctx.eventLogger.emit('new_user', {
          distinctId: user
        })
        await ctx.store.upsert(new User({ id: user }))
      }
    }

    let bridgeType, bridgeName
    if (bridges.has(tx.from.toLowerCase())) {
      bridgeType = 'in'
      bridgeName = bridges.get(tx.from.toLowerCase())
    } else if (bridges.has(tx.to?.toLowerCase() as any)) {
      bridgeType = 'out'
      bridgeName = bridges.get(tx.to!.toLowerCase())
    }
    if (bridgeType) {
      ctx.eventLogger.emit('bridge', {
        distinctId: user,
        type: bridgeType,
        name: bridgeName,
        from: tx.from,
        to: tx.to,
        symbol: 'ETH',
        amount: scaleDown(tx.value, 18)
      })
    }

    handleACS({ from: tx.from, to: tx.to, gasCost }, ctx)
  },
  {
    transaction: true,
    transactionReceipt: true
  }
)

async function handleDepositFinalized(
  bridgeName: string,
  args: DepositFinalizedEventObject,
  ctx: L2StandardBridgeContext
) {
  const { l1Token, l2Token, from, to, amount, extraData } = args
  const tokenInfo = await getTokenInfo(l1Token, l2Token, ctx)
  ctx.eventLogger.emit('bridge', {
    distinctId: from,
    type: 'in',
    name: bridgeName,
    from,
    to,
    symbol: tokenInfo?.symbol,
    amount: tokenInfo ? scaleDown(amount, tokenInfo.decimal) : amount,
    extraData
  })
}

async function handleWithdrawlInitiated(
  bridgeName: string,
  args: WithdrawalInitiatedEventObject,
  ctx: L2StandardBridgeContext
) {
  const { l1Token, l2Token, from, to, amount, extraData } = args
  const tokenInfo = await getTokenInfo(l1Token, l2Token, ctx)
  ctx.eventLogger.emit('bridge', {
    distinctId: from,
    type: 'out',
    name: bridgeName,
    from,
    to,
    symbol: tokenInfo?.symbol,
    amount: tokenInfo ? scaleDown(amount, tokenInfo.decimal) : amount,
    extraData
  })
}

// L2ERC20TokenBridgeProcessor.bind({
//   network,
//   startBlock,
//   address: '0x4d68C6dA4bFD81A664A4E92B0a6cceEEE7c70011'
// })
//   .onEventDepositFinalized((evt, ctx) => {
//     const { _l1Token: l1Token, _l2Token: l2Token, _from: from, _to: to, _amount: amount, _data: extraData } = evt.args
//     return handleDepositFinalized({ l1Token, l2Token, from, to, amount, extraData }, ctx)
//   })
//   .onEventWithdrawalInitiated((evt, ctx) => {
//     const { _l1Token: l1Token, _l2Token: l2Token, _from: from, _to: to, _amount: amount, _data: extraData } = evt.args
//     return handleWithdrawlInitiated({ l1Token, l2Token, from, to, amount, extraData }, ctx)
//   })

L2StandardBridgeProcessor.bind({
  network,
  startBlock,
  address: '0x4200000000000000000000000000000000000010'
})
  .onEventDepositFinalized((evt, ctx) => handleDepositFinalized('L2StandardBridge', evt.args, ctx))
  .onEventWithdrawalInitiated((evt, ctx) => handleWithdrawlInitiated('L2StandardBridge', evt.args, ctx))

L2OpUSDCBridgeAdapterProcessor.bind({
  network,
  startBlock,
  address: '0x8be79275FCfD08A931087ECf70Ba8a99aee3AC59'
})
  .onEventMessageReceived((evt, ctx) => {
    const { _spender: from, _user: to, _amount: amount } = evt.args
    ctx.eventLogger.emit('bridge', {
      distinctId: from,
      type: 'in',
      name: 'L2OpUSDCBridgeAdapter',
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
      name: 'L2OpUSDCBridgeAdapter',
      from,
      to,
      symbol: 'USDC',
      amount: scaleDown(amount, 6)
    })
  })

function getGasCost(ctx: EthContext) {
  const gas =
    BigInt(
      ctx.transactionReceipt?.effectiveGasPrice || ctx.transactionReceipt?.gasPrice || ctx.transaction?.gasPrice || 0n
    ) * BigInt(ctx.transactionReceipt?.gasUsed || 0)
  return scaleDown(gas, 18)
}
