import { validator, validator_set } from '@sentio/sdk/iota/builtin/0x3'

import { IotaNetwork } from '@sentio/sdk/iota'

/**
 * IOTA Validator Metrics Processor
 * 
 * This processor tracks validator staking activities, rewards, and performance metrics.
 * It captures:
 * - Staking/unstaking events from delegators
 * - Validator epoch rewards and performance scores
 * - Real-time exchange rates for calculating delegator returns
 */

// Track when delegators stake tokens with a validator
validator.bind({ network: IotaNetwork.MAIN_NET }).onEventStakingRequestEvent(
  async (evt, ctx) => {
    // Extract staking details
    const validator_address = evt.data_decoded.validator_address
    const delegator_address = evt.data_decoded.staker_address
    const amount = evt.data_decoded.amount.scaleDown(9) // Convert from 9 decimals to human-readable

    // Log staking event for tracking delegator positions
    ctx.eventLogger.emit('stake_action', {
      action: 'stake',
      amount, // Positive amount for staking
      pool: evt.data_decoded.pool_id,
      validator: validator_address,
      delegator: delegator_address
    })
  },
  { allEvents: true }
)

// Track when delegators unstake tokens from a validator
validator.bind({ network: IotaNetwork.MAIN_NET }).onEventUnstakingRequestEvent(
  async (evt, ctx) => {
    // Extract unstaking details
    const validator_address = evt.data_decoded.validator_address
    const delegator_address = evt.data_decoded.staker_address
    const principal = evt.data_decoded.principal_amount.scaleDown(9) // Original staked amount
    const reward = evt.data_decoded.reward_amount.scaleDown(9) // Rewards earned
    const total_amount = principal.plus(reward) // Total withdrawal

    // Log unstaking event with negative principal to calculate net positions
    ctx.eventLogger.emit('stake_action', {
      action: 'unstake',
      amount: -principal,  // Negative principal for net position calculation
      reward: reward, // Rewards earned (always positive)
      total_withdrawn: total_amount, // Total amount returned to delegator,
      pool: evt.data_decoded.pool_id,
      validator: validator_address,
      delegator: delegator_address,
      stake_activation_epoch: evt.data_decoded.stake_activation_epoch.toString(), // When stake was activated
      unstaking_epoch: evt.data_decoded.unstaking_epoch.toString() // When unstaking was requested
    })
  },
  { allEvents: true }
)

/**
 * Track validator performance metrics at each epoch
 * This event fires at the end of each epoch (approximately every 24 hours)
 * and provides comprehensive validator statistics including:
 * - Total stake and voting power
 * - Rewards earned during the epoch
 * - Pool token exchange rate (for calculating delegator returns)
 * - Performance score (tallying rule global score)
 */
validator_set.bind({ network: IotaNetwork.MAIN_NET }).onEventValidatorEpochInfoEventV1(
  async (evt, ctx) => {
    try {
      // Extract validator performance metrics
      const validator_address = evt.data_decoded.validator_address
      const epoch = evt.data_decoded.epoch
      const stake = evt.data_decoded.stake.scaleDown(9) // Total stake with validator
      const voting_power = evt.data_decoded.voting_power // Consensus voting weight
      const commission_rate = evt.data_decoded.commission_rate // Fee charged to delegators (basis points)
      const pool_staking_reward = evt.data_decoded.pool_staking_reward.scaleDown(9) // Rewards earned this epoch
      const pool_token_exchange_rate = evt.data_decoded.pool_token_exchange_rate // Exchange rate for pool tokens
      const reference_gas_survey_quote = evt.data_decoded.reference_gas_survey_quote // Gas price reference
      const tallying_rule_global_score = evt.data_decoded.tallying_rule_global_score // Validator performance score

      // Calculate exchange rate for pool tokens to IOTA
      // This rate increases over time as rewards accumulate
      const exchange_rate = Number((pool_token_exchange_rate as any).numerator || 1) / Number((pool_token_exchange_rate as any).denominator || 1)

      // Record metrics for dashboard visualization
      ctx.meter.Gauge('validator_stake').record(stake, { validator: validator_address }) // Total staked amount
      ctx.meter.Gauge('validator_voting_power').record(voting_power, { validator: validator_address }) // Network influence
      ctx.meter.Gauge('validator_epoch_rewards').record(pool_staking_reward, { validator: validator_address }) // Epoch rewards
      ctx.meter.Gauge('validator_commission').record(commission_rate, { validator: validator_address }) // Commission rate
      ctx.meter.Gauge('validator_exchange_rate').record(exchange_rate, { validator: validator_address }) // Pool token value
      ctx.meter.Gauge('validator_performance_score').record(tallying_rule_global_score, { validator: validator_address }) // Performance metric

      // Log comprehensive epoch snapshot for historical analysis
      ctx.eventLogger.emit('validator_epoch_info', {
        validator: validator_address,
        epoch: epoch.toString(),
        stake,
        voting_power: voting_power.toString(),
        commission_rate,
        pool_staking_reward,
        exchange_rate,
        reference_gas_survey_quote: reference_gas_survey_quote.toString(),
        tallying_rule_global_score: tallying_rule_global_score.toString()
      })
    } catch (error) {
      console.error('Error processing validator epoch info:', error)
    }
  },
  { allEvents: true }
)
