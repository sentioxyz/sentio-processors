import assert from 'assert'
import { TestProcessorServer } from '@sentio/sdk/testing'
import { before, describe, test } from 'node:test'
import { expect } from 'chai'
import { HandlerType } from '@sentio/sdk'

describe('Test Processor', () => {
  const service = new TestProcessorServer(() => import('./processor.js'))

  before(async () => {
    await service.start()
  })

  test('has config', async () => {
    const config = await service.getConfig({})
    assert(config.contractConfigs.length > 0)
  })

  test('test event', async () => {
    const res = await service.processBindings({
      bindings: [
        {
          data: {
            aptEvent: {
              transaction: {
                ...testData3,
                events: [testData3.events[0]]
              }
            }
          },
          handlerIds: [0],
          handlerType: HandlerType.APT_EVENT
        }
      ]
    })
    console.log(res)
  })
})

const testData = {
  id: '',
  round: '',
  previous_block_votes: null,
  proposer: '',
  sender: '0x43b697337ce0b655d6c66e4b677f63bd50b49710e3ec28714cf23d3d5e78c61d',
  sequence_number: '7',
  payload: {
    type: 'entry_function_payload',
    type_arguments: [
      '0x5e156f1207d0ebfa19a9eeff00d62a282278fb8719f4fab3a586a0a2c0fffbea::coin::T',
      '0x1::aptos_coin::AptosCoin',
      '0x190d44266241744264b964a37b8f09863167a12d3e70cda39376cfb4e3561e12::curves::Uncorrelated'
    ],
    arguments: ['68504157', '68161636', '980000000', '975100000'],
    code: { bytecode: '' },
    function: '0x190d44266241744264b964a37b8f09863167a12d3e70cda39376cfb4e3561e12::scripts::add_liquidity'
  },
  max_gas_amount: '6234',
  gas_unit_price: '100',
  expiration_timestamp_secs: '1666153986',
  secondary_signers: null,
  signature: {
    type: 'ed25519_signature',
    public_key: '0xf9c6fa896becbe155daaeea3c77ac5dffdda03b9e0407cc6dc858a09f6bd33c6',
    signature:
      '0x9f572e2c96434805752bd9388200730e509c11d662eba7f2858d09a8a5cd62dda0fd2354bced7985038acfa4122e71812fbd09f10b02dab0e3d7556e3c193e0c',
    public_keys: null,
    signatures: null,
    threshold: 0,
    bitmap: '',
    sender: { type: '', public_key: '', signature: '', public_keys: null, signatures: null, threshold: 0, bitmap: '' },
    secondary_signer_addresses: null,
    secondary_signers: null
  },
  type: 'user_transaction',
  timestamp: '1666153966972483',
  events: [
    {
      version: '2573574',
      guid: {
        creation_number: '17',
        account_address: '0x5a97986a9d031c4567e15b797be516910cfcb4156312482efc6a19c0a30c948'
      },
      sequence_number: '1',
      type: '0x190d44266241744264b964a37b8f09863167a12d3e70cda39376cfb4e3561e12::liquidity_pool::LiquidityAddedEvent\u003c0x5e156f1207d0ebfa19a9eeff00d62a282278fb8719f4fab3a586a0a2c0fffbea::coin::T, 0x1::aptos_coin::AptosCoin, 0x190d44266241744264b964a37b8f09863167a12d3e70cda39376cfb4e3561e12::curves::Uncorrelated\u003e',
      data: { added_x_val: '68504157', added_y_val: '979804281', lp_tokens_received: '259076356' }
    }
  ],
  version: '2573574',
  hash: '0x6913fca129f7bcfb7fa52e86ff101854a987f9cd1a3b75f07c15722be4d91669',
  state_root_hash: '',
  event_root_hash: '0x0d99feed96a3e54e6c94a6871bf130ddd96abff30eac93c431ae60015cb4b5d9',
  gas_used: '3214',
  success: true,
  vm_status: 'Executed successfully',
  accumulator_root_hash: '0x3bf3a325bb18714a6981120c5cae41bca55cfd22427f027467428471a401ed95',
  changes: null
}

