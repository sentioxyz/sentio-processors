import { suia } from "./types/sui/suia.js";
import { SuiChainId } from "@sentio/sdk"
import { SuiContext, SuiObjectsContext } from "@sentio/sdk/sui";
export const SUIA_ADDRESS = "0xbb1531504c9c3235d3cd637ed9573cbe18461255b4175a1cb1e1b07b8aa8e11b"

export async function getSuiBalance(ctx: SuiContext, address: string) {
  let obj
  try {
    obj = await ctx.client.getBalance({ owner: address, coinType: "0x2::sui::SUI" })
  }
  catch (e) { console.log(e.message, `getBalance error for ${ctx.transaction.digest}`) }
  return obj.totalBalance
}

suia.bind({
  address: SUIA_ADDRESS,
  network: SuiChainId.SUI_MAINNET,
  startCheckpoint: 1500000n
})
  .onEntryClaimMedal(async (call, ctx) => {
    ctx.meter.Counter("claim_medal_counter").add(1)
    const medal = call.arguments_decoded[0]
    const sender = ctx.transaction.transaction.data.sender
    const balance = Number(await getSuiBalance(ctx, sender)) / Math.pow(10, 9)
    ctx.eventLogger.emit("ClaimMedal", {
      distinctId: sender,
      medal,
      balance
    })
  })



