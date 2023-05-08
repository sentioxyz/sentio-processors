import { TestProcessorServer, firstCounterValue } from '@sentio/sdk/testing'
// import { mockTransferLog } from '@sentio/sdk/eth/builtin/erc20'
import { SuiNetwork } from '@sentio/sdk/sui'
import { getPriceByType, getPriceBySymbol } from '@sentio/sdk/utils'

describe('Test Processor', () => {
  // const service = new TestProcessorServer(() => import('./processor.js'))

  // beforeAll(async () => {
  //   await service.start()
  // })

  // test('has valid config', async () => {
  //   const config = await service.getConfig({})
  //   expect(config.contractConfigs.length > 0).toBeTruthy()
  // })

  test('getPriceByType', async () => {
    const date = new Date('2023-05-08T04:39:59')
    const price = await getPriceByType("sui-mainnet", "0x2::sui::SUI", date)
    console.log(`price of sui: ${price}`)
  })

  test('getPriceBySymbol', async () => {
    const date = new Date('2023-05-08T04:39:59')
    const price = await getPriceBySymbol("SUI", date)
    console.log(`sui PriceBySymbol: ${price}`)
  })

  test('output anything', async () => {
    console.log(`output anything`)
  })

  // test('check transfer event handling', async () => {
  //   const resp = await service.eth.testLog(
  //     mockTransferLog('0x1e4ede388cbc9f4b5c79681b7f94d36a11abebc9', {
  //       from: '0x0000000000000000000000000000000000000000',
  //       to: '0xb329e39ebefd16f40d38f07643652ce17ca5bac1',
  //       value: 10n ** 18n * 10n,
  //     })
  //   )
  //
  //   const tokenCounter = firstCounterValue(resp.result, 'token')
  //   expect(tokenCounter).toEqual(10n)
  // })

  // test('check transaction block', async () => {
  //   const resp = await service.sui.testEvent(txdata.result as any, SuiNetwork.TEST_NET)
  //   console.log(resp)
  // })
})

