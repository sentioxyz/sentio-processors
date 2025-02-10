import { EthContext } from '@sentio/sdk/eth'
import { StargatePoolNativeProcessor } from './types/eth/stargatepoolnative.js'
import { StargatePoolUSDCProcessor } from './types/eth/stargatepoolusdc.js'
import { network, startBlock, getTokenInfo } from './utils.js'
import { scaleDown } from '@sentio/sdk'

function emitBridgeEvent(type: string, symbol: string, amount: bigint, ctx: EthContext) {
  ctx.eventLogger.emit('bridge', {
    type,
    name: 'Stargate',
    symbol,
    amount: scaleDown(amount, symbol == 'USDC' ? 6 : 18)
  })
}

StargatePoolNativeProcessor.bind({
  network,
  startBlock,
  address: '0x2F6F07CDcf3588944Bf4C42aC74ff24bF56e7590'
})
  .onEventOFTSent((evt, ctx) => {
    const { fromAddress, amountSentLD, dstEid } = evt.args
    emitBridgeEvent('out', 'ETH', amountSentLD, ctx)
  })
  .onEventOFTReceived((evt, ctx) => {
    const { toAddress, amountReceivedLD, srcEid } = evt.args
    emitBridgeEvent('in', 'ETH', amountReceivedLD, ctx)
  })

StargatePoolUSDCProcessor.bind({
  network,
  startBlock,
  address: '0x45f1A95A4D3f3836523F5c83673c797f4d4d263B'
})
  .onEventOFTSent((evt, ctx) => {
    const { fromAddress, amountSentLD, dstEid } = evt.args
    emitBridgeEvent('out', 'USDC', amountSentLD, ctx)
  })
  .onEventOFTReceived((evt, ctx) => {
    const { toAddress, amountReceivedLD, srcEid } = evt.args
    emitBridgeEvent('in', 'USDC', amountReceivedLD, ctx)
  })
