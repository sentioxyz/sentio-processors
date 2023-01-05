import { TestProcessorServer } from '@sentio/sdk/lib/testing'
import { BorshInstructionCoder, Idl } from "@project-serum/anchor";
import { pyth_oracle_idl } from "./types/solana/pyth_oracle";
import bs58 from "bs58";
import { PythOracleCoder } from '@pythnetwork/client';
import { PythOracle } from '@pythnetwork/client/lib/anchor';

describe('Test Processor', () => {
  const service = new TestProcessorServer(() => require('./processor'))

  beforeAll(async () => {
    await service.start()
  })

  test('has valid config', async () => {
    // // const instructionCoder = new BorshInstructionCoder(pyth_oracle_idl as Idl)
    // const coder = new PythOracleCoder(pyth_oracle_idl as PythOracle);
    // const instructionCoder = coder.instruction
    //
    // const tt = bs58.decode("6mJFQCt94hG4CKNYKgVcwfDH6kX6Cb1uK8MxXBk9iAFmcdgsTYryFV")
    // // const instructionCoder = new BorshInstructionCoder(pyth_oracle_idl as Idl)
    // const decodedIns = instructionCoder.decode("020000000d000000000000000000000000000000000000000000000000000000acfc2a0a00000000", "hex")

    // https://explorer.solana.com/tx/65CGX2dDXpsrvJZPc243yC9P666Eqh755d4KtgYAqeqfjPfpQrhj7J75mEt2Laefq68CrUvthk4nmYDHcDPLRn3H
    // https://github.com/pyth-network/pyth-sdk-rs/blob/main/pyth-sdk-solana/src/state.rs#L127
    const res = await service.testInstructions([
      {"instructionData":"6mJFQCt94hG4CKNYKgVcwfDH6kX6Cb1uK8MxXBk9iAFmcdgsTYryFV",
        "slot":167963569n,
        "programAccountId":"FsJ3A3u2vn5cTVofAjvy6y5kwABJAqYWpe4975bi2epH",
        "accounts":["JTmFx5zX9mM94itfk2nQcJnQQDPjcv4UPD7SYj6xDCV","7Dn52EY5EGE8Nvvw98KVMGPWTiTGn3PF4y24TVLyXdT9", "SysvarC1ock11111111111111111111111111111111"]}
    ])
    console.log(res)
  })
})
