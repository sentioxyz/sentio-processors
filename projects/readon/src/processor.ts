import { StarNFTProcessor, StarNFTContext } from './types/starnft'

const BSC_ADDR = "0xf2e0ac05157a2843c53c6295c0edea6c9ac65c72"

StarNFTProcessor.bind({ address: BSC_ADDR, network: 56 })
.onEventApprovalForAll((evt, ctx) => {
  const operator = evt.args.operator
  ctx.meter.Counter("approval_for_all_count").add(1)
  ctx.meter.Gauge("approval_for_all_gauge").record(1, {operator: operator})
})
