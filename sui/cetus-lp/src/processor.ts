import { SuiWrappedObjectProcessor } from "@sentio/sdk/sui"
import { linked_table } from "./types/sui/0xbe21a06129308e0495431d12286127897aff07a8ade3970495a4404d97f9eaaa.js";
import { dynamic_field, object$ } from "@sentio/sdk/sui/builtin/0x2";
import { position } from "./types/sui/clmm.js";
import { ANY_TYPE, TypeDescriptor } from "@sentio/sdk/move"

SuiWrappedObjectProcessor
  .bind({
    objectId: "0x305866847f16ec900dc066e54664e4b0acd60115649de73586e544e2750658ae",
    startCheckpoint: 20000000n
  })
  .onTimeInterval(async (dynamicFieldObjects, ctx) => {
    const nodeType: TypeDescriptor<dynamic_field.Field<object$.ID, linked_table.Node<object$.ID, position.PositionInfo>>>
      = dynamic_field.Field.type(object$.ID.type(), linked_table.Node.type(ANY_TYPE, ANY_TYPE))

    // console.log(nodeType.getNormalizedSignature())
    const nodes = await ctx.coder.filterAndDecodeObjects(nodeType, dynamicFieldObjects)

    for (const node of nodes) {
      const pos = node.data_decoded.value.value

      //@ts-ignore
      ctx.meter.Gauge("position_gauge").record(pos.liquidity, { position_id: pos.position_id })
      ctx.eventLogger.emit("position_log", {
        //@ts-ignore
        liquidity: pos.liquidity,
        //@ts-ignore
        position_id: pos.position_id
      })

    }
  }, 240, 240, undefined, { owned: true })
