import { InvFeedProcessor, InvFeedContext } from './types/invfeed'

const INV_ADDRESS = "0x210aC53b27f16e20A9aa7d16260F84693390258F".toLowerCase()

const latestAnswerProcessor = async function (_:any, ctx: InvFeedContext) {
  const latestAnswer = Number((await ctx.contract.latestAnswer()).toBigInt() / 10n ** 12n) / (10**6)
  ctx.meter.Gauge('Inv_latestAnswer').record(latestAnswer)
}

InvFeedProcessor.bind({address: INV_ADDRESS, startBlock: 12415660})
.onBlock(latestAnswerProcessor)



