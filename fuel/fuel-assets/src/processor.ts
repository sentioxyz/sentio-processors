import { BaseAssetId } from '@fuel-ts/address/configs'
import { FuelAssetProcessor, FuelNetwork } from "@sentio/sdk/fuel";

FuelAssetProcessor.bind({
  chainId: FuelNetwork.TEST_NET
}).onTransfer(
    {
      from: "0xd3fe20c8ff68a4054d8587ac170c40db7d1e200208a575780542bd9a7e3eec08",
      assetId: BaseAssetId
    },
    async (transfer, ctx) => {
      const from = transfer.from[0].address
      const to = transfer.to[0].address
      const amount = transfer.to[0].amount

      ctx.eventLogger.emit('transfer', {
        distinctId: `${ctx.transaction?.id}_${ctx.transaction?.blockId}`,
        message: `transfered ${amount} from ${from} to ${to}`,
        attributes: {
          amount: amount.toString(),
          from,
          to
        }
      })
    }
)
