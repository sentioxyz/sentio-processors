import { validator } from "@sentio/sdk/sui/builtin/0x3"
import { SuiNetwork, SuiWrappedObjectProcessor } from "@sentio/sdk/sui"
export const VALIDATOR_ADDRESS = "0x3"
import { validator_set } from "@sentio/sdk/sui/builtin/0x3"
import { GENESIS_STAKING } from './genesis_staking.js'
const GENESIS_STAKERS = [
  "0x341fa71e4e58d63668034125c3152f935b00b0bb5c68069045d8c646d017fae1",
  "0x7d819ea06c8dea160dce6a7df62ba3413762f05377087315441f57239198d2ac",
  "0x571bad7fd728af0fb5589888e8124214467ae3ba7947cff39dea9d0638e5979a",
  "0x36414038336c8ca5b95ba69d0a7236ce8cffa8608e7c823946a1bca9222c81ce",
  "0x00e52cde281d988be82f47d14e191b502582ad91b1559f6808775146cb5c7572"
]

validator.bind({
  address: VALIDATOR_ADDRESS,
  network: SuiNetwork.MAIN_NET,
  // startCheckpoint: 1500000n
})
  .onEventStakingRequestEvent(async (event, ctx) => {
    const pool_id = event.data_decoded.pool_id
    const validator_address = event.data_decoded.validator_address
    const staker_address = event.data_decoded.staker_address
    const epoch = Number(event.data_decoded.epoch)
    const amount = Number(event.data_decoded.amount) / Math.pow(10, 9)

    ctx.meter.Counter("staking_counter").add(amount, { validator: validator_address, pool: pool_id, genesis_staker: "false" })
    ctx.meter.Gauge("staking_gauge").record(amount, { validator: validator_address, pool: pool_id, genesis_staker: "false" })

    ctx.eventLogger.emit("StakingRequest", {
      distinctId: staker_address,
      pool_id,
      validator_address,
      epoch,
      amount,
      genesis_staker: (GENESIS_STAKERS.includes(staker_address.toLowerCase())) ? true : false
    })
  })
  .onEventUnstakingRequestEvent(async (event, ctx) => {
    const pool_id = event.data_decoded.pool_id
    const validator_address = event.data_decoded.validator_address
    const staker_address = event.data_decoded.staker_address
    const stake_activation_epoch = Number(event.data_decoded.stake_activation_epoch)
    const unstaking_epoch = Number(event.data_decoded.unstaking_epoch)
    const principal_amount = Number(event.data_decoded.principal_amount) / Math.pow(10, 9)
    const reward_amount = Number(event.data_decoded.reward_amount) / Math.pow(10, 9)

    ctx.meter.Counter("staking_counter").sub(principal_amount, { validator: validator_address, pool: pool_id, genesis_staker: "false" })
    ctx.meter.Gauge("unstaking_gauge").record(principal_amount, { validator: validator_address, pool: pool_id, genesis_staker: "false" })

    ctx.meter.Counter("reward_counter").add(reward_amount, { validator: validator_address })
    ctx.meter.Gauge("reward_gauge").record(reward_amount, { validator: validator_address })

    ctx.eventLogger.emit("UnstakingRequest", {
      distinctId: staker_address,
      pool_id,
      validator_address,
      stake_activation_epoch,
      unstaking_epoch,
      principal_amount,
      reward_amount,
      genesis_staker: (GENESIS_STAKERS.includes(staker_address.toLowerCase())) ? true : false
    })

    //add genesis events for 1 time
    if (event.id.txDigest == "C1FDTh7cJDe3JsHS4VxzntcQEyAJHWnaxgMqHehB79kU") {
      GENESIS_STAKING.forEach(row => {
        ctx.eventLogger.emit("StakingAtGenesis", {
          distinctId: row[0].toString(),
          object_id: row[1].toString(),
          pool_id: row[2].toString(),
          amount: Number(row[3]),
          genesis_staker: true
        })
        ctx.meter.Counter("staking_counter").add(Number(row[3]), { pool_id: row[1].toString(), genesis_staker: "true" })
      })
    }
  })


validator_set.bind()
  .onEventValidatorEpochInfoEventV2(async (event, ctx) => {
    ctx.eventLogger.emit("ValidatorEpochInfoEventV2", {
      distinctId: event.data_decoded.validator_address,
      epoch: event.data_decoded.epoch,
      validator_address: event.data_decoded.validator_address,
      reference_gas_survey_quote: event.data_decoded.reference_gas_survey_quote,
      stake: Number(event.data_decoded.stake) / Math.pow(10, 9),
      voting_power: event.data_decoded.voting_power,
      commission_rate: event.data_decoded.commission_rate,
      pool_staking_reward: Number(event.data_decoded.pool_staking_reward) / Math.pow(10, 9),
      storage_fund_staking_reward: Number(event.data_decoded.storage_fund_staking_reward) / Math.pow(10, 9),
      pool_token_exchange_rate: event.data_decoded.pool_token_exchange_rate,
      // tallying_rule_reporters: event.data_decoded.tallying_rule_reporters,
      tallying_rule_global_score: event.data_decoded.tallying_rule_global_score
    })
  })
  .onEventValidatorJoinEvent(async (event, ctx) => {
    ctx.eventLogger.emit("ValidatorJoinEvent", {
      distinctId: event.data_decoded.validator_address,
      validator_address: event.data_decoded.validator_address,
      staking_pool_id: event.data_decoded.staking_pool_id,
      epoch: event.data_decoded.epoch
    })
  })
  .onEventValidatorLeaveEvent(async (event, ctx) => {
    ctx.eventLogger.emit("ValidatorJoinEvent", {
      distinctId: event.data_decoded.validator_address,
      validator_address: event.data_decoded.validator_address,
      staking_pool_id: event.data_decoded.staking_pool_id,
      epoch: event.data_decoded.epoch,
      is_voluntary: event.data_decoded.is_voluntary
    })
  })
  .onEventValidatorEpochInfoEvent(async (event, ctx) => {
    ctx.eventLogger.emit("ValidatorEpochInfoEventV2", {
      distinctId: event.data_decoded.validator_address,
      epoch: event.data_decoded.epoch,
      validator_address: event.data_decoded.validator_address,
      reference_gas_survey_quote: event.data_decoded.reference_gas_survey_quote,
      stake: Number(event.data_decoded.stake) / Math.pow(10, 9),
      // voting_power: event.data_decoded.voting_power,
      commission_rate: event.data_decoded.commission_rate,
      pool_staking_reward: Number(event.data_decoded.pool_staking_reward) / Math.pow(10, 9),
      storage_fund_staking_reward: Number(event.data_decoded.storage_fund_staking_reward) / Math.pow(10, 9),
      pool_token_exchange_rate: event.data_decoded.pool_token_exchange_rate,
      // tallying_rule_reporters: event.data_decoded.tallying_rule_reporters,
      tallying_rule_global_score: event.data_decoded.tallying_rule_global_score
    })
  })
