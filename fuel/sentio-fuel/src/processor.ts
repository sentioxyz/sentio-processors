import { GLOBAL_CONFIG } from '@sentio/runtime'
import { FuelContext, FuelGlobalProcessor, FuelNetwork } from '@sentio/sdk/fuel'
import { FuelBridgeContext, FuelBridgeProcessor, FuelBridgeProcessorTemplate } from './types/eth/fuelbridge.js'
import { InputType, OutputType, BN } from 'fuels'
import { Balance, KV } from './schema/schema.js'
import { timestamp } from '@sentio/sdk/aptos/builtin/0x1'

// const startBlock = 35976000n
const startBlock = 0n

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
    await updateBalance(ctx, '', fuelBaseAssetId, recipient, new BN(amount.toString()))
  }
)

const fuelBridgeTemplate = new FuelBridgeProcessorTemplate().onEventMessageSent(async (evt, ctx) => {
  const { recipient, amount } = evt.args
  ctx.eventLogger.emit('l1_tx', {
    recipient,
    amount
  })
  // await updateBalance(ctx, tx.blockNumber, fuelBaseAssetId, recipient, new BN(amount.toString()))
})

FuelGlobalProcessor.bind({ chainId: FuelNetwork.MAIN_NET, startBlock }).onTransaction(async (tx, ctx) => {
  const { inputs, outputs } = tx.transaction
  const l1Block = ctx.block?.header.daHeight
  console.log('- tx io', tx.blockNumber, tx.id, tx.status, l1Block, inputs?.length, outputs?.length)
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
          await updateBalance(ctx, tx.blockNumber, assetId, distinctId, amount.mul(-1))
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
          await updateBalance(ctx, tx.blockNumber, assetId, distinctId, amount)
        }
      })
    )
  }
  if (0 && l1Block) {
    const lastL1Block = await ctx.store.get(KV, 'l1Block')
    const startBlock = (lastL1Block?.value || 0n) + 1n
    const endBlock = BigInt(l1Block.toString())
    if (startBlock < endBlock) {
      console.log({ startBlock, endBlock })
      FuelBridgeProcessor.bind({
        address: '0xaeb0c00d0125a8a788956ade4f4f12ead9f65ddf',
        startBlock,
        endBlock
      }).onEventMessageSent(async (evt, ctx) => {
        const { recipient, amount } = evt.args
        ctx.eventLogger.emit('l1_tx', {
          recipient,
          amount
        })
        await updateBalance(ctx, tx.blockNumber, fuelBaseAssetId, recipient, new BN(amount.toString()))
      })
      await ctx.store.upsert(
        new KV({
          id: 'l1Block',
          value: endBlock
        })
      )
    }
  }
})

async function updateBalance(
  ctx: FuelContext | FuelBridgeContext,
  blockHeight: string | undefined,
  assetId: string,
  distinctId: string,
  amount: BN
) {
  const id = `${assetId}-${distinctId}`
  const balance = await ctx.store.get(Balance, id)
  await ctx.store.upsert(
    new Balance({
      id,
      blockHeight,
      timestamp: ctx.timestamp.toISOString(),
      assetId,
      distinctId,
      amount: (balance?.amount || 0n) + BigInt(amount.toString())
    })
  )
}
