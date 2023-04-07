// import { pool } from './types/sui/swap.js'
//
// pool.bind().onEventLiquidityEvent((evt, ctx) => {
//   const amount = evt.data_decoded.x_amount
//   ctx.meter.Counter('amount').add(amount)
// })

import { sui_system, validator } from '@sentio/sdk/sui/builtin/0x3'
import { SuiNetwork, SuiDynamicFieldObjectsProcessor } from '@sentio/sdk/sui'
import RequestAddStakePayload = sui_system.RequestAddStakePayload
import { dynamic_field } from "@sentio/sdk/sui/builtin/0x2";
import {
  single_collateral
} from "./types/sui/testnet/0xebaa2ad3eacc230f309cd933958cc52684df0a41ae7ac214d186b80f830867d2.js";
import { sui } from "./types/sui/testnet/0xd175cff04f1d49574efb6f138bc3b9b7313915a57b5ca04141fb1cb4f66984b2.js";

validator.bind({ network: SuiNetwork.TEST_NET }).onEventStakingRequestEvent((evt, ctx) => {
  const amount_original = BigInt(evt.parsedJson?.amount)
  const amount = evt.data_decoded.amount
  // expect(amount_original).eq(amount)
  ctx.meter.Counter('amount').add(amount, { pool: evt.data_decoded.pool_id })
})

sui_system.bind({ network: SuiNetwork.TEST_NET }).onEntryRequestAddStake((call: RequestAddStakePayload, ctx) => {
  ctx.meter.Gauge('tmp').record(1, { coin: call.arguments_decoded[2] || '' })
})

SuiDynamicFieldObjectsProcessor.bind({
  network: SuiNetwork.TEST_NET,
  objectId: '0xdcb1f0c4d31528a67f89303e3a99e15b9e21c7e22b4123a0e43e90b3fae5ea1e',
}).onTimeInterval((fields: dynamic_field.Field<bigint, single_collateral.PortfolioVault<sui.SUI, sui.SUI, sui.SUI>>[], ctx) => {
  ctx.meter.Gauge('num_portfolio_vault').record(fields.length)
  fields.forEach((vault) => {
    ctx.meter.Gauge('deposit_vault_active_sub_vault_balance').record(
      vault.value.deposit_vault?.active_sub_vault?.balance.value, { name: vault.name.toString() })
  });
})
