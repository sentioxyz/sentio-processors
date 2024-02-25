import { TestProcessorServer } from '@sentio/sdk/testing'
import { EthChainId } from '@sentio/sdk/eth'
import { mockMintLog, mockBorrowLog } from './types/eth/tcro.js'


describe('Test Processor', () => {
  const service = new TestProcessorServer(() => import('./processor.js'))

  beforeAll(async () => {
    await service.start()
  })



  test('output anything', async () => {
    console.log(`output anything`)
  })

  test('check mint event handling', async () => {
    console.log("entered")
    const resp = await service.eth.testLog(
      mockMintLog('0x131b6f908395f4f43a5a9320b7f96e755df86f8c', {
        minter:
          "0x47ef752f08676a1c8a72959d73da5281b37661e4",
        mintAmount: 1000000000000000000n,
        mintTokens: 1000000000n
      }),
      EthChainId.CRONOS
    )

    // const tokenCounter = firstCounterValue(resp.result, 'token')
    // expect(tokenCounter).toEqual(10n)
  })

  test('check borrow event handling', async () => {
    const resp = await service.eth.testLog(
      mockBorrowLog('0x47e5229d46a11a25ff5dca210df57d62345decf1', {
        borrower:
          "0x47ef752f08676a1c8a72959d73da5281b37661e4",
        borrowAmount:
          1963925048784506231206523n,
        accountBorrows:
          1963925048784506231206523n,
        totalBorrows:
          2036233812352929595455696n
      }),
      EthChainId.CRONOS
    )

    // const tokenCounter = firstCounterValue(resp.result, 'token')
    // expect(tokenCounter).toEqual(10n)
  })


  // test('check transaction block', async () => {
  //   const resp = await service.eth.testLog(txdata.result as any, EthChainId.CRONOS)
  //   console.log(resp)
  // })
})


