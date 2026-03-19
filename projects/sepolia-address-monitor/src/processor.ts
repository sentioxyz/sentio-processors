import { EthChainId, GlobalProcessor, EthContext } from '@sentio/sdk/eth'
import { getProvider } from '@sentio/sdk/eth'
import { scaleDown } from '@sentio/sdk'
import { WATCHED_ADDRESSES, ADDRESS_LIST } from './constant.js'

// Calculate gas cost from transaction context
function gasCost(ctx: EthContext): bigint {
  const gasPrice = BigInt(
    ctx.transactionReceipt?.effectiveGasPrice ||
    ctx.transactionReceipt?.gasPrice ||
    ctx.transaction?.gasPrice ||
    0n
  )
  const gasUsed = BigInt(ctx.transactionReceipt?.gasUsed || 0)
  return gasPrice * gasUsed
}

// Get role name from address
function getRole(address: string): string {
  return WATCHED_ADDRESSES[address.toLowerCase()] || 'UNKNOWN'
}

GlobalProcessor.bind({
  network: EthChainId.SEPOLIA,
  startBlock: 7000000, // Recent block on Sepolia
})
  .onBlockInterval(
    async (block, ctx) => {
      // Track balance for all watched addresses on each block interval
      for (const address of ADDRESS_LIST) {
        const role = getRole(address)
        const balance = scaleDown(
          await getProvider(EthChainId.SEPOLIA).getBalance(address, block.number),
          18
        )
        ctx.meter.Gauge('wallet_balance').record(balance, {
          wallet: address,
          role
        })
      }

      // Process traces to detect any transfers involving watched addresses
      const traces = block.traces
      if (!traces) return

      for (const trace of traces) {
        const fromAddr = trace.action.from?.toLowerCase()
        const toAddr = trace.action.to?.toLowerCase()

        // Check if any watched address is involved in this trace
        if (fromAddr && ADDRESS_LIST.includes(fromAddr)) {
          const balance = scaleDown(
            await getProvider(EthChainId.SEPOLIA).getBalance(fromAddr, block.number),
            18
          )
          ctx.meter.Gauge('wallet_balance').record(balance, {
            wallet: fromAddr,
            role: getRole(fromAddr),
          })
        }

        if (toAddr && ADDRESS_LIST.includes(toAddr)) {
          const balance = scaleDown(
            await getProvider(EthChainId.SEPOLIA).getBalance(toAddr, block.number),
            18
          )
          ctx.meter.Gauge('wallet_balance').record(balance, {
            wallet: toAddr,
            role: getRole(toAddr),
          })
        }
      }
    },
    60, // Every 60 blocks
    240, // Backfill 240 blocks
    {
      block: true,
      transaction: true,
      transactionReceipt: true,
      trace: true,
    }
  )
  .onTransaction(
    async (tx, ctx) => {
      const fromAddr = tx.from?.toLowerCase()
      const toAddr = tx.to?.toLowerCase()

      // Only process transactions from watched addresses
      if (!fromAddr || !ADDRESS_LIST.includes(fromAddr)) {
        return
      }

      const role = getRole(fromAddr)
      const gas = gasCost(ctx)
      const gasEth = scaleDown(gas, 18)
      const txStatus = ctx.transactionReceipt?.status === 1 ? 'success' : 'fail'

      // Log the transaction
      ctx.eventLogger.emit('tx', {
        distinctId: fromAddr,
        role,
        to: toAddr || '',
        value: scaleDown(tx.value, 18),
        gasUsed: ctx.transactionReceipt?.gasUsed?.toString() || '0',
        gasCost: gasEth,
        txStatus,
        txHash: tx.hash,
      })

      // Track gas cost metrics
      ctx.meter.Counter('tx_count').add(1, { role, txStatus })
      ctx.meter.Counter('gas_spent').add(gasEth, { role, txStatus })
      ctx.meter.Gauge('last_gas_cost').record(gasEth, { role })

      // Update balance after transaction
      const balance = scaleDown(
        await getProvider(EthChainId.SEPOLIA).getBalance(fromAddr, ctx.blockNumber),
        18
      )
      ctx.meter.Gauge('wallet_balance').record(balance, {
        wallet: fromAddr,
        role,
      })
    },
    {
      transaction: true,
      transactionReceipt: true,
    }
  )
