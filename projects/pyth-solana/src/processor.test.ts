import { TestProcessorServer } from '@sentio/sdk/lib/testing'
import { BorshInstructionCoder, Idl } from "@project-serum/anchor";
import { pyth_oracle_idl } from "./types/solana/pyth_oracle";

describe('Test Processor', () => {
  const service = new TestProcessorServer(() => require('./processor'))

  beforeAll(async () => {
    await service.start()
  })

  test('has valid config', async () => {
    const instructionCoder = new BorshInstructionCoder(pyth_oracle_idl as Idl)

    const res = await service.testInstructions([
      {"instructionData":"6mJFQCt94hG4CKNYKgVcwrYpr9dz1Zcz6GGJkYBWJV7mowKX8VKJmu",
        "slot":170104286n,
        "programAccountId":"FsJ3A3u2vn5cTVofAjvy6y5kwABJAqYWpe4975bi2epH",
        "accounts":["HfeFy4G9r77iyeXdbfNJjYw4z3NPEKDL6YQh3JzJ9s9f","ETp9eKXVv1dWwHSpsXRUuXHmw24PwRkttCGVgpZEY9zF","SysvarC1ock11111111111111111111111111111111"]}
    ])
    console.log(res)
  })
})