const txdata = {
  "jsonrpc": "2.0",
  "id": 1,
  "result": [
    {
      "address": "0x131b6f908395f4f43a5a9320b7f96e755df86f8c",
      "topics": [
        "0x4dec04e750ca11537cabcd8a9eab06494de08da3735bc8871cd41250e190bc04"
      ],
      "data": "0x000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000de0bc82bd7522790000000000000000000000000000000000000000000000000000000000000000",
      "blockNumber": "0xc168d3",
      "transactionHash": "0x4c4584a57e5487a06e61c815c7ee368656ad58bd38774184eadcd97072dc1e4b",
      "transactionIndex": "0x0",
      "blockHash": "0xaef7a6a08ef455fd77e796f8245c7ca1b2a9ade89e9f9cbbe52a7516ae91b65b",
      "logIndex": "0xa",
      "removed": false
    },
    {
      "address": "0x131b6f908395f4f43a5a9320b7f96e755df86f8c",
      "topics": [
        "0x4c209b5fc8ad50758f13e2e1088ba56a560dff690a1c6fef26394f4c03821c4f"
      ],
      "data": "0x00000000000000000000000047ef752f08676a1c8a72959d73da5281b37661e40000000000000000000000000000000000000000000000000de0b6b3a7640000000000000000000000000000000000000000000000000000000000003b9aca00",
      "blockNumber": "0xc168d3",
      "transactionHash": "0x4c4584a57e5487a06e61c815c7ee368656ad58bd38774184eadcd97072dc1e4b",
      "transactionIndex": "0x0",
      "blockHash": "0xaef7a6a08ef455fd77e796f8245c7ca1b2a9ade89e9f9cbbe52a7516ae91b65b",
      "logIndex": "0xf",
      "removed": false
    },
    {
      "address": "0x131b6f908395f4f43a5a9320b7f96e755df86f8c",
      "topics": [
        "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef",
        "0x000000000000000000000000131b6f908395f4f43a5a9320b7f96e755df86f8c",
        "0x00000000000000000000000047ef752f08676a1c8a72959d73da5281b37661e4"
      ],
      "data": "0x000000000000000000000000000000000000000000000000000000003b9aca00",
      "blockNumber": "0xc168d3",
      "transactionHash": "0x4c4584a57e5487a06e61c815c7ee368656ad58bd38774184eadcd97072dc1e4b",
      "transactionIndex": "0x0",
      "blockHash": "0xaef7a6a08ef455fd77e796f8245c7ca1b2a9ade89e9f9cbbe52a7516ae91b65b",
      "logIndex": "0x10",
      "removed": false
    },
    {
      "address": "0x131b6f908395f4f43a5a9320b7f96e755df86f8c",
      "topics": [
        "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef",
        "0x00000000000000000000000047ef752f08676a1c8a72959d73da5281b37661e4",
        "0x000000000000000000000000131b6f908395f4f43a5a9320b7f96e755df86f8c"
      ],
      "data": "0x000000000000000000000000000000000000000000000000000000003b9ac9fe",
      "blockNumber": "0xc168d3",
      "transactionHash": "0x4c4584a57e5487a06e61c815c7ee368656ad58bd38774184eadcd97072dc1e4b",
      "transactionIndex": "0x0",
      "blockHash": "0xaef7a6a08ef455fd77e796f8245c7ca1b2a9ade89e9f9cbbe52a7516ae91b65b",
      "logIndex": "0x15",
      "removed": false
    },
    {
      "address": "0x131b6f908395f4f43a5a9320b7f96e755df86f8c",
      "topics": [
        "0xe5b754fb1abb7f01b499791d0b820ae3b6af3424ac1c59768edb53f4ec31a929"
      ],
      "data": "0x00000000000000000000000047ef752f08676a1c8a72959d73da5281b37661e40000000000000000000000000000000000000000000000000de0b6b3302e6c00000000000000000000000000000000000000000000000000000000003b9ac9fe",
      "blockNumber": "0xc168d3",
      "transactionHash": "0x4c4584a57e5487a06e61c815c7ee368656ad58bd38774184eadcd97072dc1e4b",
      "transactionIndex": "0x0",
      "blockHash": "0xaef7a6a08ef455fd77e796f8245c7ca1b2a9ade89e9f9cbbe52a7516ae91b65b",
      "logIndex": "0x16",
      "removed": false
    },
    {
      "address": "0x131b6f908395f4f43a5a9320b7f96e755df86f8c",
      "topics": [
        "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef",
        "0x00000000000000000000000047ef752f08676a1c8a72959d73da5281b37661e4",
        "0x000000000000000000000000131b6f908395f4f43a5a9320b7f96e755df86f8c"
      ],
      "data": "0x0000000000000000000000000000000000000000000000000000000000000001",
      "blockNumber": "0xc168d3",
      "transactionHash": "0x4c4584a57e5487a06e61c815c7ee368656ad58bd38774184eadcd97072dc1e4b",
      "transactionIndex": "0x0",
      "blockHash": "0xaef7a6a08ef455fd77e796f8245c7ca1b2a9ade89e9f9cbbe52a7516ae91b65b",
      "logIndex": "0x45",
      "removed": false
    },
    {
      "address": "0x131b6f908395f4f43a5a9320b7f96e755df86f8c",
      "topics": [
        "0xe5b754fb1abb7f01b499791d0b820ae3b6af3424ac1c59768edb53f4ec31a929"
      ],
      "data": "0x00000000000000000000000047ef752f08676a1c8a72959d73da5281b37661e400000000000000000000000000000000000000000000000d337478bb722f20cb0000000000000000000000000000000000000000000000000000000000000001",
      "blockNumber": "0xc168d3",
      "transactionHash": "0x4c4584a57e5487a06e61c815c7ee368656ad58bd38774184eadcd97072dc1e4b",
      "transactionIndex": "0x0",
      "blockHash": "0xaef7a6a08ef455fd77e796f8245c7ca1b2a9ade89e9f9cbbe52a7516ae91b65b",
      "logIndex": "0x46",
      "removed": false
    }
  ]
}