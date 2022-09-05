import {VAULTS_THRESHOLD_MAP} from './constant'
import { WorkEvent } from './types/vault'
import { VaultProcessor, VaultContext, getVaultContract } from './types/vault'

const workHandler = async function(event: WorkEvent, ctx: VaultContext) {
  const amount = event.args.loan
  const token = event.address
  ctx.meter.Gauge('loan_amount').record(amount, {token: VAULTS_THRESHOLD_MAP.get(token)!})
}

for(let address of VAULTS_THRESHOLD_MAP.keys()) {
  VaultProcessor.bind({address: address, network: 56}).onWork(workHandler)
}

