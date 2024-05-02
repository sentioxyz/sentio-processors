import { AptosContext } from '@sentio/sdk/aptos'
import { farmValue } from './metrics.js'
import { scripts } from './types/aptos/harvest.js'
import type { EntryFunctionPayloadResponse } from '@aptos-labs/ts-sdk'

const startVersion = 70250898

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
  .onEntryStake(handleStake)
  .onEntryStakeAndBoost(handleStake)
  .onEntryUnstake(handleUnstake)
  .onEntryUnstakeAndRemoveBoost(handleUnstake)
  .onTransaction((tx, ctx) => {
    if (!('function' in tx.payload)) {
      return
    }
    const functionName = tx.payload.function.split('::')[2]
    if (!functionList.includes(functionName)) {
      return
    }

    const pair = getLPPair(tx.payload.type_arguments[0])
    if (!pair) {
      console.log('tx without LP pair', tx.payload.type_arguments, tx.hash)
    }
    console.log({ functionName })
    ctx.eventLogger.emit('farm_tx', {
      distinctId: tx.sender,
      pool: tx.payload.arguments[0],
      pair,
      function: functionName,
    })
  })
