import { collection } from "./types/aptos/movement-mainnet/0x0000000000000000000000000000000000000000000000000000000000000004.js"
collection.bind()
.onEventMintEvent(async (evt, ctx) => {
  ctx.eventLogger.emit('mint', {
    //@ts-ignore
    collection: evt.data_decoded.collection,
    //@ts-ignore
    id: evt.data_decoded.index.value,
    token: evt.data_decoded.token
  })
})
