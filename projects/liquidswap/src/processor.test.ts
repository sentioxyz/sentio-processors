import { TestProcessorServer } from '@sentio/sdk/lib/testing'
import { TextEncoder } from "util";
import { HandlerType } from "@sentio/sdk";

describe('Test Processor', () => {
  const service = new TestProcessorServer(() => require('./processor'))

  beforeAll(async () => {
    await service.start()
  })

  test('has config', async () => {
    const config = await service.getConfig({})
    expect(config.contractConfigs.length > 0)
  })

  test('test event', async () => {
    const res = await service.processBindings({
      bindings: [
        {
          data: {
            raw: new TextEncoder().encode(JSON.stringify(testData2)),
          },
          handlerId: 1,
          handlerType: HandlerType.APT_EVENT
        }
      ]
    })
    console.log(res)
  })
})


const testData = {"id":"","round":"","previous_block_votes":null,"proposer":"","sender":"0x43b697337ce0b655d6c66e4b677f63bd50b49710e3ec28714cf23d3d5e78c61d","sequence_number":"7","payload":{"type":"entry_function_payload","type_arguments":["0x5e156f1207d0ebfa19a9eeff00d62a282278fb8719f4fab3a586a0a2c0fffbea::coin::T","0x1::aptos_coin::AptosCoin","0x190d44266241744264b964a37b8f09863167a12d3e70cda39376cfb4e3561e12::curves::Uncorrelated"],"arguments":["68504157","68161636","980000000","975100000"],"code":{"bytecode":""},"function":"0x190d44266241744264b964a37b8f09863167a12d3e70cda39376cfb4e3561e12::scripts::add_liquidity"},"max_gas_amount":"6234","gas_unit_price":"100","expiration_timestamp_secs":"1666153986","secondary_signers":null,"signature":{"type":"ed25519_signature","public_key":"0xf9c6fa896becbe155daaeea3c77ac5dffdda03b9e0407cc6dc858a09f6bd33c6","signature":"0x9f572e2c96434805752bd9388200730e509c11d662eba7f2858d09a8a5cd62dda0fd2354bced7985038acfa4122e71812fbd09f10b02dab0e3d7556e3c193e0c","public_keys":null,"signatures":null,"threshold":0,"bitmap":"","sender":{"type":"","public_key":"","signature":"","public_keys":null,"signatures":null,"threshold":0,"bitmap":""},"secondary_signer_addresses":null,"secondary_signers":null},"type":"user_transaction","timestamp":"1666153966972483","events":[{"version":"2573574","guid":{"creation_number":"17","account_address":"0x5a97986a9d031c4567e15b797be516910cfcb4156312482efc6a19c0a30c948"},"sequence_number":"1","type":"0x190d44266241744264b964a37b8f09863167a12d3e70cda39376cfb4e3561e12::liquidity_pool::LiquidityAddedEvent\u003c0x5e156f1207d0ebfa19a9eeff00d62a282278fb8719f4fab3a586a0a2c0fffbea::coin::T, 0x1::aptos_coin::AptosCoin, 0x190d44266241744264b964a37b8f09863167a12d3e70cda39376cfb4e3561e12::curves::Uncorrelated\u003e","data":{"added_x_val":"68504157","added_y_val":"979804281","lp_tokens_received":"259076356"}}],"version":"2573574","hash":"0x6913fca129f7bcfb7fa52e86ff101854a987f9cd1a3b75f07c15722be4d91669","state_root_hash":"","event_root_hash":"0x0d99feed96a3e54e6c94a6871bf130ddd96abff30eac93c431ae60015cb4b5d9","gas_used":"3214","success":true,"vm_status":"Executed successfully","accumulator_root_hash":"0x3bf3a325bb18714a6981120c5cae41bca55cfd22427f027467428471a401ed95","changes":null}

const testData2 =  {"id":"","round":"","previous_block_votes":null,"proposer":"","sender":"0x3a31e71e4224f3cafa0a98ffc0cd80228c404f6e210dc4926b956fea22f5344d","sequence_number":"5","payload":{"type":"entry_function_payload","type_arguments":["0x1::aptos_coin::AptosCoin","0x7a9f7218b777537bdb7aa8d540c5b3357f191f4fcc5b9f0de191c0b715613d92::liangxi::LiangxiFans","0x190d44266241744264b964a37b8f09863167a12d3e70cda39376cfb4e3561e12::curves::Uncorrelated"],"arguments":["189000000000","188055000000","9000000000000000","8955000000000000"],"code":{"bytecode":""},"function":"0x190d44266241744264b964a37b8f09863167a12d3e70cda39376cfb4e3561e12::scripts::register_pool_and_add_liquidity"},"max_gas_amount":"9500","gas_unit_price":"100","expiration_timestamp_secs":"1666201191863","secondary_signers":null,"signature":{"type":"ed25519_signature","public_key":"0xd963ccbca38577b14302b91a3e423de029d3e7943f8c44d59f5529eb31967a42","signature":"0x6dc48aeee15e414b869156f183328b34c69d0f1f0937a554ad848d197cdcc632112036fa11282c9b0f9e6075b21be2218b0f754bd574ad4efb92a1659d8e8501","public_keys":null,"signatures":null,"threshold":0,"bitmap":"","sender":{"type":"","public_key":"","signature":"","public_keys":null,"signatures":null,"threshold":0,"bitmap":""},"secondary_signer_addresses":null,"secondary_signers":null},"type":"user_transaction","timestamp":"1666201197880084","events":[{"version":"4058308","guid":{"creation_number":"523","account_address":"0x5a97986a9d031c4567e15b797be516910cfcb4156312482efc6a19c0a30c948"},"sequence_number":"0","type":"0x190d44266241744264b964a37b8f09863167a12d3e70cda39376cfb4e3561e12::liquidity_pool::LiquidityAddedEvent\u003c0x1::aptos_coin::AptosCoin, 0x7a9f7218b777537bdb7aa8d540c5b3357f191f4fcc5b9f0de191c0b715613d92::liangxi::LiangxiFans, 0x190d44266241744264b964a37b8f09863167a12d3e70cda39376cfb4e3561e12::curves::Uncorrelated\u003e","data":{"added_x_val":"189000000000","added_y_val":"9000000000000000","lp_tokens_received":"41243181253602"}}],"version":"4058308","hash":"0x0af0c725843735624819f33414751c97e40075ddeab46286b8f944d1252244e9","state_root_hash":"","event_root_hash":"0x874a0706f23d7d07a76aa850e445a46ac244b9817c9f6c1731d37e3f8593aefe","gas_used":"7526","success":true,"vm_status":"Executed successfully","accumulator_root_hash":"0x104e3d252689732eefc09fe55fd6e5eb8b7eb118438d0c2eb75bb13ea5df2807","changes":null}