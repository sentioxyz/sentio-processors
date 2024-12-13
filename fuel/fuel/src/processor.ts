import { EthChainId, GlobalContext, GlobalProcessor } from '@sentio/sdk/eth'
import { FuelERC20GatewayV4Context, FuelERC20GatewayV4Processor } from './types/eth/fuelerc20gatewayv4.js'
import { getPriceByType, token } from '@sentio/sdk/utils'
import { BigDecimal, scaleDown } from '@sentio/sdk'

const startBlock = 20678194

async function getTokenInfo(address: string): Promise<token.TokenInfo> {
  if (address !== '0x0000000000000000000000000000000000000000') {
    return await token.getERC20TokenInfo(EthChainId.ETHEREUM, address)
  } else {
    return token.NATIVE_ETH
  }
}

async function getUsdValue(ctx: FuelERC20GatewayV4Context, token: string, amount: BigDecimal): Promise<BigDecimal> {
  const price = (await getPriceByType(EthChainId.ETHEREUM, token, ctx.timestamp)) || 0
  return amount.multipliedBy(price)
}

async function recordBalance(
  eventName: 'deposit' | 'withdraw',
  {
    user,
    tokenAddress,
    amount,
    ctx
  }: {
    user: string
    tokenAddress: string
    amount: bigint
    ctx: FuelERC20GatewayV4Context
  }
) {
  const tokenInfo = await getTokenInfo(tokenAddress)
  const usd = await getUsdValue(ctx, tokenAddress, amount.scaleDown(tokenInfo.decimal))

  ctx.eventLogger.emit(eventName, {
    distinctId: user,
    tokenAddress,
    symbol: tokenInfo.symbol,
    amount: scaleDown(amount, tokenInfo.decimal),
    usd
  })
}

FuelERC20GatewayV4Processor.bind({
  address: '0xa4cA04d02bfdC3A2DF56B9b6994520E69dF43F67',
  startBlock
})
  .onEventDeposit(async (evt, ctx) => {
    const { sender, tokenAddress, amount } = evt.args
    await recordBalance('deposit', { user: sender, tokenAddress, amount, ctx })
  })
  .onEventWithdrawal(async (evt, ctx) => {
    const { recipient, tokenAddress, amount } = evt.args
    await recordBalance('withdraw', {
      user: recipient,
      tokenAddress,
      amount,
      ctx
    })
  })

function gasCost(ctx: GlobalContext) {
  return scaleDown(
    BigInt(
      ctx.transactionReceipt?.effectiveGasPrice || ctx.transactionReceipt?.gasPrice || ctx.transaction?.gasPrice || 0n
    ) * BigInt(ctx.transactionReceipt?.gasUsed || 0),
    18
  )
}

GlobalProcessor.bind({ startBlock }).onTransaction(
  (tx, ctx) => {
    const from = tx.from.toLowerCase()
    if (['0xea0337efc12e98ab118948da570c07691e8e4b37', '0x83dc58504d1d2276bc8d9cf01d0b341d84a49cff'].includes(from)) {
      ctx.eventLogger.emit('fee', {
        distinctId: from,
        value: tx.value,
        gas: gasCost(ctx)
      })
    }
  },
  { transaction: true, transactionReceipt: true }
)
