import { BorrowEvent, FlashLoanEvent, PoolContext, PoolProcessor, RepayEvent, SupplyEvent } from './types/eth/pool.js';

export const volOptions = {
    sparse: true,
    aggregationConfig: {
        intervalInMinutes: [60],
    }
}

async function onEvent(event: BorrowEvent | RepayEvent | SupplyEvent, ctx: PoolContext) {
    const args = event.args.toObject()
    ctx.eventLogger.emit(event.name, {
        distinctId: event.args.user,
        ...args
    })
}

async function onFlashloan(event: FlashLoanEvent | RepayEvent, ctx: PoolContext) {
    const args = event.args.toObject()
    ctx.eventLogger.emit(event.name, {
        ...args
    })
}

PoolProcessor.bind({address: "0xc13e21b648a5ee794902342038ff3adab66be987"})
.onEventRepay(onEvent)
.onEventBorrow(onEvent)
.onEventFlashLoan(onFlashloan)
.onEventSupply(onEvent)