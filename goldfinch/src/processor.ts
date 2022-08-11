import { SeniorPoolContext, SeniorPoolProcessor} from './types/seniorpool_processor'
// import { getChainName } from '@sentio/sdk';

// TODO provide builtin
const getChainName = function(id: any): string {
  return String(CHAIN_ID_MAP.get(Number(id)))
}
const CHAIN_ID_MAP = new Map<number, String>(
  [
    [1, "Ethereum"],
    [10, "Optimism"],
    [25, "Cronos"],
    [56, "BSC"],
    [66, "OKC"],
    [128, "Huobi"],
    [137, "Polygon"],
    [250, "Fantom"],
    [321, "KCC"],
    [42161, "Arbitrum"],
    [43114, "Avalanche"]
  ]
)
const startBlock = 13096883 

// ETH addresses
const seniorPoolAddress = "0x8481a6ebaf5c7dabc3f7e09e44a89531fd31f822"

const seniorPoolHandler = async function(_:any, ctx: SeniorPoolContext) {
  const totalLoansOutstanding = await Number(ctx.contract.totalLoansOutstanding()) / 10**6
  const sharePrice = await Number(ctx.contract.sharePrice()) / 10**6
  const assets = await Number(ctx.contract.assets()) / 10**6

  ctx.meter.Histogram('goldfinch_totalLoansOutstanding').record(totalLoansOutstanding)
  ctx.meter.Histogram('goldfinch_sharePrice').record(sharePrice)
  ctx.meter.Histogram('goldfinch_assets').record(assets)

}

SeniorPoolProcessor.bind(seniorPoolAddress)
.startBlock(startBlock)
.onBlock(seniorPoolHandler)