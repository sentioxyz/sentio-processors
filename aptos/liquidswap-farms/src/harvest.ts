import { Counter } from '@sentio/sdk'
import { AptosContext } from '@sentio/sdk/aptos'
import { scripts } from './types/aptos/harvest.js'
import { accountTypeString } from '@sentio/sdk/move'
import { getPair, startVersion } from './utils.js'

const farmValue = Counter.register('farm_value')
const farmVolume = Counter.register('farm_volume')

/**
 * LP coins type for pairs X and Y is represented as LP<X, Y, Curve>.
 * 0xaa::lp_coin::LP<0xbb::amapt_token::AmnisApt, 0x1::aptos_coin::AptosCoin, 0xcc::curves::Stable>
 */
async function getLPPair(lpCoin: string) {
  const matches = lpCoin.match(/[^:]+::[^:]+::LP<(.+)>/)
  if (!matches) {
    return ''
  }

  const [coinX, coinY, curve] = matches[1].split(',').map((x) => x.trim())
  return getPair(coinX, coinY, curve)
}

async function handleStake(call: scripts.StakePayload | scripts.StakeAndBoostPayload, ctx: AptosContext) {
  const pair = await getLPPair(call.type_arguments[0])
  farmValue.add(ctx, call.arguments_decoded[1], {
    pair,
    pool: call.arguments_decoded[0],
  })
}

async function handleUnstake(call: scripts.UnstakePayload | scripts.UnstakeAndRemoveBoostPayload, ctx: AptosContext) {
  const pair = await getLPPair(call.type_arguments[0])
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
    async (tx, ctx) => {
      if (!('function' in tx.payload)) {
        return
      }
      const functionName = tx.payload.function.split('::')[2]
      if (!functionList.includes(functionName)) {
        return
      }

      const pool = accountTypeString(tx.payload.arguments[0])
      const pair = await getLPPair(tx.payload.type_arguments[0])
      const event = tx.events.find((evt) => ['StakeEvent', 'UnstakeEvent'].includes(evt.type.split('::')[2]))
      let amount
      if (event) {
        amount = event.data.amount
        if (event.type.endsWith('StakeEvent')) {
          farmValue.add(ctx, amount, { pair, pool })
        } else {
          farmValue.sub(ctx, amount, { pair, pool })
        }
        farmVolume.add(ctx, amount, { pair, pool })
      }

      ctx.eventLogger.emit('farm_tx', {
        distinctId: tx.sender,
        pool,
        amount,
        pair,
        function: functionName,
      })
    },
    {},
    { allEvents: true },
  )
