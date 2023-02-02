// import { TestProcessorServer } from '@sentio/sdk/lib/testing'
// import { TextEncoder } from "util";
// import { HandlerType } from "@sentio/sdk";
//
// describe('Test Processor', () => {
//   const service = new TestProcessorServer(() => require('./processor'))
//
//   beforeAll(async () => {
//     await service.start()
//   })
//
//   test('has config', async () => {
//     const config = await service.getConfig({})
//     expect(config.contractConfigs.length > 0)
//   })
//
//   jest.setTimeout(1000000000)
//   test('test aux event', async () => {
//     const res = await service.processBindings({
//       bindings: [
//         {
//           data: {
//             raw: new TextEncoder().encode(JSON.stringify({
//               ...testData3,
//               events: [testData3.events[0]]
//             })),
//           },
//           handlerIds: [0],
//           handlerType: HandlerType.APT_EVENT
//         }
//       ]
//     })
//     console.log(res)
//   })
// })
//
// const testData3 = {"id":"","round":"","previous_block_votes":null,"proposer":"","sender":"0xac9a1a5282647e9d327e17d2dbabe29727aae3131c8e2e91128f14f04c867eb5","sequence_number":"323","payload":{"type":"entry_function_payload","type_arguments":["0x1::aptos_coin::AptosCoin","0x5e156f1207d0ebfa19a9eeff00d62a282278fb8719f4fab3a586a0a2c0fffbea::coin::T","0xcc8a89c8dce9693d354449f1f73e60e14e347417854f029db5bc8e7454008abb::coin::T","0x190d44266241744264b964a37b8f09863167a12d3e70cda39376cfb4e3561e12::curves::Uncorrelated","0x190d44266241744264b964a37b8f09863167a12d3e70cda39376cfb4e3561e12::curves::Uncorrelated","0x190d44266241744264b964a37b8f09863167a12d3e70cda39376cfb4e3561e12::curves::Uncorrelated"],"arguments":["0","2","0","461741058","461741058"],"code":{"bytecode":""},"function":"0x8150d1f99683d92ce5b9eff5251705dd65988efdafa7e9bf8a3044b339d2ddb1::motherfucker::fuck_your_sister"},"max_gas_amount":"300000","gas_unit_price":"101","expiration_timestamp_secs":"1666177876","secondary_signers":null,"signature":{"type":"ed25519_signature","public_key":"0x639554cc2f3ad8270ca42524adb8abbe2deaf89e10ed0a4e339540c35ba4b610","signature":"0x34e657f3682eae0f0270ae40155db2cebaa3a8b82485bd33a317734cf1cde28d50c12561ab4305dcf4412d74db5e44596c89b0aca6b3d1f17b30f002e6001707","public_keys":null,"signatures":null,"threshold":0,"bitmap":"","sender":{"type":"","public_key":"","signature":"","public_keys":null,"signatures":null,"threshold":0,"bitmap":""},"secondary_signer_addresses":null,"secondary_signers":null},"type":"user_transaction","timestamp":"1666177854750412","events":[{"version":"3201314","guid":{"creation_number":"50","account_address":"0xbd35135844473187163ca197ca93b2ab014370587bb0ed3befff9e902d6bb541"},"sequence_number":"8","type":"0xbd35135844473187163ca197ca93b2ab014370587bb0ed3befff9e902d6bb541::amm::SwapEvent","data":{"fee_bps":"10","in_au":"36709053","in_coin_type":"0x5e156f1207d0ebfa19a9eeff00d62a282278fb8719f4fab3a586a0a2c0fffbea::coin::T","in_reserve":"500648598010","out_au":"2807833","out_coin_type":"0xcc8a89c8dce9693d354449f1f73e60e14e347417854f029db5bc8e7454008abb::coin::T","out_reserve":"38335178594","sender_addr":"0x80339356875e468100c8513231c3c9f43ecc91a5e18241d293fbdb08cd5cf7be","timestamp":"1666177854750412"}}],"version":"3201314","hash":"0xea36dfa7148182fff57b9d8dc600c0712bd1aca9430d2478c2eab0e4e0d3c690","state_root_hash":"","event_root_hash":"0x4444528b4139fab5067b67cf5f4bd082961954705359ca3289d0bb122dc75c38","gas_used":"10155","success":true,"vm_status":"Executed successfully","accumulator_root_hash":"0xa8ac1213482d90b11819aa4892941c2c51bf40c5e9a737374787ca150c6aee65","changes":null}