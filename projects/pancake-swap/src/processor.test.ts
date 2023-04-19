import { TestProcessorServer } from '@sentio/sdk/testing'
import { AptosNetwork } from "@sentio/sdk/aptos";

describe('Test Processor', () => {
  const service = new TestProcessorServer(() => import('./processor.js'))

  beforeAll(async () => {
    await service.start()
  })

  test('has config', async () => {
    const config = await service.getConfig({})
    expect(config.contractConfigs.length > 0)
  })

  jest.setTimeout(1000000000)
  test('test pancake swap event', async () => {
    const res = await service.aptos.testEvent(testData3 as any, AptosNetwork.MAIN_NET)
})

const testData3 = {"id":"","round":"","previous_block_votes":null,"proposer":"","sender":"0x42d0d78797318cf9ecca2c9419e1d4956200771f1b5f294d531e3b2f12138404","sequence_number":"8","payload":{"type":"entry_function_payload","type_arguments":["0x1::aptos_coin::AptosCoin","0x8c805723ebc0a7fc5b7d3e7b75d567918e806b3461cb9fa21941a9edc0220bf::token::Bun"],"arguments":["1000000","876"],"code":{"bytecode":""},"function":"0xc7efb4076dbe143cbcd98cfaaa929ecfc8f299203dfff63b95ccb6bfe19850fa::router::swap_exact_output"},"max_gas_amount":"17078","gas_unit_price":"100","expiration_timestamp_secs":"1666607703","secondary_signers":null,"signature":{"type":"ed25519_signature","public_key":"0x57280f4101b3235d9063ab738840088582e400849a37aff2e635a93a2b9463df","signature":"0x9f1cfe01976ad87cfded9fae35c8a90ee9f4fd494c6d8c1dc7579108d09f7468b1fa5699e98d1aa73b0da68fcfbc7c20f30d26d95050d78ccff3e8b908b0570a","public_keys":null,"signatures":null,"threshold":0,"bitmap":"","sender":{"type":"","public_key":"","signature":"","public_keys":null,"signatures":null,"threshold":0,"bitmap":""},"secondary_signer_addresses":null,"secondary_signers":null},"type":"user_transaction","timestamp":"1666607683943754","events":[{"version":"10567750","guid":{"creation_number":"7","account_address":"0xc7efb4076dbe143cbcd98cfaaa929ecfc8f299203dfff63b95ccb6bfe19850fa"},"sequence_number":"4","type":"0xc7efb4076dbe143cbcd98cfaaa929ecfc8f299203dfff63b95ccb6bfe19850fa::swap::SwapEvent\u003c0x1::aptos_coin::AptosCoin, 0x8c805723ebc0a7fc5b7d3e7b75d567918e806b3461cb9fa21941a9edc0220bf::token::Bun\u003e","data":{"amount_x_in":"868","amount_x_out":"0","amount_y_in":"0","amount_y_out":"1000000","user":"0x42d0d78797318cf9ecca2c9419e1d4956200771f1b5f294d531e3b2f12138404"}}],"version":"10567750","hash":"0x7a38de17d9f39a1d52df64bd937ef31e133521fc9696eba040141ce5a60ce105","state_root_hash":"","event_root_hash":"0x8667097afa035a1d5ba960e0167181bb803d1720ab911217c6332b3522559fb8","gas_used":"8603","success":true,"vm_status":"Executed successfully","accumulator_root_hash":"0xb617de50c5ef5ca19b3067e3c361a0aef6399f5963df3922ede1e17aecc44a81","changes":null}