// const txdata = {
//   "jsonrpc": "2.0",
//   "result": {
//     "digest": "C6XnvcwaELAVq9Bqk85GyTSrk4ko7tvhiqnRfmrKNN5g",
//     "transaction": {
//       "data": {
//         "messageVersion": "v1",
//         "transaction": {
//           "kind": "ProgrammableTransaction",
//           "inputs": [
//             {
//               "type": "object",
//               "objectType": "sharedObject",
//               "objectId": "0xa5ade7dfdd34f2652b0b1b98f628b76e9301de6f69038cc85283d72f0adccf89",
//               "initialSharedVersion": "14270143",
//               "mutable": false
//             },
//             {
//               "type": "object",
//               "objectType": "sharedObject",
//               "objectId": "0x056ee86d09bf768168394e76b2137cf567c99ebe43bb5820d817cc213b9fa0cd",
//               "initialSharedVersion": "18540536",
//               "mutable": true
//             },
//             {
//               "type": "object",
//               "objectType": "immOrOwnedObject",
//               "objectId": "0xec06a9ebe866281271a1d9dd0547cab9fe160f02c599e34e8b33f9029017e399",
//               "version": "18891152",
//               "digest": "jsK25W3uVCGKbn1VZUwNzserPhCHb1aQ2uMbaVgFCJR"
//             },
//             {
//               "type": "object",
//               "objectType": "sharedObject",
//               "objectId": "0x60d8adb56ca782f9202309d04dbc1bde289f0f08d4d3af40b0753359bd5903b2",
//               "initialSharedVersion": "14270143",
//               "mutable": true
//             },
//             {
//               "type": "object",
//               "objectType": "sharedObject",
//               "objectId": "0x0000000000000000000000000000000000000000000000000000000000000006",
//               "initialSharedVersion": "1",
//               "mutable": false
//             }
//           ],
//           "transactions": [
//             {
//               "MoveCall": {
//                 "package": "0x641dabee5c95ad216ce54c7282e1a4ef36242d81c66431566f8efc6bdc2feda2",
//                 "module": "pool_script",
//                 "function": "collect_reward",
//                 "type_arguments": [
//                   "0x4d892ceccd1497b9be7701e09d51c580bc83f22c9c97050821b373a77d0d9a9e::usdt::USDT",
//                   "0x4d892ceccd1497b9be7701e09d51c580bc83f22c9c97050821b373a77d0d9a9e::usdc::USDC",
//                   "0x17302a577a99020f93302d2c6949e5b078199adee1b7da565ec79e5d4552dc7d::cetus::CETUS"
//                 ],
//                 "arguments": [
//                   {
//                     "Input": 0
//                   },
//                   {
//                     "Input": 1
//                   },
//                   {
//                     "Input": 2
//                   },
//                   {
//                     "Input": 3
//                   },
//                   {
//                     "Input": 4
//                   }
//                 ]
//               }
//             }
//           ]
//         },
//         "sender": "0x660ea6bc10f2d6c2d40b829850ab746a6ad93c2674537c71e21809b0486254c6",
//         "gasData": {
//           "payment": [
//             {
//               "objectId": "0x3fefcf5130c7f4381391bdf46ed890ffa82be664c6e055951315c1887eb69f1a",
//               "version": 18891152,
//               "digest": "CvhgknxiDL34TudQbSMscEEEhBvqyZmTMs2B2XUjLcgP"
//             }
//           ],
//           "owner": "0x660ea6bc10f2d6c2d40b829850ab746a6ad93c2674537c71e21809b0486254c6",
//           "price": "1000",
//           "budget": "1000000000"
//         }
//       },
//       "txSignatures": [
//         "AOTJyYlt1UjyOLlgwWFobMNlM16OsdkFNb15aM6p5+RRcALcCEm076I6CRH+lyl5AGAF+HhCUs7rTWbN02LUhAsU6KmbBWJCpsrmYsF8u4RM7jRf8aeS6xKHi3g0VnZjNQ=="
//       ]
//     },
//     "rawTransaction": "AQAAAAAABQEBpa3n39008mUrCxuY9ii3bpMB3m9pA4zIUoPXLwrcz4m/vtkAAAAAAAABAQVu6G0Jv3aBaDlOdrITfPVnyZ6+Q7tYINgXzCE7n6DN+OcaAQAAAAABAQDsBqnr6GYoEnGh2d0FR8q5/hYPAsWZ406LM/kCkBfjmZBBIAEAAAAAIAr7R8pdoM+gl/BA7H38ga8il8/patcfTYsIpLfJGjjeAQFg2K21bKeC+SAjCdBNvBveKJ8PCNTTr0CwdTNZvVkDsr++2QAAAAAAAQEBAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAYBAAAAAAAAAAABAGQdq+5cla0hbOVMcoLhpO82JC2BxmQxVm+O/GvcL+2iC3Bvb2xfc2NyaXB0DmNvbGxlY3RfcmV3YXJkAwdNiSzszRSXub53AeCdUcWAvIPyLJyXBQghs3OnfQ2angR1c2R0BFVTRFQAB02JLOzNFJe5vncB4J1RxYC8g/IsnJcFCCGzc6d9DZqeBHVzZGMEVVNEQwAHFzAqV3qZAg+TMC0saUnlsHgZmt7ht9pWXseeXUVS3H0FY2V0dXMFQ0VUVVMABQEAAAEBAAECAAEDAAEEAGYOprwQ8tbC1AuCmFCrdGpq2TwmdFN8ceIYCbBIYlTGAT/vz1Ewx/Q4E5G99G7YkP+oK+ZkxuBVlRMVwYh+tp8akEEgAQAAAAAgsTJXnLnaoNG0dzz7VXyX4ia8Ak7BkMoDz3QLTQI7pFBmDqa8EPLWwtQLgphQq3Rqatk8JnRTfHHiGAmwSGJUxugDAAAAAAAAAMqaOwAAAAAAAWEA5MnJiW3VSPI4uWDBYWhsw2UzXo6x2QU1vXlozqnn5FFwAtwISbTvojoJEf6XKXkAYAX4eEJSzutNZs3TYtSECxToqZsFYkKmyuZiwXy7hEzuNF/xp5LrEoeLeDRWdmM1",
//     "effects": {
//       "messageVersion": "v1",
//       "status": {
//         "status": "success"
//       },
//       "executedEpoch": "775",
//       "gasUsed": {
//         "computationCost": "1000000",
//         "storageCost": "22473200",
//         "storageRebate": "20924244",
//         "nonRefundableStorageFee": "211356"
//       },
//       "modifiedAtVersions": [
//         {
//           "objectId": "0x056ee86d09bf768168394e76b2137cf567c99ebe43bb5820d817cc213b9fa0cd",
//           "sequenceNumber": "18891152"
//         },
//         {
//           "objectId": "0x3fefcf5130c7f4381391bdf46ed890ffa82be664c6e055951315c1887eb69f1a",
//           "sequenceNumber": "18891152"
//         },
//         {
//           "objectId": "0x56ee6d613b40389a58d597e753b4b20535129e3c1ef1f2050e7fd4d225a8b8fc",
//           "sequenceNumber": "18891152"
//         },
//         {
//           "objectId": "0x60d8adb56ca782f9202309d04dbc1bde289f0f08d4d3af40b0753359bd5903b2",
//           "sequenceNumber": "18891167"
//         },
//         {
//           "objectId": "0x835bed3fb9c5d5194ec9eac590fbeb8aba70699e41476f688011a13ce71fa1e1",
//           "sequenceNumber": "15752350"
//         },
//         {
//           "objectId": "0xec06a9ebe866281271a1d9dd0547cab9fe160f02c599e34e8b33f9029017e399",
//           "sequenceNumber": "18891152"
//         }
//       ],
//       "sharedObjects": [
//         {
//           "objectId": "0xa5ade7dfdd34f2652b0b1b98f628b76e9301de6f69038cc85283d72f0adccf89",
//           "version": 18540544,
//           "digest": "GozWP2hKxbSpC2ozU3XnnNmvRz5GgEFtSVqZun7Au1Ev"
//         },
//         {
//           "objectId": "0x056ee86d09bf768168394e76b2137cf567c99ebe43bb5820d817cc213b9fa0cd",
//           "version": 18891152,
//           "digest": "97k1cx7WQsZMLeUv1KMSr6sUzsiKDGXhJUQhtwgE8ysK"
//         },
//         {
//           "objectId": "0x60d8adb56ca782f9202309d04dbc1bde289f0f08d4d3af40b0753359bd5903b2",
//           "version": 18891167,
//           "digest": "4ASRWSKyarWnBx9x5kN9P2648Z6J3CPA9HAw5n8xgACc"
//         },
//         {
//           "objectId": "0x0000000000000000000000000000000000000000000000000000000000000006",
//           "version": 2602398,
//           "digest": "AtMx9SWjrUPzW1kkj4s38p6ApaC5RiuCNyGNFa1bMU4j"
//         }
//       ],
//       "transactionDigest": "C6XnvcwaELAVq9Bqk85GyTSrk4ko7tvhiqnRfmrKNN5g",
//       "created": [
//         {
//           "owner": {
//             "AddressOwner": "0x660ea6bc10f2d6c2d40b829850ab746a6ad93c2674537c71e21809b0486254c6"
//           },
//           "reference": {
//             "objectId": "0xdf1a19cf08cf209fe38cd38098e357f2b96812465c30247f447321bca9ed71e1",
//             "version": 18891168,
//             "digest": "3CgihQzw7Av2TqQYdukTNuH1uFEdgpUSnw2SDQrTk33J"
//           }
//         }
//       ],
//       "mutated": [
//         {
//           "owner": {
//             "Shared": {
//               "initial_shared_version": 18540536
//             }
//           },
//           "reference": {
//             "objectId": "0x056ee86d09bf768168394e76b2137cf567c99ebe43bb5820d817cc213b9fa0cd",
//             "version": 18891168,
//             "digest": "7Aw6kVrbGNR2F2NPbButmtTKPV42VeDaaw73UF1a3Tqu"
//           }
//         },
//         {
//           "owner": {
//             "AddressOwner": "0x660ea6bc10f2d6c2d40b829850ab746a6ad93c2674537c71e21809b0486254c6"
//           },
//           "reference": {
//             "objectId": "0x3fefcf5130c7f4381391bdf46ed890ffa82be664c6e055951315c1887eb69f1a",
//             "version": 18891168,
//             "digest": "ADtwd7zyw3ZeZhrNY9qN9k3gzcABFjSK6mbfdXrqSgDe"
//           }
//         },
//         {
//           "owner": {
//             "ObjectOwner": "0xdebde62fb692168489310021d4d1887fa7dd58b570aa5b2aad3e9f68eed5309e"
//           },
//           "reference": {
//             "objectId": "0x56ee6d613b40389a58d597e753b4b20535129e3c1ef1f2050e7fd4d225a8b8fc",
//             "version": 18891168,
//             "digest": "G492oyEucPNuMrf6qLjgfrcXTJfHEgBfRmi2SjtPyzG7"
//           }
//         },
//         {
//           "owner": {
//             "Shared": {
//               "initial_shared_version": 14270143
//             }
//           },
//           "reference": {
//             "objectId": "0x60d8adb56ca782f9202309d04dbc1bde289f0f08d4d3af40b0753359bd5903b2",
//             "version": 18891168,
//             "digest": "2GVdR5D8bSvCWmod16ArmXvN6TZPSjeYB8qNbrDvttSE"
//           }
//         },
//         {
//           "owner": {
//             "ObjectOwner": "0xc47d482de6f273348dc1f7f34110f987960e1d7c74afe9150c95edd0395375ba"
//           },
//           "reference": {
//             "objectId": "0x835bed3fb9c5d5194ec9eac590fbeb8aba70699e41476f688011a13ce71fa1e1",
//             "version": 18891168,
//             "digest": "BNnMmfJHk46VTda1rHSgm8m3QThopb2iD9rJ1sAZzKVq"
//           }
//         },
//         {
//           "owner": {
//             "AddressOwner": "0x660ea6bc10f2d6c2d40b829850ab746a6ad93c2674537c71e21809b0486254c6"
//           },
//           "reference": {
//             "objectId": "0xec06a9ebe866281271a1d9dd0547cab9fe160f02c599e34e8b33f9029017e399",
//             "version": 18891168,
//             "digest": "6jYXTQ7Jv4xKUnixsB6uUP9CVK7r3Q8cpqQVxZiPC7gW"
//           }
//         }
//       ],
//       "gasObject": {
//         "owner": {
//           "AddressOwner": "0x660ea6bc10f2d6c2d40b829850ab746a6ad93c2674537c71e21809b0486254c6"
//         },
//         "reference": {
//           "objectId": "0x3fefcf5130c7f4381391bdf46ed890ffa82be664c6e055951315c1887eb69f1a",
//           "version": 18891168,
//           "digest": "ADtwd7zyw3ZeZhrNY9qN9k3gzcABFjSK6mbfdXrqSgDe"
//         }
//       },
//       "eventsDigest": "H615gDByLso2T9EV4G3QDDDvjSiWHXu8GSVYMYrRP6r2",
//       "dependencies": [
//         "4EbaEH1ufP6tPUTfG5gDNGMepcvDtZ8rBjFNmWUMV4Bc",
//         "8DaJVgkLe4kJh6fSSx3mewiU5qP12X2ncK3TXaPk5TAb",
//         "8VifrPbQKestopY7sj7rJDWucSpqnWQC6qpKKb8xF3uM",
//         "9Y4KTNyY4483HQ1TFfznWWkGDv1B9iwjvSkguesMK3Lt",
//         "BecKZ4z4ZVsKZNr2bSrjqdZ8UpPgVBpxFYgZbqaiPGWz",
//         "DeKG87HHM8JZS5zNXzcnnE1BtxMMkkXKZayBxKHMLfLh",
//         "E6BfZk7XJgYm7ShUMuQKYjEKccNxf5HRZRf33fQMoko7"
//       ]
//     },
//     "events": [
//       {
//         "id": {
//           "txDigest": "C6XnvcwaELAVq9Bqk85GyTSrk4ko7tvhiqnRfmrKNN5g",
//           "eventSeq": "0"
//         },
//         "packageId": "0x641dabee5c95ad216ce54c7282e1a4ef36242d81c66431566f8efc6bdc2feda2",
//         "transactionModule": "pool_script",
//         "sender": "0x660ea6bc10f2d6c2d40b829850ab746a6ad93c2674537c71e21809b0486254c6",
//         "type": "0xf42bb3557dd14849e869e5668bcad98c6199aa9821a0c8aa12b04b42a3a7ee1e::pool::CollectRewardEvent",
//         "parsedJson": {
//           "amount": "22288580",
//           "pool": "0x056ee86d09bf768168394e76b2137cf567c99ebe43bb5820d817cc213b9fa0cd",
//           "position": "0xec06a9ebe866281271a1d9dd0547cab9fe160f02c599e34e8b33f9029017e399"
//         },
//         "bcs": "4V4XXQH6zyCKdxSpP5PBqtJjSivZE14ZNcbtGheu6PuSVF94BxCy4aV4j3rYTBwMYdoyHracLDVuxbc8ZxLcYgtjVKZpqSuDU9d"
//       }
//     ],
//     "balanceChanges": [
//       {
//         "owner": {
//           "AddressOwner": "0x660ea6bc10f2d6c2d40b829850ab746a6ad93c2674537c71e21809b0486254c6"
//         },
//         "coinType": "0x2::sui::SUI",
//         "amount": "-2548956"
//       },
//       {
//         "owner": {
//           "AddressOwner": "0x660ea6bc10f2d6c2d40b829850ab746a6ad93c2674537c71e21809b0486254c6"
//         },
//         "coinType": "0x17302a577a99020f93302d2c6949e5b078199adee1b7da565ec79e5d4552dc7d::cetus::CETUS",
//         "amount": "22288580"
//       }
//     ],
//     "timestampMs": "1683031051964",
//     "checkpoint": "2602665"
//   },
//   "id": 1
// }