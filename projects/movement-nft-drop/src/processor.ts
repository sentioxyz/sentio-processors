import { soulbound_nft } from './types/aptos/movement-mainnet/0x000000000000000000000000000000000000000000000000000000000a550c18.js'

soulbound_nft.bind().onEventNFTMintEvent(
  async (evt, ctx) => {
    const { owner, token_id } = evt.data_decoded
    const transfer = ctx.transaction.events[ctx.eventIndex - 1]
    if (transfer?.type != '0x1::object::TransferEvent' || transfer?.data?.from != '0xa550c18') {
      console.error(ctx.eventIndex, transfer)
      throw new Error(`Unexpected transaction ${ctx.transaction.hash}`)
    }
    ctx.eventLogger.emit('mint', {
      owner,
      token_id,
      object: transfer.data.object
    })
  },
  {
    allEvents: true
  }
)
