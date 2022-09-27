import {SwapEvent, UniswapContext, UniswapProcessor, UniswapProcessorTemplate} from './types/uniswap'
import {PoolCreatedEvent, UniswapFactoryContext, UniswapFactoryProcessor} from "./types/uniswapfactory";


const TokenWatching = new Map([
    ['0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', 'USDC'],
    ['0x6B175474E89094C44Da98b954EedeAC495271d0F', 'DAI']
])

function buildPoolName(token0: string, token1: string, fee: number): string {
    return TokenWatching.get(token0) + "_" + TokenWatching.get(token1) + "_" + fee;
}

function checkTokensWatching(token0: string, token1: string): boolean {
    return TokenWatching.get(token0) !== undefined && TokenWatching.get(token1) != undefined
}

const poolTemplate = new UniswapProcessorTemplate()
    .onEventSwap(
        async function (event: SwapEvent, ctx: UniswapContext) {
            const poolName = buildPoolName(
                await ctx.contract.token0(),
                await ctx.contract.token1(),
                await ctx.contract.fee())
            const name = poolName + "_amount0"
            ctx.meter.Gauge(name).record(Math.abs(Number(event.args.amount0.toBigInt())))
        }
    )

UniswapFactoryProcessor.bind({address: '0x1F98431c8aD98523631AE4a59f267346ea31F984'})
    .onEventPoolCreated(
        async function (event: PoolCreatedEvent, ctx: UniswapFactoryContext) {
            ctx.meter.Counter('pool_num').add(1)

            if (checkTokensWatching(event.args.token0, event.args.token1)) {
                ctx.meter.Counter('watching_pool_num').add(1)
                poolTemplate.bind({address: event.args.pool, startBlock: ctx.blockNumber})
            }
        }
    )

UniswapProcessor.bind({address: '0x5777d92f208679db4b9778590fa3cab3ac9e2168'})
    .onEventSwap(
        async function (event: SwapEvent, ctx: UniswapContext) {
            ctx.meter.Gauge('dai_usdc_amount0').record(Math.abs(Number(event.args.amount0.toBigInt())))
            ctx.meter.Gauge('dai_usdc_amount1').record(Math.abs(Number(event.args.amount1.toBigInt())))
        }
    )


// X2y2Processor.bind({address: '0xB329e39Ebefd16f40d38f07643652cE17Ca5Bac1', startBlock: 14211735}).onBlock(
//     async function (_, ctx: X2y2Context) {
//         const phase = (await ctx.contract.currentPhase()).toString()
//         const reward = Number((await ctx.contract.rewardPerBlockForStaking()).toBigInt() / 10n ** 18n)
//         ctx.meter.Gauge('reward_per_block').record(reward, {phase})
//     }
// )
//
// export const filter = ERC20Processor.filters.Transfer(
//     '0x0000000000000000000000000000000000000000',
//     '0xb329e39ebefd16f40d38f07643652ce17ca5bac1'
// )
//
// ERC20Processor.bind({address: '0x1e4ede388cbc9f4b5c79681b7f94d36a11abebc9'}).onEventTransfer(
//     handleTransfer,
//     filter // filter is an optional parameter
// )
//
// async function handleTransfer(event: TransferEvent, ctx: ERC20Context) {
//     const val = Number(event.args.value.toBigInt() / 10n ** 18n)
//     ctx.meter.Counter('token').add(val)
// }
//
