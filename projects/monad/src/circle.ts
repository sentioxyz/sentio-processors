import { Circle_MessageTransmitterV2Processor } from './types/eth/circle_messagetransmitterv2.js'
import { token } from '@sentio/sdk/utils'
import { network, startBlock } from './utils.js'
import { ethers } from 'ethers'
import { validateAndNormalizeAddress } from '@sentio/sdk/eth'

function parseLog(abi: string, log: any) {
  const Erc20Abi = [abi]
  const interfce = new ethers.Interface(Erc20Abi)
  return interfce.parseLog(log)
}

Circle_MessageTransmitterV2Processor.bind({
  address: '0x81D40F21F12A8F0E3252Bccb954D722d4c464B64',
  network,
  startBlock
})
  .onEventMessageReceived(
    async (evt, ctx) => {
      const logs = ctx.transactionReceipt?.logs || []
      for (const log of logs) {
        if (log.topics[0] == '0x50c55e915134d457debfa58eb6f4342956f8b0616d51a89a3659360178e1ab63') {
          const parsed = parseLog(
            'event MintAndWithdraw (address indexed mintRecipient, uint256 amount, address indexed mintToken, uint256 feeCollected)',
            log
          )
          if (parsed) {
            const info = await token.getERC20TokenInfo(ctx, parsed.args[2])
            ctx.eventLogger.emit('bridge', {
              type: 'in',
              name: 'circle',
              coin_symbol: info.symbol.toLowerCase(),
              amount: BigInt(parsed.args[1]).scaleDown(info.decimal)
            })
          } else {
            console.warn('failed to parse onEventMessageReceived', ctx.transactionHash)
          }
          return
        }
      }
    },
    undefined,
    {
      transaction: true,
      transactionReceipt: true,
      transactionReceiptLogs: true
    }
  )
  .onEventMessageSent(
    async (evt, ctx) => {
      const logs = ctx.transactionReceipt?.logs || []
      for (const log of logs) {
        if (log.topics[0] == '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef') {
          const info = await token.getERC20TokenInfo(ctx, log.address)
          ctx.eventLogger.emit('bridge', {
            type: 'out',
            name: 'circle',
            coin_symbol: info.symbol.toLowerCase(),
            amount: BigInt(log.data).scaleDown(info.decimal)
          })
          return
        }
      }
    },
    undefined,
    {
      transaction: true,
      transactionReceipt: true,
      transactionReceiptLogs: true
    }
  )