const testData3 = {
  id: '',
  round: '',
  previous_block_votes: null,
  proposer: '',
  sender: '0xdad81b9d47bd5f2f9b024a2d852198295d4c8e550b4a949061d0e387fbc6fa84',
  sequence_number: '3',
  payload: {
    type: 'entry_function_payload',
    type_arguments: [
      '0xdad81b9d47bd5f2f9b024a2d852198295d4c8e550b4a949061d0e387fbc6fa84::swan::Swan',
      '0x1::aptos_coin::AptosCoin',
      '0x190d44266241744264b964a37b8f09863167a12d3e70cda39376cfb4e3561e12::curves::Uncorrelated'
    ],
    arguments: ['900000000000', '891000000000', '21856081091', '21637520280'],
    code: { bytecode: '' },
    function:
      '0x190d44266241744264b964a37b8f09863167a12d3e70cda39376cfb4e3561e12::scripts_v2::register_pool_and_add_liquidity'
  },
  max_gas_amount: '10000',
  gas_unit_price: '100',
  expiration_timestamp_secs: '1666710851',
  secondary_signers: null,
  signature: {
    type: 'ed25519_signature',
    public_key: '0xe7450169ccde8b16a18935e33a1877c82f47110c7ceea393dc048c6b6b1d1ea7',
    signature:
      '0xe861592a34d4c7bf63cf12e448074f7d4078d8b4180c76c3b14fd17f888279e902146628db0f121e51a0c436d3000055d54efa38237f4c38ba2aa67ceb0a0f09',
    public_keys: null,
    signatures: null,
    threshold: 0,
    bitmap: '',
    sender: { type: '', public_key: '', signature: '', public_keys: null, signatures: null, threshold: 0, bitmap: '' },
    secondary_signer_addresses: null,
    secondary_signers: null
  },
  type: 'user_transaction',
  timestamp: '1666710252100813',
  events: [
    {
      version: '12407243',
      guid: {
        creation_number: '15108',
        account_address: '0x5a97986a9d031c4567e15b797be516910cfcb4156312482efc6a19c0a30c948'
      },
      sequence_number: '0',
      type: '0x190d44266241744264b964a37b8f09863167a12d3e70cda39376cfb4e3561e12::liquidity_pool::PoolCreatedEvent\u003c0xdad81b9d47bd5f2f9b024a2d852198295d4c8e550b4a949061d0e387fbc6fa84::swan::Swan, 0x1::aptos_coin::AptosCoin, 0x190d44266241744264b964a37b8f09863167a12d3e70cda39376cfb4e3561e12::curves::Uncorrelated\u003e',
      data: { creator: '0xdad81b9d47bd5f2f9b024a2d852198295d4c8e550b4a949061d0e387fbc6fa84' }
    }
  ],
  version: '12407243',
  hash: '0x91a6f0b7021490108bbfb6530640628dd210b94af4baadbbae4c0d3fdc9360f9',
  state_root_hash: '',
  event_root_hash: '0x23edb3bd8cd5bec6da01e1fed983bffad0cd55a7ce7a85d217ff76bb2cab27d7',
  gas_used: '7499',
  success: true,
  vm_status: 'Executed successfully',
  accumulator_root_hash: '0x8b9401e9bd33300fe53eae0cc6c1cc87b0c4eb6bab08bb701b91a91292610cb9',
  changes: null
}

const testData2 = {
  id: '',
  round: '',
  previous_block_votes: null,
  proposer: '',
  sender: '0x3a31e71e4224f3cafa0a98ffc0cd80228c404f6e210dc4926b956fea22f5344d',
  sequence_number: '13',
  payload: {
    type: 'entry_function_payload',
    type_arguments: [
      '0x1::aptos_coin::AptosCoin',
      '0x96aed04e1c823431a1f68ff910c4ca8ed395bd7d9e03b9fab7461a7793f4a3c9::xfc::XENFuckCoin',
      '0x190d44266241744264b964a37b8f09863167a12d3e70cda39376cfb4e3561e12::curves::Uncorrelated'
    ],
    arguments: ['190000000000', '189050000000', '9000000000', '8955000000'],
    code: { bytecode: '' },
    function:
      '0x190d44266241744264b964a37b8f09863167a12d3e70cda39376cfb4e3561e12::scripts::register_pool_and_add_liquidity'
  },
  max_gas_amount: '9500',
  gas_unit_price: '100',
  expiration_timestamp_secs: '1666204440398',
  secondary_signers: null,
  signature: {
    type: 'ed25519_signature',
    public_key: '0xd963ccbca38577b14302b91a3e423de029d3e7943f8c44d59f5529eb31967a42',
    signature:
      '0xa631e0b4885704c965988add7d5fd4620c0e82d6e966d59c9bb7da307c49af0e27f2757e2d8a62c54a0eac0256cfe32ba4fa1cd8c14708c7b80d8d1d4087f60e',
    public_keys: null,
    signatures: null,
    threshold: 0,
    bitmap: '',
    sender: { type: '', public_key: '', signature: '', public_keys: null, signatures: null, threshold: 0, bitmap: '' },
    secondary_signer_addresses: null,
    secondary_signers: null
  },
  type: 'user_transaction',
  timestamp: '1666204448770854',
  events: [
    {
      version: '4163732',
      guid: {
        creation_number: '688',
        account_address: '0x5a97986a9d031c4567e15b797be516910cfcb4156312482efc6a19c0a30c948'
      },
      sequence_number: '0',
      type: '0x190d44266241744264b964a37b8f09863167a12d3e70cda39376cfb4e3561e12::liquidity_pool::LiquidityAddedEvent\u003c0x1::aptos_coin::AptosCoin, 0x96aed04e1c823431a1f68ff910c4ca8ed395bd7d9e03b9fab7461a7793f4a3c9::xfc::XENFuckCoin, 0x190d44266241744264b964a37b8f09863167a12d3e70cda39376cfb4e3561e12::curves::Uncorrelated\u003e',
      data: { added_x_val: '190000000000', added_y_val: '9000000000', lp_tokens_received: '41352145256' }
    }
  ],
  version: '4163732',
  hash: '0x4de35197f721e9be9a295daaa67a5d1b4d7336b0a0d6defb0bc4a87a308a7835',
  state_root_hash: '',
  event_root_hash: '0xcf50f015acadd78bf7cd02006ca31fed1b209c99d9d986ca9bc0911d037b54b4',
  gas_used: '7469',
  success: true,
  vm_status: 'Executed successfully',
  accumulator_root_hash: '0x3f46004ff4d0dcef080c33ab90293f840997a7cd92d2f532da76c4330d701dd7',
  changes: null
}
