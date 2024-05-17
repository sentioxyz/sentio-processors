import { TestProcessorServer, firstCounterValue } from '@sentio/sdk/testing'
import { mockTransferLog } from '@sentio/sdk/eth/builtin/erc20'
import { SuiNetwork } from '@sentio/sdk/sui'
import 'dotenv/config'

describe('Test Processor', () => {
  const service = new TestProcessorServer(() => import('./processor.js'), {
    [SuiNetwork.MAIN_NET]: process.env.SUI_RPC!
  })


  beforeAll(async () => {
    await service.start()
  })

  test('check transaction block', async () => {
    const resp = await service.sui.testEvent(txdata.result as any, SuiNetwork.MAIN_NET)
    console.log(resp)
  })
})

const txdata =
{
  "jsonrpc": "2.0",
  "result": {
    "digest": "48Krj1R878dTcrwEpy1ciLKsqnVuRqmsgYCQTWXGQTkV",
    "transaction": {
      "data": {
        "messageVersion": "v1",
        "transaction": {
          "kind": "ProgrammableTransaction",
          "inputs": [
            {
              "type": "pure",
              "valueType": "u64",
              "value": "1300000000000"
            },
            {
              "type": "object",
              "objectType": "sharedObject",
              "objectId": "0x5eb2dfcdd1b15d2021328258f6d5ec081e9a0cdcfa9e13a0eaeb9b5f7505ca78",
              "initialSharedVersion": "1731023",
              "mutable": true
            },
            {
              "type": "pure",
              "valueType": "u64",
              "value": "2443468241"
            },
            {
              "type": "pure",
              "valueType": "u128",
              "value": "4295048016"
            },
            {
              "type": "pure",
              "valueType": "bool",
              "value": true
            },
            {
              "type": "pure",
              "valueType": "address",
              "value": "0x72f31c5612569fbbf269e2d9f9d2851c668b7a99c2ed3cda531c63da6ddd0a4a"
            },
            {
              "type": "pure",
              "valueType": "u64",
              "value": "1711503010570"
            },
            {
              "type": "object",
              "objectType": "sharedObject",
              "objectId": "0x0000000000000000000000000000000000000000000000000000000000000006",
              "initialSharedVersion": "1",
              "mutable": false
            },
            {
              "type": "object",
              "objectType": "sharedObject",
              "objectId": "0xf1cf0e81048df168ebeb1b8030fad24b3e0b53ae827c25053fff0779c1445b6f",
              "initialSharedVersion": "1621135",
              "mutable": true
            }
          ],
          "transactions": [
            {
              "SplitCoins": [
                "GasCoin",
                [
                  {
                    "Input": 0
                  }
                ]
              ]
            },
            {
              "MakeMoveVec": [
                null,
                [
                  {
                    "Result": 0
                  }
                ]
              ]
            },
            {
              "MoveCall": {
                "package": "0x9632f61a796fc54952d9151d80b319e066cba5498a27b495c99e113db09726b1",
                "module": "swap_router",
                "function": "swap_a_b",
                "type_arguments": [
                  "0x2::sui::SUI",
                  "0x5d4b302506645c37ff133b98c4b50a5ae14841659738d6d733d59d0d217a93bf::coin::COIN",
                  "0x91bfbc386a41afcfd9b2533058d7e915a1d3829089cc268ff4333d54d6339ca1::fee3000bps::FEE3000BPS"
                ],
                "arguments": [
                  {
                    "Input": 1
                  },
                  {
                    "Result": 1
                  },
                  {
                    "Input": 0
                  },
                  {
                    "Input": 2
                  },
                  {
                    "Input": 3
                  },
                  {
                    "Input": 4
                  },
                  {
                    "Input": 5
                  },
                  {
                    "Input": 6
                  },
                  {
                    "Input": 7
                  },
                  {
                    "Input": 8
                  }
                ]
              }
            }
          ]
        },
        "sender": "0x72f31c5612569fbbf269e2d9f9d2851c668b7a99c2ed3cda531c63da6ddd0a4a",
        "gasData": {
          "payment": [
            {
              "objectId": "0x000c0e925f0a80a0f5d8719270e556a11a0b0991619e9e018173bbb61badabb7",
              "version": 82004655,
              "digest": "9iDeTNLzKhJvdCrysWNeuW5Tnxr4a2axsfabkMTCWJzE"
            }
          ],
          "owner": "0x72f31c5612569fbbf269e2d9f9d2851c668b7a99c2ed3cda531c63da6ddd0a4a",
          "price": "20803",
          "budget": "69420000"
        }
      },
      "txSignatures": [
        "AIYOWtDzR4ERx6jrLRq1ZqdzPEsqccRxS6QN9d09WkTRWjcToDndYtRESd0GYEyZwmD0L5MlfLA6JAdUnGCKxAT2X0ntu7uJGMCd8f+INMDn9igNiuXVrqh5IU+SDBgIyA=="
      ]
    },
    "effects": {
      "messageVersion": "v1",
      "status": {
        "status": "success"
      },
      "executedEpoch": "349",
      "gasUsed": {
        "computationCost": "41606000",
        "storageCost": "12129600",
        "storageRebate": "10699128",
        "nonRefundableStorageFee": "108072"
      },
      "modifiedAtVersions": [
        {
          "objectId": "0x000c0e925f0a80a0f5d8719270e556a11a0b0991619e9e018173bbb61badabb7",
          "sequenceNumber": "82004655"
        },
        {
          "objectId": "0x5eb2dfcdd1b15d2021328258f6d5ec081e9a0cdcfa9e13a0eaeb9b5f7505ca78",
          "sequenceNumber": "82005149"
        },
        {
          "objectId": "0xf1cf0e81048df168ebeb1b8030fad24b3e0b53ae827c25053fff0779c1445b6f",
          "sequenceNumber": "82004656"
        }
      ],
      "sharedObjects": [
        {
          "objectId": "0x5eb2dfcdd1b15d2021328258f6d5ec081e9a0cdcfa9e13a0eaeb9b5f7505ca78",
          "version": 82005149,
          "digest": "7mtsVWXkbzTrCBGR6Rq4AzKebdz5eC7isoQNYvvDE2wn"
        },
        {
          "objectId": "0xf1cf0e81048df168ebeb1b8030fad24b3e0b53ae827c25053fff0779c1445b6f",
          "version": 82004656,
          "digest": "5SYR8Rzy52XMPaPRZRhXh5W2eEjEuY5snfu9eGtTZtRD"
        },
        {
          "objectId": "0x0000000000000000000000000000000000000000000000000000000000000006",
          "version": 29829816,
          "digest": "9FvHNyE6FRh4pvwWyBNPstA1b4DgzxAKjVo9sF6USBXt"
        }
      ],
      "transactionDigest": "48Krj1R878dTcrwEpy1ciLKsqnVuRqmsgYCQTWXGQTkV",
      "created": [
        {
          "owner": {
            "AddressOwner": "0x72f31c5612569fbbf269e2d9f9d2851c668b7a99c2ed3cda531c63da6ddd0a4a"
          },
          "reference": {
            "objectId": "0x0bedf9ddde9be5229d6532c2486e87a4d72452cbc6cca61d42478c3c52d8c0e5",
            "version": 82005150,
            "digest": "GN49nSC1cKb6aq14CZiM7kEuGD3pfogLVyfXYQwvsS3R"
          }
        }
      ],
      "mutated": [
        {
          "owner": {
            "AddressOwner": "0x72f31c5612569fbbf269e2d9f9d2851c668b7a99c2ed3cda531c63da6ddd0a4a"
          },
          "reference": {
            "objectId": "0x000c0e925f0a80a0f5d8719270e556a11a0b0991619e9e018173bbb61badabb7",
            "version": 82005150,
            "digest": "Sp6RmS7rpu6vG4jbRJNgwd1QhtWsgamiFpZybiLj9jf"
          }
        },
        {
          "owner": {
            "Shared": {
              "initial_shared_version": 1731023
            }
          },
          "reference": {
            "objectId": "0x5eb2dfcdd1b15d2021328258f6d5ec081e9a0cdcfa9e13a0eaeb9b5f7505ca78",
            "version": 82005150,
            "digest": "7mJHqJKg8nuQG4yE3MsdXY3YsrRnintAq7moYqKrkMyj"
          }
        },
        {
          "owner": {
            "Shared": {
              "initial_shared_version": 1621135
            }
          },
          "reference": {
            "objectId": "0xf1cf0e81048df168ebeb1b8030fad24b3e0b53ae827c25053fff0779c1445b6f",
            "version": 82005150,
            "digest": "HsiJcz7GfdaAD3Kw6WinCGKy9TBxQHee8sGkXHxmgAD"
          }
        }
      ],
      "gasObject": {
        "owner": {
          "AddressOwner": "0x72f31c5612569fbbf269e2d9f9d2851c668b7a99c2ed3cda531c63da6ddd0a4a"
        },
        "reference": {
          "objectId": "0x000c0e925f0a80a0f5d8719270e556a11a0b0991619e9e018173bbb61badabb7",
          "version": 82005150,
          "digest": "Sp6RmS7rpu6vG4jbRJNgwd1QhtWsgamiFpZybiLj9jf"
        }
      },
      "eventsDigest": "EdTzNxrq8UB4i643PL3J6ti4pNfvr77W18dsJeCKRmo4",
      "dependencies": [
        "2KkZ8fUBLgTmdTR5w6bE3eSxKfYP1uqcUvtsZ7YiM7iX",
        "71RiMs79kj9ruCeo6D1QN8h4tAGiZWXPsj8QfKiACRSa",
        "7FtUuSqeZ9VRGbrMs38To5Qf4qd9nuVf43Xo4G6YL8Sz",
        "9b9wP1PcLQyn4LBaWNWGWsRunYQDYj5gyxoUEcutZVkr",
        "B3rRDH42p6Dop222QMgdCpG3KBxB4dWBpySn82JcUx4x",
        "C98QNtVyiZiAcEYpbZrcn5VPDmNHqruHD92Wn5G8ukGg",
        "CE2nTz6Rc7JdNPQ25yJdugSsjUQMLERfNEwzCKH72Qsw",
        "DrdSa8KCyTSwVk3et5JhhJijibjANTnuVLcVgbFnqK59"
      ]
    },
    "events": [
      {
        "id": {
          "txDigest": "48Krj1R878dTcrwEpy1ciLKsqnVuRqmsgYCQTWXGQTkV",
          "eventSeq": "0"
        },
        "packageId": "0x91bfbc386a41afcfd9b2533058d7e915a1d3829089cc268ff4333d54d6339ca1",
        "transactionModule": "swap_router",
        "sender": "0x72f31c5612569fbbf269e2d9f9d2851c668b7a99c2ed3cda531c63da6ddd0a4a",
        "type": "0x91bfbc386a41afcfd9b2533058d7e915a1d3829089cc268ff4333d54d6339ca1::pool::SwapEvent",
        "parsedJson": {
          "a_to_b": true,
          "amount_a": "1300000000000",
          "amount_b": "2445197079",
          "fee_amount": "3900000000",
          "is_exact_in": true,
          "liquidity": "1376226459233276",
          "pool": "0x5eb2dfcdd1b15d2021328258f6d5ec081e9a0cdcfa9e13a0eaeb9b5f7505ca78",
          "protocol_fee": "1170000000",
          "recipient": "0x72f31c5612569fbbf269e2d9f9d2851c668b7a99c2ed3cda531c63da6ddd0a4a",
          "sqrt_price": "801213980497251611",
          "tick_current_index": {
            "bits": 4294904562
          },
          "tick_pre_index": {
            "bits": 4294904563
          }
        },
        "bcs": "3QNkC7BY24vRTkQLNuStgph6rJoueLph5XBahSy5PAjZcNCjFmS8sX8uMXRKwuVPjZQjKFgYuPHTLChiwGLPCJ5ENJRCuot6cFn3BNey38REUKXQukjoPtRdUaXJxSob4SYWyARXknBfrQzVKp4MvAwG5QuKaG9trSnugbEm6BrySrPmiMpj6ZUZNYg88"
      }
    ],
    "objectChanges": [
      {
        "type": "mutated",
        "sender": "0x72f31c5612569fbbf269e2d9f9d2851c668b7a99c2ed3cda531c63da6ddd0a4a",
        "owner": {
          "AddressOwner": "0x72f31c5612569fbbf269e2d9f9d2851c668b7a99c2ed3cda531c63da6ddd0a4a"
        },
        "objectType": "0x2::coin::Coin<0x2::sui::SUI>",
        "objectId": "0x000c0e925f0a80a0f5d8719270e556a11a0b0991619e9e018173bbb61badabb7",
        "version": "82005150",
        "previousVersion": "82004655",
        "digest": "Sp6RmS7rpu6vG4jbRJNgwd1QhtWsgamiFpZybiLj9jf"
      },
      {
        "type": "mutated",
        "sender": "0x72f31c5612569fbbf269e2d9f9d2851c668b7a99c2ed3cda531c63da6ddd0a4a",
        "owner": {
          "Shared": {
            "initial_shared_version": 1731023
          }
        },
        "objectType": "0x91bfbc386a41afcfd9b2533058d7e915a1d3829089cc268ff4333d54d6339ca1::pool::Pool<0x2::sui::SUI, 0x5d4b302506645c37ff133b98c4b50a5ae14841659738d6d733d59d0d217a93bf::coin::COIN, 0x91bfbc386a41afcfd9b2533058d7e915a1d3829089cc268ff4333d54d6339ca1::fee3000bps::FEE3000BPS>",
        "objectId": "0x5eb2dfcdd1b15d2021328258f6d5ec081e9a0cdcfa9e13a0eaeb9b5f7505ca78",
        "version": "82005150",
        "previousVersion": "82005149",
        "digest": "7mJHqJKg8nuQG4yE3MsdXY3YsrRnintAq7moYqKrkMyj"
      },
      {
        "type": "mutated",
        "sender": "0x72f31c5612569fbbf269e2d9f9d2851c668b7a99c2ed3cda531c63da6ddd0a4a",
        "owner": {
          "Shared": {
            "initial_shared_version": 1621135
          }
        },
        "objectType": "0x91bfbc386a41afcfd9b2533058d7e915a1d3829089cc268ff4333d54d6339ca1::pool::Versioned",
        "objectId": "0xf1cf0e81048df168ebeb1b8030fad24b3e0b53ae827c25053fff0779c1445b6f",
        "version": "82005150",
        "previousVersion": "82004656",
        "digest": "HsiJcz7GfdaAD3Kw6WinCGKy9TBxQHee8sGkXHxmgAD"
      },
      {
        "type": "created",
        "sender": "0x72f31c5612569fbbf269e2d9f9d2851c668b7a99c2ed3cda531c63da6ddd0a4a",
        "owner": {
          "AddressOwner": "0x72f31c5612569fbbf269e2d9f9d2851c668b7a99c2ed3cda531c63da6ddd0a4a"
        },
        "objectType": "0x2::coin::Coin<0x5d4b302506645c37ff133b98c4b50a5ae14841659738d6d733d59d0d217a93bf::coin::COIN>",
        "objectId": "0x0bedf9ddde9be5229d6532c2486e87a4d72452cbc6cca61d42478c3c52d8c0e5",
        "version": "82005150",
        "digest": "GN49nSC1cKb6aq14CZiM7kEuGD3pfogLVyfXYQwvsS3R"
      }
    ],
    "timestampMs": "1711502991480",
    "checkpoint": "29829815"
  },
  "id": 1
}