import { Counter, EthFetchConfig, Gauge } from '@sentio/sdk'
import { ERC20Processor } from '@sentio/sdk/eth/builtin'
import {GlobalProcessor } from '@sentio/sdk/eth'


GlobalProcessor.bind({ startBlock: 17029962 }).onBlockInterval(
  async (tx, ctx) => {
  ctx.meter.Counter('all_block').add(1)
  console.log('block', ctx.blockNumber)
}, 1, 1000, {
  block: true,
  transaction: true,
  transactionReceipt: true,
  trace: true,
})