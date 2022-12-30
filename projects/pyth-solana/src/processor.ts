// https://github.com/sentioxyz/mirrorworld/blob/main/src/processor.ts
// https://explorer.solana.com/tx/65CGX2dDXpsrvJZPc243yC9P666Eqh755d4KtgYAqeqfjPfpQrhj7J75mEt2Laefq68CrUvthk4nmYDHcDPLRn3H

import { PythOracleProcessor } from "./types/solana/pyth_oracle_processor";
import { CHAIN_IDS } from "@sentio/sdk/lib/utils/chain";

PythOracleProcessor.bind({
  network: CHAIN_IDS.SOLANA_PYTH,
  address: "FsJ3A3u2vn5cTVofAjvy6y5kwABJAqYWpe4975bi2epH",
  // processInnerInstruction: true
}).onUpdPrice((args, accounts, ctx) => {
  console.log(args, accounts, ctx);
})