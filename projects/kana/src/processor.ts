import { KanalabsAggregatorV1, KanalabsBridgeV1, KanalabsRouterV1, KanalabsStakingV1 } from './types/aptos/KanalabsAggregatorV1'
import { KanaBridge, KanaBridgeV1, aggregatorV1, AggregatorTestV1, KanaAggregatorV1, kana_aggregatorv1 } from './types/aptos/KanalabsV0'

KanalabsAggregatorV1.bind()
  .onEntrySwap((call, ctx) => {
    ctx.meter.Counter('swap_token_entry').add(1)
    console.log('test0')
  })
  .onEntryAdvancedRoute((call, ctx) => {
    ctx.meter.Counter('advance_entry').add(1)
    console.log('test1')
  })
  .onEntryDirectRoute((call, ctx) => {
    ctx.meter.Counter('direct_entry').add(1)
    console.log('test2')
  })
  .onEventSwapCount((call, ctx) => {
    ctx.meter.Counter('swap_count_event').add(1)
    console.log('test3')
  })
  .onEventSwapStepEvent((call, ctx) => {
    ctx.meter.Counter('swap_step_event').add(1)
    console.log('test4')
  })
  .onEntryInitPlatformProfile((call, ctx) => {
    ctx.meter.Counter('init').add(1)
    console.log('test_init')
  })

KanalabsStakingV1.bind()
  .onEntryStake((call, ctx) => {
    ctx.meter.Counter('stake_entry').add(1)
    console.log('test5')
  })
  .onEventStakeCount((call, ctx) => {
    ctx.meter.Counter('stake_count_event').add(1)
    console.log('test6')
  })

KanalabsRouterV1.bind()
  .onEntryRoute((call, ctx) => {
    ctx.meter.Counter('route_entry').add(1)
    console.log('test7')
  })
  .onEventRouteCount((call, ctx) => {
    ctx.meter.Counter('route_count_event').add(1)
    console.log('test8')
  })


KanalabsBridgeV1.bind()
  .onEntryClaimTokens((call, ctx) => {
    ctx.meter.Counter('claim_entry').add(1)
    console.log('test9')
  })
  .onEntryTransferTokens((call, ctx) => {
    ctx.meter.Counter('transfer_entry').add(1)
    console.log('test10')
  })
  .onEventClaimCount((call, ctx) => {
    ctx.meter.Counter('claim_event').add(1)
    console.log('test11')
  })
  .onEventTransferCount((call, ctx) => {
    ctx.meter.Counter('transfer_event').add(1)
    console.log('test12')
  })
  .onEntryUpdatePlatformFeeAmount((call, ctx) => {
    ctx.meter.Counter('update_fee_amt').add(1)
    console.log('test_update_fee_amt')
  })
  .onEntryUpdatePlatformFeeCollect((call, ctx) => {
    ctx.meter.Counter('update_fee_collect').add(1)
    console.log('test_update_fee_collect')
  })
  .onEntryUpdatePlatformFeeReceiver((call, ctx) => {
    ctx.meter.Counter('update_fee_receive').add(1)
    console.log('test_update_fee_receive')
  })


kana_aggregatorv1.bind()
  .onEntryAdvancedRoute((call, ctx) => {
    ctx.meter.Counter('advance_route_on_entry').add(1)
  })
  .onEntryCreateAuxSigner((call, ctx) => {
    ctx.meter.Counter('create_aux_on_entry').add(1)
  })
  .onEntryDirectRoute((call, ctx) => {
    ctx.meter.Counter('direct_route_on_entry').add(1)
  })
  .onEntryIntermediateRoute((call, ctx) => {
    ctx.meter.Counter('intermediate_route_on_entry').add(1)
  })
  .onEntrySetPlatformProfile((call, ctx) => {
    ctx.meter.Counter('set_platform_profile_on_entry').add(1)
  })
  .onEntrySetReferralProfile((call, ctx) => {
    ctx.meter.Counter('set_referral_profile_on_entry').add(1)
  })
  .onEntryUpdatePlatformFeeAmount((call, ctx) => {
    ctx.meter.Counter('update_platform_fee_on_entry').add(1)
  })
  .onEntryUpdatePlatformFeeReceiver((call, ctx) => {
    ctx.meter.Counter('update_fee_receiver_on_entry').add(1)
  })
  .onEventSwapCount((call, ctx) => {
    ctx.meter.Counter('swap_count_on_event').add(1)
  })
  .onEventSwapStepEvent((call, ctx) => {
    ctx.meter.Counter('swap_step_on_event').add(1)
  })