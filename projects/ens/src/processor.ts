import { ERC20Context, ERC20Processor, TransferEvent } from '@sentio/sdk/lib/builtin/erc20'
import { OldRegistarContext, OldRegistarProcessor, HashRegisteredEvent } from './types/oldregistar'
import { Counter } from '@sentio/sdk/lib/core/meter'

const registered = new Counter("registered", { sparse: true })

const OLD_REGISTAR = "0x6090a6e47849629b7245dfa1ca21d94cd15878ef"

async function hashRegisteredHandler(event: HashRegisteredEvent, ctx: OldRegistarContext) {
  const owner = event.args.owner
  registered.add(ctx, 1, {owner: owner})
  // ctx.meter.Counter("registered").add(1, {owner: owner})
  ctx.meter.Counter("total_registered").add(1)
}


OldRegistarProcessor.bind({address: OLD_REGISTAR})
  .onEventHashRegistered(hashRegisteredHandler)