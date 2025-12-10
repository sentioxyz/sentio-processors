import { ContractContext } from '@sentio/sdk/eth'
import { UniswapV2FactoryProcessor } from './types/eth/uniswapv2factory.js'
import {
  UniswapV2Pair,
  UniswapV2PairBoundContractView,
  UniswapV2PairProcessorTemplate,
} from './types/eth/uniswapv2pair.js'
import { UniswapV3FactoryProcessor } from './types/eth/uniswapv3factory.js'
import {
  UniswapV3Pool,
  UniswapV3PoolBoundContractView,
  UniswapV3PoolProcessorTemplate,
} from './types/eth/uniswapv3pool.js'
import { network, recordTvl, START_BLOCK } from './utils.js'
import { getPriceBySymbol, token } from '@sentio/sdk/utils'
import { getERC20ContractOnContext } from '@sentio/sdk/eth/builtin/erc20'
import { UniswapPoolManagerProcessor } from './types/eth/uniswappoolmanager.js'
import { UniswapPool } from './schema/schema.js'
import { GLOBAL_CONFIG } from '@sentio/runtime'
import { ethers } from 'ethers'

GLOBAL_CONFIG.execution = {
  sequential: true,
}

const project = 'uniswap'

interface PoolInfo {
  tokenX: string
  tokenY: string
}

const poolInfoMap = new Map<string, Promise<PoolInfo>>()

async function buildPoolInfo(
  ctx:
    | ContractContext<UniswapV2Pair, UniswapV2PairBoundContractView>
    | ContractContext<UniswapV3Pool, UniswapV3PoolBoundContractView>,
  pool: string,
): Promise<PoolInfo> {
  const [tokenX, tokenY] = await Promise.all([ctx.contract.token0(), ctx.contract.token1()])
  return {
    tokenX,
    tokenY,
  }
}

