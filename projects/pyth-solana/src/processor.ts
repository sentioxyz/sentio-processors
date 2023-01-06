// https://github.com/sentioxyz/mirrorworld/blob/main/src/processor.ts

import { PythOracleProcessor } from "./types/solana/pyth_oracle_processor";
import { Instruction } from "@project-serum/anchor";
import { pyth_oracle_idl } from "./types/solana/pyth_oracle";
// import bs58 from "bs58";
import { PythOracleCoder } from "@pythnetwork/client";
import { PythOracle } from "@pythnetwork/client/lib/anchor";
import { SolanaBindOptions } from "@sentio/sdk-solana";
import { PythOracleInstructionCoder } from "@pythnetwork/client/lib/anchor/coder/instructions";

// https://explorer.solana.com/tx/65CGX2dDXpsrvJZPc243yC9P666Eqh755d4KtgYAqeqfjPfpQrhj7J75mEt2Laefq68CrUvthk4nmYDHcDPLRn3H
// Solana Mainetnet

// class CompatiblePythOracleProcessor extends PythOracleProcessor {
//   coder = new PythOracleCoder(pyth_oracle_idl as PythOracle);
//   decodeInstruction: (rawInstruction: string) => Instruction | null = (rawInstruction) => {
//     return this.coder.instruction.decode(Buffer.from(bs58.decode(rawInstruction)))
//   }
//   static bind(options: SolanaBindOptions): PythOracleProcessor {
//     if (options && !options.name) {
//       options.name = 'PythOracle'
//     }
//     return new CompatiblePythOracleProcessor(options)
//   }
// }

// PythOracleProcessor.bind({
//   network: CHAIN_IDS.SOLANA_PYTH,
//   address: "FsJ3A3u2vn5cTVofAjvy6y5kwABJAqYWpe4975bi2epH",
//   // processInnerInstruction: true
// }).onUpdPrice((args, accounts, ctx) => {
//   console.log(args, accounts, ctx);
// })

PythOracleProcessor.bind({
  address: "FsJ3A3u2vn5cTVofAjvy6y5kwABJAqYWpe4975bi2epH",
  instructionCoder: new PythOracleInstructionCoder(pyth_oracle_idl as PythOracle),
}).onUpdPrice((args, accounts, ctx) => {
  ctx.meter.Gauge("price").record(args.price, { price_account: accounts.priceAccount })
}).onUpdPriceNoFailOnError((args, accounts, ctx) => {
  console.log(args, accounts, ctx);
})

