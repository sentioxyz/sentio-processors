import { ERC20Context, ERC20Processor } from './types/erc20_processor'
import { X2y2Context, X2y2Processor } from './types/x2y2_processor'

import { TransferEvent } from './types/ERC20'

X2y2Processor.bind('0xB329e39Ebefd16f40d38f07643652cE17Ca5Bac1')
    .startBlock(14201940)
    .onBlock(async function (_, ctx: X2y2Context) {
      const phase = (await ctx.contract.currentPhase()).toString()
      const reward = await ctx.contract.rewardPerBlockForStaking()

      ctx.meter.Histogram('reward_per_block').record(reward, { phase })
    })

const filter = ERC20Processor.filters.Transfer(
    '0x0000000000000000000000000000000000000000',
    '0xb329e39ebefd16f40d38f07643652ce17ca5bac1'
)

ERC20Processor.bind('0x1e4ede388cbc9f4b5c79681b7f94d36a11abebc9')
    .startBlock(14201940)
    .onTransfer(handleTransfer, filter)

async function handleTransfer(event: TransferEvent, ctx: ERC20Context) {
  const val = Number(event.args.value.toBigInt()) / Math.pow(10, 18)
  ctx.meter.Counter('token').add(val)
}
