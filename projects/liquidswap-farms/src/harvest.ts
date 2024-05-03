import { Counter } from '@sentio/sdk'
import { AptosContext } from '@sentio/sdk/aptos'
import { scripts } from './types/aptos/harvest.js'
import { accountTypeString } from '@sentio/sdk/move'

const startVersion = 70250898

const farmValue = Counter.register('farm_value')

/**
 * LP coins type for pairs X and Y is represented as LP<X, Y, Curve>.
 * 0xaa::lp_coin::LP<0xbb::amapt_token::AmnisApt, 0x1::aptos_coin::AptosCoin, 0xcc::curves::Stable>
 */
function getLPPair(lpCoin: string): string {
  const matches = lpCoin.match(/[^:]+::[^:]+::LP<(.+)>/)
  if (!matches) {
    return ''
  }

  const [coinX, coinY] = matches[1].split(',')
  const symbolX = coinX.trim().split('::')[2]
  const symbolY = coinY.trim().split('::')[2]
  return `${symbolX}-${symbolY}`
}

function handleStake(call: scripts.StakePayload | scripts.StakeAndBoostPayload, ctx: AptosContext) {
  const pair = getLPPair(call.type_arguments[0])
  farmValue.add(ctx, call.arguments_decoded[1], {
    pair,
    pool: call.arguments_decoded[0],
  })
}

function handleUnstake(call: scripts.UnstakePayload | scripts.UnstakeAndRemoveBoostPayload, ctx: AptosContext) {
  const pair = getLPPair(call.type_arguments[0])
  farmValue.sub(ctx, call.arguments_decoded[1], {
    pair,
    pool: call.arguments_decoded[0],
  })
}

const functionList = [
  'stake',
  'stake_and_boost',
  'unstake',
  'unstake_and_remove_boost',
  'harvest',
  'boost',
  'remove_boost',
  'withdraw_reward_to_treasury',
]

scripts
  .bind({ startVersion })
  // .onEntryStake(handleStake)
  // .onEntryStakeAndBoost(handleStake)
  // .onEntryUnstake(handleUnstake)
  // .onEntryUnstakeAndRemoveBoost(handleUnstake)
  .onTransaction(
    (tx, ctx) => {
      if (!('function' in tx.payload)) {
        return
      }
      const functionName = tx.payload.function.split('::')[2]
      if (!functionList.includes(functionName)) {
        return
      }

      const pool = accountTypeString(tx.payload.arguments[0])
      const pair = getLPPair(tx.payload.type_arguments[0])
      const event = tx.events.find((evt) => ['StakeEvent', 'UnstakeEvent'].includes(evt.type.split('::')[2]))
      let amount
      if (event) {
        amount = event.data.amount
        if (event.type.endsWith('StakeEvent')) {
          farmValue.add(ctx, amount, { pair, pool })
        } else {
          farmValue.sub(ctx, amount, { pair, pool })
        }
      }

      ctx.eventLogger.emit('farm_tx', {
        distinctId: tx.sender,
        pool,
        amount,
        pair,
        function: functionName,
      })
    },
    false,
    { allEvents: true },
  )
