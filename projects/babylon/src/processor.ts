import { BTCProcessor, Transaction } from '@sentio/sdk/btc'
import { ChainId } from '@sentio/chain'

BTCProcessor.bind({
  chainId: ChainId.BTC_MAINNET,
  startBlock: 857589n,
}).onTransaction((tx, ctx) => {
  const from = tx.vin?.[0]?.pre_vout?.scriptPubKey?.address
  const to = tx.vout?.[0]?.scriptPubKey?.address
  // handle staking transactions
  const babylonInfo = extractBabylonInfo(tx)
  if (babylonInfo) {
    const amount = tx.vout[0].value
    const staker = babylonInfo.stakerPubkey
    const provider = babylonInfo.providerPubkey
    const stakingTime = babylonInfo.stakingTime
 
    ctx.eventLogger.emit('staking', {
      distinctId: tx.txid,
      amount,
      staker,
      provider,
      from,
      to,
      stakingTime,
      message: `staking ${amount} from ${staker} to ${provider}`
    })
  }
}, {
  filter: [{ blockheight: { gte: 857589 } }],
  outputFilter: {
    n: 1,
    script_asm: {
      prefix: 'OP_RETURN 62626e31',
      length: 152
    }
  }
}).onTransaction((tx, ctx) => {
   
  // handle unbonding transactions
  for (const vin of tx.vin ?? []) {
    const preTx = vin.pre_transaction
    if (preTx) {
      const babylonInfo = extractBabylonInfo(preTx)
      console.log('babylonInfo', babylonInfo)
      if (babylonInfo) {
        const staker = babylonInfo.stakerPubkey
        const provider = babylonInfo.providerPubkey
        const stakingTime = babylonInfo.stakingTime

        const amount = tx.vout[0]?.value
        const to = tx.vout[0].scriptPubKey.address
        const from = vin?.pre_vout?.scriptPubKey.address
        
        ctx.eventLogger.emit('staking', {
          distinctId: tx.txid,
          amount: -amount,
          staker,
          provider,
          from,
          to,
          stakingTime,
          message: `unbonding ${amount} from ${provider} to ${staker}`
        })
      }
    }
  }
}, {
  filter: [{ blockheight: { gte: 857589 } }],
  inputFilter: {
    preTransaction: { // the outbonding transaction's input should be the staking transaction
      outputFilter: {
        script_asm: {
          prefix: 'OP_RETURN 62626e31',
          length: 152
        }
      }
    }
  }
})


function extractBabylonInfo(tx: Transaction) {
  for (const vout of tx.vout ?? []) {
    const script = vout.scriptPubKey.hex as string
    if (script.startsWith('6a4762626e31') && script.length == 146) {
      const version = script.substring(12, 12 + 2)
      const stakerPubkey = script.substring(14, 14 + 64)
      const providerPubkey = script.substring(78, 78 + 64)
      const stakingTimeHex = script.substring(142, 142 + 4)
      const stakingTime = parseInt(stakingTimeHex, 16)
      if (version == '00') {
        return {
          stakerPubkey,
          providerPubkey,
          stakingTime
        }
      }
    }
  }

  return undefined
}

