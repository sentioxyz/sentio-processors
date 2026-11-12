import { ContractContext, EthContext, RichBlock } from '@sentio/sdk/eth'
import {
  PancakeV2Pair,
  PancakeV2PairBoundContractView,
  PancakeV2PairProcessor,
  PancakeV2PairProcessorTemplate,
  BurnEvent as BurnEventV2,
  MintEvent as MintEventV2,
  SwapEvent as SwapEventV2,
  TransferEvent,
} from './types/eth/pancakev2pair.js'
import {
  PancakeV3Pool,
  PancakeV3PoolBoundContractView,
  PancakeV3PoolProcessor,
  PancakeV3PoolProcessorTemplate,
  BurnEvent as BurnEventV3,
  MintEvent as MintEventV3,
  CollectEvent,
  FlashEvent,
  SwapEvent as SwapEventV3,
} from './types/eth/pancakev3pool.js'
import { network, recordSwap, recordTx, START_BLOCK } from './utils.js'
import { token } from '@sentio/sdk/utils'
import { getERC20ContractOnContext } from '@sentio/sdk/eth/builtin/erc20'
import { PancakeV2FactoryProcessor } from './types/eth/pancakev2factory.js'
import { PancakeV3FactoryProcessor } from './types/eth/pancakev3factory.js'

const v2Pools = [
  ['0x541b525b69210bc349c7d94ea6f10e202a6f90fa', 'LAF/USDT'],
  ['0xcaaf3c41a40103a23eeaa4bba468af3cf5b0e0d8', 'USDT/ARK'],
  ['0xde66f1b24002c1d743ad1ef13cd4b2474295a6f6', 'USDA/USDT'],
  ['0xc913c3b6e0620a24859ef329af8e31db34717a3c', 'USDT/DM'],
  ['0x1cea83ec5e48d9157fcae27a19807bef79195ce1', 'WBNB/ELEPHANT'],
  ['0x16b9a82891338f9ba80e2d6970fdda79d1eb0dae', 'USDT/WBNB'],
  ['0x0b32ea94da1f6679b11686ead47aa4c6bf38cd59', 'BTCB/MGC'],
  ['0x0ed7e52944161450477ee417de9cd3a859b14fd0', 'Cake/WBNB'],
  ['0x3b5774820a87b59761cc862ee26d3c89fab6683c', 'USDT/NAT'],
  ['0x6865704ff097b1105ed42b8517020e14fe9a2abd', 'OLY/USDT'],
  ['0x64226b73c37562bb4e7a550d5e4e4c415b5482c3', 'USDT/ORA'],
  ['0x2badfbe196c6dbd5eebca062749aaf76deecccde', 'WBNB/DA'],
  ['0x1389928c3c00b5022804e1e62cf8963c71a22067', 'USDT/MPC'],
  ['0x231d9e7181e8479a8b40930961e93e7ed798542c', 'WBNB/FLOKI'],
  ['0xc736ca3d9b1e90af4230bd8f9626528b3d4e0ee0', 'WBNB/BabyDoge'],
  ['0x647bc907d520c3f63be38d01dbd979f5606bec48', 'ELEPHANT/BUSD'],
  ['0x7dc155da3080e528fdf48abc4e4fec6923eb9e5d', 'USDT/SF'],
  ['0xb9fe6c82a37a5fee8b67906a09650883953c114e', 'USDC/PHI'],
  ['0x1831bb2723ced46e1b6c08d2f3ae50b2ab9427b9', 'USDT/GOT'],
  ['0x4dad94d888030b3eb4e5086dd81b4eaeceb08de8', 'USDT/CPT'],
  ['0x58f876857a02d6762e0101bb5c46a8c1ed44dc16', 'WBNB/BUSD'],
  ['0xcf0270ff8021ec98db24bab9e9e35eacb0e392cf', 'USDT/OEX'],
  ['0xe267018c943e77992e7e515724b07b9ce7938124', 'WBNB/HERO'],
  ['0xff87bda5270d2fbcc8b131dbd630996214861450', 'USDC/MiniDoge'],
  ['0x3308259f2bbc2645d50fd1b9babf574013bdb384', 'USDT/JUST'],
  ['0x8665a78ccc84d6df2acaa4b207d88c6bc9b70ec5', 'wkeyDAO/USDT'],
  ['0xa2f464a2462aed49b9b31eb8861bc6b0bbb0483f', 'USDT/GANA'],
  ['0xa2e734199cc6fe60523670b9e4fdfa7fcdbc97a1', 'DSG/USDT'],
  ['0x573a40bea4cee174f2fdb50312501ef4a7952c58', 'USDT/SPL'],
]

