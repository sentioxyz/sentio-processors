import { TestProcessorServer } from '@sentio/sdk/testing'
import { decodeMultiSig } from "@mysten/sui.js";
import { TextDecoder, TextEncoder } from "util"

describe('Test Processor', () => {
  const service = new TestProcessorServer(() => import('./processor.js'))

  // const txSig = 'AwUAG3RvCWmw0F7VmCsDgVMYUCcggRmh8D5lyJo2BKU+LFJgfbHi4eIY+PmjmX1yaOZTemUJ8ENrCcqbZ0moqgSGDQCp1dK8FW7pSn7ZW8l0F8O8QCI3xbIrD3PNu6XHNd2GXjfO60ndCCOAillFoDJGRzA7QLD4CfQhJfRuMbbUwq0DACRG8vZPGMIQqRDaKv2uCyLNGamGUh3/5pLarLHrVeHdrx21Fq4Y/GQsPTJ0mAhu1E3IeFzWXG9nKWSzU8YU6QwACQD4umqxoOjBVNDEF9CVjYqMGItKkxvavtn3fcTLCPZ79fUHB3IpRAp3HD7PcORyDbQzFOXAr3KZO79hNT0fAwAuE+CvzKiCVZhxWOBucKUI6EEF6FM2NWAC17Ob8iWGMjDoaytdmX06aBdjoaLnUKvT8sPdH7zUQvckNepBoOwBGjowAAABAAAAAAAEABAAAAAAAAEAAgADAAQABSxBRVN4Y3pxKzlKbFBodnZVVVB4NTk4R2tubGtQSDYxSW41cGJQeklwU29RTgEsQU1CdEg0QTdyd0pwejUwRVZXSk1MbENpNk5nRUNBNDdwS0k5amUzN0ZmcWgBLEFFUDhWU0JWeUloR01Pa0tWUUIyUnpGczgxUTdOeWQ3ZXdtZTZsTzBJSFppASxBRWJrNS9XY2tEeno2ZTJoZHF2Wll4YjUxVXk5K3VvNStKSmZ2WTgwaVNLMgEsQUhLTEZhMnphKzFDQUgyNXdhbTBGNkNIaHdwQnhyNFcwWWZwQVBvdldWTEoBAwA='


  beforeAll(async () => {
    await service.start()
  })

  test('has config', async () => {
    const config = await service.getConfig({})
    expect(config.contractConfigs.length > 0)
  })

  const txSig = 'AwUAG3RvCWmw0F7VmCsDgVMYUCcggRmh8D5lyJo2BKU+LFJgfbHi4eIY+PmjmX1yaOZTemUJ8ENrCcqbZ0moqgSGDQCp1dK8FW7pSn7ZW8l0F8O8QCI3xbIrD3PNu6XHNd2GXjfO60ndCCOAillFoDJGRzA7QLD4CfQhJfRuMbbUwq0DACRG8vZPGMIQqRDaKv2uCyLNGamGUh3/5pLarLHrVeHdrx21Fq4Y/GQsPTJ0mAhu1E3IeFzWXG9nKWSzU8YU6QwACQD4umqxoOjBVNDEF9CVjYqMGItKkxvavtn3fcTLCPZ79fUHB3IpRAp3HD7PcORyDbQzFOXAr3KZO79hNT0fAwAuE+CvzKiCVZhxWOBucKUI6EEF6FM2NWAC17Ob8iWGMjDoaytdmX06aBdjoaLnUKvT8sPdH7zUQvckNepBoOwBGjowAAABAAAAAAAEABAAAAAAAAEAAgADAAQABSxBRVN4Y3pxKzlKbFBodnZVVVB4NTk4R2tubGtQSDYxSW41cGJQeklwU29RTgEsQU1CdEg0QTdyd0pwejUwRVZXSk1MbENpNk5nRUNBNDdwS0k5amUzN0ZmcWgBLEFFUDhWU0JWeUloR01Pa0tWUUIyUnpGczgxUTdOeWQ3ZXdtZTZsTzBJSFppASxBRWJrNS9XY2tEeno2ZTJoZHF2Wll4YjUxVXk5K3VvNStKSmZ2WTgwaVNLMgEsQUhLTEZhMnphKzFDQUgyNXdhbTBGNkNIaHdwQnhyNFcwWWZwQVBvdldWTEoBAwA='

  const tx2 = 'AwIAvlJnUP0iJFZL+QTxkKC9FHZGwCa5I4TITHS/QDQ12q1sYW6SMt2Yp3PSNzsAay0Fp2MPVohqyyA02UtdQ2RNAQGH0eLk4ifl9h1I8Uc+4QlRYfJC21dUbP8aFaaRqiM/f32TKKg/4PSsGf9lFTGwKsHJYIMkDoqKwI8Xqr+3apQzAwADAFriILSy9l6XfBLt5hV5/1FwtsIsAGFow3tefGGvAYCDAQECHRUjB8a3Kw7QQYsOcM2A5/UpW42G9XItP1IT+9I5TzYCADtqJ7zOtqQtYqOo0CpvDXNlMhV3HeJDpjrASKGLWdopAwMA'

  test('test multisign', async () => {
    const keys = decodeMultiSig(tx2)
    const key = keys[0].pubKey.toBytes()
    // const new TextDecoder().decode(key)
    const buf = Buffer.from(key).toString("hex")
    console.log(buf)
  })
})
