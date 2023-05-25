import { validator } from "./types/sui/validator.js"
import { SuiChainId } from "@sentio/sdk"

export const VALIDATOR_ADDRESS = "0x3"

validator.bind({
  address: VALIDATOR_ADDRESS,
  network: SuiChainId.SUI_MAINNET
})
  .onEventStakingRequestEvent(async (event, ctx) => {
    const pool_id = event.data_decoded.pool_id
    const validator_address = event.data_decoded.validator_address
    const staker_address = event.data_decoded.staker_address
    const epoch = Number(event.data_decoded.epoch)
    const amount = Number(event.data_decoded.amount)

    ctx.meter.Counter("staking_counter").add(amount, { validator: validator_address })
    ctx.meter.Gauge("staking_gauge").record(amount, { validator: validator_address })

    ctx.eventLogger.emit("StakingRequest", {
      distinctId: staker_address,
      pool_id,
      validator_address,
      epoch,
      amount
    })
  })
  .onEventUnstakingRequestEvent(async (event, ctx) => {
    const pool_id = event.data_decoded.pool_id
    const validator_address = event.data_decoded.validator_address
    const staker_address = event.data_decoded.staker_address
    const stake_activation_epoch = Number(event.data_decoded.stake_activation_epoch)
    const unstaking_epoch = Number(event.data_decoded.unstaking_epoch)
    const principal_amount = Number(event.data_decoded.principal_amount)
    const reward_amount = Number(event.data_decoded.reward_amount)

    ctx.meter.Counter("staking_counter").sub(principal_amount, { validator: validator_address })
    ctx.meter.Gauge("unstaking_gauge").record(principal_amount, { validator: validator_address })

    ctx.meter.Counter("reward_counter").add(reward_amount, { validator: validator_address })
    ctx.meter.Gauge("reward_counter").record(reward_amount, { validator: validator_address })

    ctx.eventLogger.emit("UnstakingRequest", {
      distinctId: staker_address,
      pool_id,
      validator_address,
      stake_activation_epoch,
      unstaking_epoch,
      principal_amount,
      reward_amount
    })
  })