const v3Pools = [
  ['0xb67e5eaf770a384ab28029d08b9bc5ebe32beb0f', 'USDT/DUSD'],
  ['0x64f63bb92702449f67b15c3dc4f65c83d0bdf0b7', 'USDT/RZUSD'],
  ['0x9d9b54367441354a651c4a4b4364084382a717b4', 'USDT/GHO'],
  ['0x4f31fa980a675570939b737ebdde0471a4be40eb', 'USDT/USDC'],
  ['0x172fcd41e0913e95784454622d1c3724f546f849', 'USDT/WBNB'],
  ['0x92b7807bf19b7dddf89b706143896d05228f3121', 'USDT/USDC'],
  ['0x39ccdd72541652ceb60d5bbf0828fd2b1753f3f9', 'USDT/PRDT'],
  ['0x46cf1cf8c69595804ba91dfdd8d6b960c9b0a7c4', 'USDT/BTCB'],
  ['0xfa09940612d7ae39f7f220f3ca6816bd72844577', 'USDT/LUSD'],
  ['0x9c4ee895e4f6ce07ada631c508d1306db7502cce', 'USDT/USD1'],
  ['0x6bbc40579ad1bbd243895ca0acb086bb6300d636', 'BTCB/WBNB'],
  ['0xcf59b8c8baa2dea520e3d549f97d4e49ade17057', 'USDT/KOGE'],
  ['0xa047e4455ee40ca83a2f4220de8d2bf40d76d18c', 'USDT/Bin'],
  ['0x61db764c20a2ebfb7e8a7a5afb0b2dd85a4cef5f', 'WBNB/BabyDoge'],
  ['0xdf95771a236b6a87b1325bf674737fe498aaefde', 'USDT/PMT'],
  ['0xd0e226f674bbf064f54ab47f42473ff80db98cba', 'ETH/WBNB'],
  ['0xb433ae7e7011a2fb9a4bbb86140e0f653dcfcfba', 'AIOT/WBNB'],
  ['0x133b3d95bad5405d14d53473671200e9342896bf', 'Cake/WBNB'],
  ['0x38231d4ef9d33ebea944c75a21301ff6986499c3', 'Cheems/WBNB'],
  ['0x7f51c8aaa6b0599abd16674e2b17fec7a9f674a1', 'Cake/USDT'],
]

interface PoolInfo {
  tokenX: string
  tokenY: string
  infoX: token.TokenInfo
  infoY: token.TokenInfo
}

const poolInfoMap = new Map<string, Promise<PoolInfo>>()

async function buildPoolInfo(
  ctx:
    | ContractContext<PancakeV2Pair, PancakeV2PairBoundContractView>
    | ContractContext<PancakeV3Pool, PancakeV3PoolBoundContractView>,
  pool: string,
): Promise<PoolInfo> {
  const [tokenX, tokenY] = await Promise.all([ctx.contract.token0(), ctx.contract.token1()])
  const [infoX, infoY] = await Promise.all([token.getERC20TokenInfo(ctx, tokenX), token.getERC20TokenInfo(ctx, tokenY)])
  return {
    tokenX,
    tokenY,
    infoX,
    infoY,
  }
}

