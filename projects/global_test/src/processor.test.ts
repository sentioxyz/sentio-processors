import assert from 'assert'
import { TestProcessorServer } from '@sentio/sdk/testing'
import { before, describe, test } from 'node:test'
import { expect } from 'chai'
// @ts-expect-error ??
import { decodeMultiSig, builder, fromB64 } from "@mysten/sui.js";
import { TextDecoder, TextEncoder } from "util"

describe('Test Processor', () => {
  const service = new TestProcessorServer(() => import('./processor.js'))

  // const txSig = 'AwUAG3RvCWmw0F7VmCsDgVMYUCcggRmh8D5lyJo2BKU+LFJgfbHi4eIY+PmjmX1yaOZTemUJ8ENrCcqbZ0moqgSGDQCp1dK8FW7pSn7ZW8l0F8O8QCI3xbIrD3PNu6XHNd2GXjfO60ndCCOAillFoDJGRzA7QLD4CfQhJfRuMbbUwq0DACRG8vZPGMIQqRDaKv2uCyLNGamGUh3/5pLarLHrVeHdrx21Fq4Y/GQsPTJ0mAhu1E3IeFzWXG9nKWSzU8YU6QwACQD4umqxoOjBVNDEF9CVjYqMGItKkxvavtn3fcTLCPZ79fUHB3IpRAp3HD7PcORyDbQzFOXAr3KZO79hNT0fAwAuE+CvzKiCVZhxWOBucKUI6EEF6FM2NWAC17Ob8iWGMjDoaytdmX06aBdjoaLnUKvT8sPdH7zUQvckNepBoOwBGjowAAABAAAAAAAEABAAAAAAAAEAAgADAAQABSxBRVN4Y3pxKzlKbFBodnZVVVB4NTk4R2tubGtQSDYxSW41cGJQeklwU29RTgEsQU1CdEg0QTdyd0pwejUwRVZXSk1MbENpNk5nRUNBNDdwS0k5amUzN0ZmcWgBLEFFUDhWU0JWeUloR01Pa0tWUUIyUnpGczgxUTdOeWQ3ZXdtZTZsTzBJSFppASxBRWJrNS9XY2tEeno2ZTJoZHF2Wll4YjUxVXk5K3VvNStKSmZ2WTgwaVNLMgEsQUhLTEZhMnphKzFDQUgyNXdhbTBGNkNIaHdwQnhyNFcwWWZwQVBvdldWTEoBAwA='


  before(async () => {
    await service.start()
  })

  test('has config', async () => {
    const config = await service.getConfig({})
    expect(config.contractConfigs.length > 0)
  })

  const txSig = 'AwUAG3RvCWmw0F7VmCsDgVMYUCcggRmh8D5lyJo2BKU+LFJgfbHi4eIY+PmjmX1yaOZTemUJ8ENrCcqbZ0moqgSGDQCp1dK8FW7pSn7ZW8l0F8O8QCI3xbIrD3PNu6XHNd2GXjfO60ndCCOAillFoDJGRzA7QLD4CfQhJfRuMbbUwq0DACRG8vZPGMIQqRDaKv2uCyLNGamGUh3/5pLarLHrVeHdrx21Fq4Y/GQsPTJ0mAhu1E3IeFzWXG9nKWSzU8YU6QwACQD4umqxoOjBVNDEF9CVjYqMGItKkxvavtn3fcTLCPZ79fUHB3IpRAp3HD7PcORyDbQzFOXAr3KZO79hNT0fAwAuE+CvzKiCVZhxWOBucKUI6EEF6FM2NWAC17Ob8iWGMjDoaytdmX06aBdjoaLnUKvT8sPdH7zUQvckNepBoOwBGjowAAABAAAAAAAEABAAAAAAAAEAAgADAAQABSxBRVN4Y3pxKzlKbFBodnZVVVB4NTk4R2tubGtQSDYxSW41cGJQeklwU29RTgEsQU1CdEg0QTdyd0pwejUwRVZXSk1MbENpNk5nRUNBNDdwS0k5amUzN0ZmcWgBLEFFUDhWU0JWeUloR01Pa0tWUUIyUnpGczgxUTdOeWQ3ZXdtZTZsTzBJSFppASxBRWJrNS9XY2tEeno2ZTJoZHF2Wll4YjUxVXk5K3VvNStKSmZ2WTgwaVNLMgEsQUhLTEZhMnphKzFDQUgyNXdhbTBGNkNIaHdwQnhyNFcwWWZwQVBvdldWTEoBAwA='

  const tx2 = "AwIAguYciARZ7HUhAflUs4pgcvZ2TQm/rY92qx/fcP04q17Em9AI5gIIAYwLyJKl9uDx92nObXbTIhF06p5M7pxKBQCwVRJPbEzS7G+V5EERUq4o7MrOAkN+geXC/rce7IimJOqNXAVjJVSerjRiJcbZ3L2z2OEBt8Msscpx279T/WcLAwADAIrUbf0vQpkiMowwt2dootVDQmk62g3fFUX0jOX3RzaLAQAIC1rxNtEqxop8RmN1HN4HxE0fZbEWlohSwhUYSWZBHAEAbWF2ZW4AAAAAAAAAAAAAAAUAAAAAAAAAAAAAAAAAAAABAgA="
  test('test multisign', async () => {
    const keys = decodeMultiSig(tx2)
    // const key = keys[0].pubKey.toBytes()
    // // const new TextDecoder().decode(key)
    // const buf = Buffer.from(key).toString("hex")
    // console.log(buf)

    const multisigs = builder.de('MultiSig', fromB64(tx2).slice(1));
    const pkKeys = multisigs.multisig_pk.pk_map
    const pbK = Buffer.from((pkKeys[pkKeys.length - 1].pubKey as any).ED25519).toString("hex")
    console.log(pbK)





  })
})