export const getPoolInfo = async function (
  ctx:
    | ContractContext<UniswapV2Pair, UniswapV2PairBoundContractView>
    | ContractContext<UniswapV3Pool, UniswapV3PoolBoundContractView>,
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

const v2Template = new UniswapV2PairProcessorTemplate().onTimeInterval(
  async (block, ctx) => {
    const [[reserveX, reserveY]] = await Promise.all([ctx.contract.getReserves()])
    const { tokenX, tokenY } = await getPoolInfo(ctx, ctx.address)
    await Promise.all([recordTvl(ctx, tokenX, reserveX, project), recordTvl(ctx, tokenX, reserveY, project)])
  },
  60 * 12,
  60 * 24,
)

const v3Template = new UniswapV3PoolProcessorTemplate().onTimeInterval(
  async (block, ctx) => {
    const { tokenX, tokenY } = await getPoolInfo(ctx, ctx.address)
    const contractX = getERC20ContractOnContext(ctx, tokenX)
    const contractY = getERC20ContractOnContext(ctx, tokenY)
    const [reserveX, reserveY] = await Promise.all([contractX.balanceOf(ctx.address), contractY.balanceOf(ctx.address)])
    await Promise.all([recordTvl(ctx, tokenX, reserveX, project), recordTvl(ctx, tokenX, reserveY, project)])
  },
  60 * 12,
  60 * 24,
)

// UniswapV2FactoryProcessor.bind({
//   network,
//   address: '0x182a927119D56008d921126764bF884221b10f59',
// }).onEventPairCreated(async (evt, ctx) => {
//   const { pair } = await evt.args
//   const startBlock = ctx.blockNumber < START_BLOCK ? START_BLOCK : ctx.blockNumber
//   v2Template.bind({ address: pair, startBlock }, ctx)
// })

// UniswapV3FactoryProcessor.bind({
//   network,
//   address: '0x204FAca1764B154221e35c0d20aBb3c525710498',
// }).onEventPoolCreated(async (evt, ctx) => {
//   const { pool } = await evt.args
//   const startBlock = ctx.blockNumber < START_BLOCK ? START_BLOCK : ctx.blockNumber
//   v3Template.bind({ address: pool, startBlock }, ctx)
// })

const pools = [
  // '0x656f4a9d91db2de816d4bc1f6cff3dbda7e7cd10a60fb694906d9e7a0820e2f6',
  //
  '0x092b650478145f0aee73a1b400b342b9c6314db2e07aeb91faf7e75e8159ce72',
  // '0xadaf30776f551bccdfb307c3fd8cdec198ca9a852434c8022ee32d1ccedd8219',
  // '0x23de420388ac221df146acc41556e74049429a0d186edcd84b21c1d0f743577e',
  // '0x6fed390faee91596851fdf2fa74c0f799d6bbe4f317b7d6ab16ef31fc974e4da',
  // '0xe56868928b91fcd5ebeada3d0ec8767f2bbfeb1e7da181203d13f6af76b03bf9',
  // '0x1c93dd2f2f47439330150bf728c3beeaad71de45420a49183214898b044b65d1',
  // '0x3783b51e33900eb366a9e8473c76cda441e7170d2e5d96927f30c16a7add93aa',
  // '0x659bD0BC4167BA25c62E05656F78043E7eD4a9da',
  // '0xbfd64af1b32c101eeff4f7d51a0f1f522c6a6cdf4de45ae340a58c3d1309032c',
  // '0xe1a8600687e4d06ca4787e5d0ccdacb1d360bfc9ca6ca2a49a688e14d0ef37b4',
  // '0x18a9fc874581f3ba12b7898f80a683c66fd5877fd74b26a85ba9a3a79c549954',
  // '0x55d7ed991392eb9597a76a5f41dfb964e291452c15107c0e64fd3d25925394ce',
  // '0xad408916c1c310da9c258d4c128a7bf50fd9edc42a218cc970da39cfc8a05d93',
  // '0x25EF1a210fF55BcEe9F8fee979aAFf6bD1bE5Bf1',
  // '0xb80d7a8F5331A907E34CD73f575c784B43E5acb5',
  // '0xacf82ECC826A9fc2D8c8C4d370d2D268fA5B3500',
  // '0x1ED2F2057901BBEf02EFbC9928b113a15844A19a',
  // '0xC33e9E441e6f4E74CdB34f878bE51189C9CB00D8',
  // '0xfb2e06638df93ad3080109c410714b0903213135ff6f5909b3a846764df0b801',
  // '0x47448684809ED8B834f3f63B348A2DcA83fa8eF1',
  // '0xd0FC96FF1275702cDc9b3D1EfE4558BF3C35c988',
  // '0xd112fde908d7342135fc7297cc53d25bf7a11d6c6e21fe7ac3e73c40f70827e8',
  // '0x4ac1e6d2eeefa340e9e05ff0b67c0962b500fb7ab1bde4ace7a5ad631da2dc33',
  // '0x6ac413c4d1081e33bdb9aaaef393f45f762f689fd290d8c8f04416118a99ec8f',
  // '0x8f20A8e3cCA039156B98Ca796d87088d6CeF352E',
  // '0xcfd2d35fee02342ed362279b83debe5691b288c0016f4993b944f8161300f60c',
  // '0x58249cb3e44c955d48c6176b1dd5888b7300f0d0b2d1ae934ca8063d16968f9b',
  // '0x2484f8c5934585ac443a8153942f9e26433f673fc7012b5152c482f359de4654',
  // '0x1c4ac3a44775cc7B03fE9c0c55Bc20Ef42aD8720',
  // '0xB0B083E0353f7df4D5EE1C812eA8c6960c080373',
  // '0x033005df021c0e56e5d515f778ec009109a464652d01103c735a02f591068eb8',
  // '0xe3b329308be3b1b2bcc5a3a5301e905051bb2c04f145b33b39558baa1113bb78',
  // '0x1f86a9F2441caC9B942CFb5445530CdBB28717eD',
  // '0x21751b14f200827b17546330b42ee3969fd703681db8fe7ba35c95fe617b0262',
  // '0x129c23ad24fbb9718d5d243fb0dbf384f80aa1f543df703bdba869c502ef77c8',
  // '0x8b926a72640b5766c5daa65365c24009618a91cab560946b550e4aa5ce2ae5f2',
  // '0x8cabe6e0d50003834a6d55e031d24af3530b807116512e0da9ea1550774020b6',
  // '0xa00D8Ec3c0cC20E93Cad749695392a0B61fe8Ca3',
  // '0xa8c385abc25d91dec7d9ccc6145a1453aeed3e9d5c6d9404aeaa47bcf750ae44',
  // '0x7d892749d0562b0f78a26cdec26e97ec9dc7f8d1997cb590643ab69f10a1da0e',
]

const poolFilters = pools.map((id) => UniswapPoolManagerProcessor.filters.Initialize(id))
const liquidityFilters = pools.map((id) => UniswapPoolManagerProcessor.filters.ModifyLiquidity(id))
const swapFilters = pools.map((id) => UniswapPoolManagerProcessor.filters.Swap(id))

UniswapPoolManagerProcessor.bind({
  network,
  address: '0x188d586Ddcf52439676Ca21A244753fA19F9Ea8e',
  // endBlock: 37890195,
})
  .onEventInitialize(async (evt, ctx) => {
    const { id, currency0, currency1 } = evt.args
    ctx.eventLogger.emit('pool', { id, currency0, currency1 })
    await ctx.store.upsert(
      new UniswapPool({
        id,
        token0: currency0.toLowerCase(),
        token1: currency1.toLowerCase(),
        amount0: 0n,
        amount1: 0n,
      }),
    )
  }, poolFilters)
  .onEventModifyLiquidity(
    async (evt, ctx) => {
      const { id } = evt.args
      const pool = await ctx.store.get(UniswapPool, id)
      if (!pool) {
        console.error('uniswap pool not found', evt.transactionHash)
        return
      }
      const logs = ctx.transactionReceipt?.logs
      if (!logs?.length) {
        return
      }
      let amount0 = 0n,
        amount1 = 0n
      console.log('- logs', logs, evt.log.index)
      const lastLog = logs.at(-1)
      if (lastLog?.topics[0] == '0xf81653b8c545b1deb0107759b7cfc7146514dd306db7fc1ae72d2984dec08adf') {
        const abi = ['event LogTotalAmounts (uint256 totalAmount0, uint256 totalAmount1)']
        const interfce = new ethers.Interface(abi)
        // @ts-expect-error
        const data = interfce.parseLog(lastLog.raw)
        if (data?.args) {
          const [amount0, amount1] = data.args
          ctx.eventLogger.emit('rebalance', { id, amount0, amount1 })
          // await ctx.store.upsert(
          //   new UniswapPool({
          //     ...pool,
          //     amount0: amount0 * BigInt(1e6),
          //     amount1: amount1 * BigInt(1e6),
          //   }),
          // )
          // return
        }
      }
      for (const _log of logs) {
        // @ts-expect-error
        const log = _log.raw
        if (+log.logIndex <= +evt.log.index) {
          continue
        }
        if (log.topics[0] == '0x450df3aa68d3d7f80b8c701de9e6ca1271369515b3cfb365b764bfa58cd635e2') {
          // if (log.address == '0x280de5171c9c585bd1832fb4ada548adbc35508b') {
          // Rebalance, e.g. https://monadvision.com/tx/0xfcaa99d67c6868e5f63311135f8951687ba0502625c086b0dc22ac07ee2711b7?tab=Logs
          // continue
        }
        if (
          +log.logIndex > +evt.log.index + 3 ||
          log.topics[0] != '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef'
        ) {
          break
        }
        if (log.address == pool.token0) {
          amount0 = BigInt(log.data)
          if (log.topics[1].slice(-40) == ctx.address.slice(-40)) {
            amount0 = -amount0
          }
        } else if (log.address == pool.token1) {
          amount1 = BigInt(log.data)
          if (log.topics[1].slice(-40) == ctx.address.slice(-40)) {
            amount1 = -amount1
          }
        }
      }
      ctx.eventLogger.emit('liquidity', { id, amount0, amount1 })
      if (amount0 != 0n || amount1 != 0n) {
        await ctx.store.upsert(
          new UniswapPool({
            ...pool,
            amount0: pool.amount0 + amount0,
            amount1: pool.amount1 + amount1,
          }),
        )
      } else {
        console.log('delta0', logs, pool, evt.transactionHash, evt.log.index)
      }
    },
    liquidityFilters,
    {
      transactionReceipt: true,
      transactionReceiptLogs: true,
    },
  )
  .onEventSwap(async (evt, ctx) => {
    const { id, amount0, amount1 } = evt.args
    ctx.eventLogger.emit('swap', { id, amount0, amount1 })
    const pool = await ctx.store.get(UniswapPool, id)
    if (!pool) {
      console.error('uniswap pool not found', evt.transactionHash)
      return
    }
    await ctx.store.upsert(
      new UniswapPool({
        ...pool,
        amount0: pool.amount0 - amount0,
        amount1: pool.amount1 - amount1,
      }),
    )
  }, swapFilters)
// .onEventTransfer(async (evt, ctx) => {
//   const { caller, from, to, id, amount } = evt.args
//   ctx.eventLogger.emit('transfer', { id, amount, from, to, caller })
// })
