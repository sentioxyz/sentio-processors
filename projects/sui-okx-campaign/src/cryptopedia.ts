import { SuiContext } from "@sentio/sdk/sui";
import { mint_event } from "./types/sui/0xbc3df36be17f27ac98e3c839b2589db8475fa07b20657b08e8891e3aaf5ee5f9.js";
const mintEventHandler = async (event: mint_event.MintEventInstance, ctx: SuiContext) => {
    ctx.eventLogger.emit("Mint", {
        distinctId: event.sender,
        collection_id: event.data_decoded.collection_id,
        object: event.data_decoded.object,
        project: "cryptopedia"
    })
}

mint_event.bind()
    .onEventMintEvent(mintEventHandler)
