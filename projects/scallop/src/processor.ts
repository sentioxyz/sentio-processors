
import { SuiContext } from "@sentio/sdk/sui";
import { mint } from "./types/sui/0xefe8b36d5b2e43728cc323298626b83177803521d195cfb11e15b910e892fddf.js"
import { normalizeSuiAddress } from "@mysten/sui.js";

const mintEventHandler = async (
  event: mint.MintEventInstance,
  ctx: SuiContext
) => {
  const deposit_asset = normalizeSuiAddress(event.data_decoded.deposit_asset.name);

  let coin_symbol = "unk"
  if (deposit_asset == "0x0000000000000000000000000000000000000000000000000000000000000002::sui::sui") {
    coin_symbol = "sui"
  }
  if (deposit_asset == "0x5d4b302506645c37ff133b98c4b50a5ae14841659738d6d733d59d0d217a93bf::coin::coin") {
    coin_symbol = "usdc"
  }

  if (coin_symbol == "sui" || coin_symbol == "usdc") {
    const decimal = coin_symbol == "sui" ? 9 : 8
    const deposit_amount = Number(event.data_decoded.deposit_amount) / 10 ** decimal
    if (deposit_amount >= 5) {
      ctx.eventLogger.emit("Mint", {
        distinctId: event.sender,
        deposit_amount,
        deposit_asset,
        coin_symbol,
        project: "scallop",
      })
    }
  }
}

mint.bind({
  startCheckpoint: 8500000n
})
  .onEventMintEvent(mintEventHandler)