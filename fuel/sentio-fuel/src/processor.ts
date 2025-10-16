import { GLOBAL_CONFIG } from '@sentio/runtime'
import { FuelContext, FuelGlobalProcessor, FuelNetwork } from '@sentio/sdk/fuel'
import {
  FuelBridgeBoundContractView,
  FuelBridgeContext,
  FuelBridgeProcessor,
  FuelBridgeProcessorTemplate,
  getFuelBridgeContract
} from './types/eth/fuelbridge.js'
import { InputType, OutputType, BN, CHAIN_IDS } from 'fuels'
import { L1Balance, L2Balance } from './schema/schema.js'
import { timestamp } from '@sentio/sdk/aptos/builtin/0x1'
import { ContractContext, EthContext } from '@sentio/sdk/eth'
import { ChainId } from '@sentio/chain'

// const startBlock = 35976000n
const startBlock = 0n

const fuelBridgeAddress = '0xaeb0c00d0125a8a788956ade4f4f12ead9f65ddf'
const fuelBaseAssetId = '0xf8f8b6283d7fa5b672b530cbb84fcccb4ff8dc40f8176ef4544ddb1f1952ad07'

// GLOBAL_CONFIG.execution = {
//   sequential: true
// }

FuelBridgeProcessor.bind({ address: '0xaeb0c00d0125a8a788956ade4f4f12ead9f65ddf' }).onEventMessageSent(
  async (evt, ctx) => {
    const { recipient, amount } = evt.args
    ctx.eventLogger.emit('l1_tx', {
      recipient,
      amount
    })
    await updateL1Balance(ctx, ctx.blockNumber, fuelBaseAssetId, recipient, new BN(amount.toString()))
  }
)

const fuelBridgeContractView = new FuelBridgeBoundContractView(
  fuelBridgeAddress,
  getFuelBridgeContract(ChainId.ETHEREUM, fuelBridgeAddress)
)

FuelGlobalProcessor.bind({ chainId: FuelNetwork.MAIN_NET, startBlock }).onTransaction(async (tx, ctx) => {
  const { inputs, outputs } = tx.transaction
  const daHeight = ctx.block?.header.daHeight.toString()
  // console.log('- tx io', tx.blockNumber, tx.id, tx.status, l1Block, inputs?.length, outputs?.length)
  if (inputs) {
    await Promise.all(
      inputs.map(async (input) => {
        let distinctId, assetId, amount
        switch (input.type) {
          case InputType.Coin:
            distinctId = input.owner
            assetId = input.assetId
            amount = input.amount
            break
          case InputType.Message:
            distinctId = input.recipient
            assetId = fuelBaseAssetId
            amount = input.amount
            break
          default:
            return
        }
        if (amount.gt(0)) {
          await updateL2Balance(ctx, tx.blockNumber, daHeight, assetId, distinctId, amount.mul(-1))
        }
      })
    )
  }
  if (outputs) {
    await Promise.all(
      outputs.map(async (output) => {
        let distinctId, assetId, amount
        switch (output.type) {
          case OutputType.Coin:
            distinctId = output.to
            assetId = output.assetId
            amount = output.amount
            break
          case OutputType.Change:
            distinctId = output.to
            assetId = output.assetId
            amount = output.amount
            break
          case OutputType.Variable:
            distinctId = output.to
            assetId = fuelBaseAssetId
            amount = output.amount
            break
          default:
            return
        }
        if (amount.gt(0)) {
          await updateL2Balance(ctx, tx.blockNumber, daHeight, assetId, distinctId, amount)
        }
      })
    )
  }
})

async function updateL1Balance(
  ctx: FuelBridgeContext,
  blockHeight: number,
  assetId: string,
  distinctId: string,
  amount: BN
) {
  const id = `${assetId}-${distinctId}`
  const balance = await ctx.store.get(L1Balance, id)
  await ctx.store.upsert(
    new L1Balance({
      id,
      blockHeight: BigInt(blockHeight),
      timestamp: ctx.timestamp.toISOString(),
      assetId,
      distinctId,
      amount: (balance?.amount || 0n) + BigInt(amount.toString())
    })
  )
}

async function updateL2Balance(
  ctx: FuelContext,
  blockHeight: string | undefined,
  daHeight: string | undefined,
  assetId: string,
  distinctId: string,
  amount: BN
) {
  const id = `${assetId}-${distinctId}`
  const balance = await ctx.store.get(L2Balance, id)
  await ctx.store.upsert(
    new L2Balance({
      id,
      blockHeight: blockHeight ? BigInt(blockHeight) : undefined,
      daHeight: daHeight ? BigInt(daHeight) : undefined,
      timestamp: ctx.timestamp.toISOString(),
      assetId,
      distinctId,
      amount: (balance?.amount || 0n) + BigInt(amount.toString())
    })
  )
}
