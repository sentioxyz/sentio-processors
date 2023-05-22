import * as liquidswap from "./types/aptos/liquidswap.js";
import { AptosBaseProcessor, AptosModulesProcessor } from "@sentio/sdk/aptos";

for (const s of [liquidswap.scripts_v3, liquidswap.scripts_v2, liquidswap.scripts,
  liquidswap.liquidity_pool, liquidswap.dao_storage, liquidswap.global_config, liquidswap.lp_account]) {
  s.bind()
      .onTransaction((tx, ctx) => {
        ctx.meter.Counter("manual").add(1)
      })
}

const address = liquidswap.liquidity_pool.DEFAULT_OPTIONS.address

// doesn't matter if this works or not
new AptosBaseProcessor("", { address })
    .onTransaction((tx, ctx) => { ctx.meter.Counter("auto_1").add(1) })

// TODO make this work, the number should be larger than "manual" for a bit
AptosModulesProcessor.bind({address})
    .onTransaction((tx, ctx) => { ctx.meter.Counter("auto_2").add(1) })