export const getPoolInfo = async function (
  ctx:
    | ContractContext<PancakeV2Pair, PancakeV2PairBoundContractView>
    | ContractContext<PancakeV3Pool, PancakeV3PoolBoundContractView>,
  pool: string,
): Promise<PoolInfo> {
  let infoPromise = poolInfoMap.get(pool)
  if (!infoPromise) {
    infoPromise = buildPoolInfo(ctx, pool)
    poolInfoMap.set(pool, infoPromise)
    console.log('set poolInfoMap for ' + pool)
  }
  return await infoPromise
}

const v2OnTimeInterval = async (
  block: RichBlock,
  ctx: ContractContext<PancakeV2Pair, PancakeV2PairBoundContractView>,
) => {
  const [reserveX, reserveY] = await ctx.contract.getReserves()
  const { infoX, infoY } = await getPoolInfo(ctx, ctx.address)
  if (infoX.symbol.includes('USD')) {
    ctx.eventLogger.emit('defi', {
      symbol: infoX.symbol,
      amount: BigInt(reserveX).scaleDown(infoX.decimal),
      platform: 'pancake',
    })
  }
  if (infoY.symbol.includes('USD')) {
    ctx.eventLogger.emit('defi', {
      symbol: infoY.symbol,
      amount: BigInt(reserveY).scaleDown(infoY.decimal),
      platform: 'pancake',
    })
  }
}

const v2Template = new PancakeV2PairProcessorTemplate().onTimeInterval(v2OnTimeInterval, 60 * 12, 60 * 24)

const v3OnTimeInterval = async (
  block: RichBlock,
  ctx: ContractContext<PancakeV3Pool, PancakeV3PoolBoundContractView>,
) => {
  const address = ctx.address
  const { infoX, infoY, tokenX, tokenY } = await getPoolInfo(ctx, address)
  if (infoX.symbol.includes('USD')) {
    const contract = getERC20ContractOnContext(ctx, tokenX)
    const reserveX = await contract.balanceOf(address)
    ctx.eventLogger.emit('defi', {
      symbol: infoX.symbol,
      amount: BigInt(reserveX).scaleDown(infoX.decimal),
      platform: 'pancake',
    })
  }
  if (infoY.symbol.includes('USD')) {
    const contract = getERC20ContractOnContext(ctx, tokenY)
    const reserveY = await contract.balanceOf(address)
    ctx.eventLogger.emit('defi', {
      symbol: infoY.symbol,
      amount: BigInt(reserveY).scaleDown(infoY.decimal),
      platform: 'pancake',
    })
  }
}

const v3Template = new PancakeV3PoolProcessorTemplate().onTimeInterval(v3OnTimeInterval, 60 * 12, 60 * 24)

function handleEvent(
  evt: MintEventV2 | BurnEventV2 | TransferEvent | MintEventV3 | BurnEventV3 | CollectEvent | FlashEvent,
  ctx: EthContext,
) {
  // const distinctId = 'sender' in evt.args ? evt.args.sender : evt.args.owner
  const distinctId = ctx.transaction!.from
  recordTx(ctx, distinctId, 'pancake')
}

async function handleSwapV2(evt: SwapEventV2, ctx: ContractContext<PancakeV2Pair, PancakeV2PairBoundContractView>) {
  const { infoX, infoY, tokenX, tokenY } = await getPoolInfo(ctx, ctx.address)
  const { amount0In, amount0Out, amount1In, amount1Out, sender } = evt.args
  const distinctId = ctx.transaction!.from
  recordTx(ctx, distinctId, 'pancake')
  if (infoX.symbol.includes('USD') && infoY.symbol.includes('USD')) {
    const pair = `${infoX.symbol}-${infoY.symbol}`
    recordSwap(
      ctx,
      distinctId,
      pair,
      infoX.decimal,
      infoY.decimal,
      amount0In + amount1Out,
      amount1In + amount1Out,
      'pancake',
    )
  }
}

