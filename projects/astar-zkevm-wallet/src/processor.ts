import { ERC20Context, ERC20Processor, getERC20Contract } from '@sentio/sdk/eth/builtin/erc20'
import { Counter, Gauge } from '@sentio/sdk'
import { token } from '@sentio/sdk/utils'
import { EthChainId } from '@sentio/sdk/eth'
import { UserBalance } from './schema/schema.js'

const wallet = Counter.register('wallet')

const tokensInfo = new Map<string, token.TokenInfo>()

async function getTokenInfo(address: string) {
  let info = tokensInfo.get(address)
  if (!info) {
    info = await token.getERC20TokenInfo(EthChainId.ASTAR_ZKEVM, address)
    tokensInfo.set(address, info)
  }
  return info
}

// https://docs.astar.network/docs/build/zkEVM/canonical-zkevm-contracts/#bridged-tokens
;[
  // ASTR
  '0xdf41220C7e322bFEF933D85D01821ad277f90172',
  // Dai
  '0xC5015b9d9161Dca7e18e32f6f25C4aD850731Fd4',
  // Matic Token (MATIC)
  '0xa2036f0538221a77A3937F1379699f44945018d0',
  // USD Coin (USDC)
  '0xA8CE8aee21bC2A48a5EF670afCc9274C7bbbC035',
  // Tether USD (USDT)
  '0x1E4a5963aBFD975d8c9021ce480b42188849D41d',
  // Wrapped BTC (WBTC)
  '0xEA034fb02eB1808C2cc3adbC15f447B93CbE08e1',
  // Wrapped eETH (weETH)
  '0xcD68DFf4415358c35a28f96Fd5bF7083B22De1D6',
  // Wrapped liquid staked Ether 2.0 (wstETH)
  '0x5D8cfF95D7A57c0BF50B30b43c7CC0D52825D4a9'
].map((address) => {
  ERC20Processor.bind({
    network: EthChainId.ASTAR_ZKEVM,
    address
  }).onEventTransfer(async (evt, ctx) => {
    const info = await getTokenInfo(address)
    const { symbol } = info
    const { from, to, value } = evt.args
    const amount = value.scaleDown(info.decimal)
    wallet.sub(ctx, amount, { symbol, wallet: from })
    wallet.add(ctx, amount, { symbol, wallet: to })

    const [fromBalance, toBalance] = await Promise.all([
      ctx.store.get(UserBalance, `${from}-${symbol}`),
      ctx.store.get(UserBalance, `${to}-${symbol}`)
    ])
    await Promise.all([
      ctx.store.upsert(
        new UserBalance({
          id: `${from}-${symbol}`,
          wallet: from,
          symbol,
          balance: (fromBalance?.balance || 0n) - value
        })
      ),
      ctx.store.upsert(
        new UserBalance({
          id: `${to}-${symbol}`,
          wallet: to,
          symbol,
          balance: (toBalance?.balance || 0n) + value
        })
      )
    ])
    ctx.eventLogger.emit('transfer', {
      from,
      to,
      amount
    })
  })
})
