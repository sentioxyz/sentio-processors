import {SwapEvent, UniswapContext, UniswapProcessor} from './types/uniswap'
import {PoolCreatedEvent, UniswapFactoryContext, UniswapFactoryProcessor} from "./types/uniswapfactory";


const TokenUSDC = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48'
const TokenDAI = '0x6B175474E89094C44Da98b954EedeAC495271d0F'
const TokenWatching = [TokenUSDC, TokenDAI]

function checkTokensWatching(token0: string, token1: string): boolean {
    return TokenWatching.indexOf(token0) >= 0 && TokenWatching.indexOf(token1) >= 0
}

UniswapFactoryProcessor.bind({address: '0x1F98431c8aD98523631AE4a59f267346ea31F984'})
    .onEventPoolCreated(
        async function (event: PoolCreatedEvent, ctx: UniswapFactoryContext) {
            ctx.meter.Counter('pool_num').add(1)

            if (!checkTokensWatching(event.args.token0, event.args.token1)) {
                return;
            }

            ctx.meter.Counter('watching_pool_num').add(1)

            const namePrefix = event.args.pool;
            UniswapProcessor.bind({address: event.args.pool})
                .onEventSwap(
                    async function (event: SwapEvent, ctx: UniswapContext) {
                        const name = namePrefix + "_amount0"
                        ctx.meter.Gauge(name).record(Math.abs(Number(event.args.amount0.toBigInt())))
                    }
                )
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
