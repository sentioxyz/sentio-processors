// import { pool } from './types/sui/swap.js'
//
// pool.bind().onEventLiquidityEvent((evt, ctx) => {
//   const amount = evt.data_decoded.x_amount
//   ctx.meter.Counter('amount').add(amount)
// })

import { sui_system, validator } from '@sentio/sdk/sui/builtin/0x3'
import { SuiNetwork, SuiDynamicFieldObjectsProcessor, TypedSuiMoveObject } from '@sentio/sdk/sui'
import RequestAddStakePayload = sui_system.RequestAddStakePayload
import { dynamic_field } from "@sentio/sdk/sui/builtin/0x2";
import {
  single_collateral
} from "./types/sui/testnet/0xebaa2ad3eacc230f309cd933958cc52684df0a41ae7ac214d186b80f830867d2.js";
import { sui } from "./types/sui/testnet/0xd175cff04f1d49574efb6f138bc3b9b7313915a57b5ca04141fb1cb4f66984b2.js";
import { SuiMoveObject } from "@mysten/sui.js";

validator.bind({ network: SuiNetwork.TEST_NET }).onEventStakingRequestEvent((evt, ctx) => {
  const amount_original = BigInt(evt.parsedJson?.amount)
  const amount = evt.data_decoded.amount
  // expect(amount_original).eq(amount)
  if (evt.data_decoded.pool_id != "0x0c0d9dbf38d60345678c95d54705e6d491811f13120f1bc8320996e7a5244c3f"
  && evt.data_decoded.pool_id != "0x168f9da2c19f15115df7c9820f01440a3811b43c1d1391e1ef0881343e26e248") {
    ctx.meter.Counter('amount').add(amount, {pool: evt.data_decoded.pool_id})
  } else {
    ctx.meter.Counter('large_account_amount').add(amount, {pool: evt.data_decoded.pool_id})
  }
})

sui_system.bind({ network: SuiNetwork.TEST_NET }).onEntryRequestAddStake((call: RequestAddStakePayload, ctx) => {
  ctx.meter.Gauge('addStake').record(1, { addr: call.arguments_decoded[2] || '' })
  ctx.eventLogger.emit("staking_request", {
    distinctId: ctx.transaction.transaction?.data.sender,
    addr: call.arguments_decoded[2] || '',
    message: `staking_request called for ${call.arguments_decoded[2] || ''}`
  })
})

SuiDynamicFieldObjectsProcessor.bind({
  network: SuiNetwork.TEST_NET,
  objectId: '0xdcb1f0c4d31528a67f89303e3a99e15b9e21c7e22b4123a0e43e90b3fae5ea1e',
}).onTimeInterval((fields: SuiMoveObject[], ctx) => {
  ctx.meter.Gauge('num_portfolio_vault').record(fields.length)

  // not typed yet
  // fields.forEach((vault) => {
  //   ctx.meter.Gauge('deposit_vault_active_sub_vault_balance').record(
  //     vault.value.deposit_vault?.active_sub_vault?.balance.value, { name: vault.name.toString() })
  // });
})
