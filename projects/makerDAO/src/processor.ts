import { Counter, Gauge } from '@sentio/sdk'
import { ERC20Processor } from '@sentio/sdk/eth/builtin'
import { VatProcessor } from './types/eth/vat.js'
VatProcessor.bind({ address: "0x35d1b3f3d7966a1dfe207aa4514c12a259a0492b" })
  .onCallFrob(async (call, ctx) => {
    ctx.meter.Counter("frobCall").add(1)

    const hash = call.transactionHash
    const tx = (await ctx.contract.provider.getTransaction(hash))!
    const from = tx.from

    const i = call.args.i
    const u = call.args.u
    const v = call.args.v
    const w = call.args.w
    const dink = Number(call.args.dink)
    const dart = Number(call.args.dart)

    ctx.eventLogger.emit("FrobCall", {
      distinctId: from,
      i,
      u,
      v,
      w,
      dink,
      dart
    })
  })
  .onCallRely(async (call, ctx) => {
    ctx.meter.Counter("relyCall").add(1)

    const hash = call.transactionHash
    const tx = (await ctx.contract.provider.getTransaction(hash))!
    const from = tx.from
    //market contract address usr, with try_ilk().value, try_gem().value functions
    const usr = call.args.usr

    ctx.eventLogger.emit("RelyCall", {
      distinctId: from,
      usr
    })
  })

