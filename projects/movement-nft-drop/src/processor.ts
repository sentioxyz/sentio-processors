import { soulbound_nftv4 } from './types/aptos/movement-testnet/soulbound.js'

soulbound_nftv4.bind({ startVersion: 8605174 }).onEventNFTMintEvent((evt, ctx) => {
  const { token_id, owner } = evt.data_decoded
  ctx.eventLogger.emit('mint', {
    token_id,
    owner
  })
})