async function handleSwapV3(evt: SwapEventV3, ctx: ContractContext<PancakeV3Pool, PancakeV3PoolBoundContractView>) {
  const { infoX, infoY, tokenX, tokenY } = await getPoolInfo(ctx, ctx.address)
  let { amount0, amount1, sender } = evt.args
  const distinctId = ctx.transaction!.from
  recordTx(ctx, distinctId, 'pancake')
  if (infoX.symbol.includes('USD') && infoY.symbol.includes('USD')) {
    if (amount0 < 0) {
      amount0 = -amount0
    }
    if (amount1 < 0) {
      amount1 = -amount1
    }
    const pair = `${infoX.symbol}-${infoY.symbol}`
    recordSwap(ctx, distinctId, pair, infoX.decimal, infoY.decimal, amount0, amount1, 'pancake')
  }
}

v2Pools.forEach(([address]) => {
  PancakeV2PairProcessor.bind({ network, address, startBlock: START_BLOCK })
    .onTimeInterval(v2OnTimeInterval, 60 * 12, 60 * 24)
    .onEventMint(handleEvent, undefined, { transaction: true })
    .onEventBurn(handleEvent, undefined, { transaction: true })
    .onEventTransfer(handleEvent, undefined, { transaction: true })
    .onEventSwap(handleSwapV2, undefined, { transaction: true })
})

v3Pools.forEach(([address]) => {
  PancakeV3PoolProcessor.bind({ network, address, startBlock: START_BLOCK })
    .onTimeInterval(v3OnTimeInterval, 60 * 12, 60 * 24)
    .onEventMint(handleEvent, undefined, { transaction: true })
    .onEventBurn(handleEvent, undefined, { transaction: true })
    .onEventCollect(handleEvent, undefined, { transaction: true })
    .onEventFlash(handleEvent, undefined, { transaction: true })
    .onEventSwap(handleSwapV3, undefined, { transaction: true })
})

// PancakeV2FactoryProcessor.bind({ network, address: '0xcA143Ce32Fe78f1f7019d7d551a6402fC5350c73' }).onEventPairCreated(
//   async (evt, ctx) => {
//     const { token0, token1, pair } = evt.args
//     let infoX, infoY
//     try {
//       ;[infoX, infoY] = await Promise.all([token.getERC20TokenInfo(ctx, token0), token.getERC20TokenInfo(ctx, token1)])
//     } catch (e) {
//       console.warn('invalid pancake v2 pair:', token0, token1, pair)
//       return
//     }
//     if (infoX.symbol.includes('USD') || infoY.symbol.includes('USD')) {
//       console.log('new pancake v2 pair:', infoX.symbol, infoY.symbol, pair)
//       const startBlock = ctx.blockNumber < START_BLOCK ? START_BLOCK : ctx.blockNumber
//       v2Template.bind({ address: pair, startBlock }, ctx)
//     }
//   }
// )

// PancakeV3FactoryProcessor.bind({ network, address: '0x0BFbCF9fa4f9C56B0F40a671Ad40E0805A091865' }).onEventPoolCreated(
//   async (evt, ctx) => {
//     const { token0, token1, pool } = evt.args
//     const [infoX, infoY] = await Promise.all([
//       token.getERC20TokenInfo(ctx, token0),
//       token.getERC20TokenInfo(ctx, token1)
//     ])
//     if (infoX.symbol.includes('USD') || infoY.symbol.includes('USD')) {
//       console.log('new pancake v3 pool:', infoX.symbol, infoY.symbol, pool)
//       const startBlock = ctx.blockNumber < START_BLOCK ? START_BLOCK : ctx.blockNumber
//       v3Template.bind({ address: pool, startBlock }, ctx)
//     }
//   }
// )
