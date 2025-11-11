// import { SouffleChefCampaign, CandyMachine } from './types/aptos/souffle.js'
import { AptosContext, AptosGlobalProcessor, AptosNetwork, AptosResourcesProcessor } from '@sentio/sdk/aptos'
import { coin, fungible_asset } from '@sentio/sdk/aptos/builtin/0x1'
import { getTokenInfoWithFallback, TokenInfo } from '@sentio/sdk/aptos/ext'
import { LRUCache } from 'lru-cache'

const assets = [
  ['Tether USD', 'USDt', '0x357b0b74bc833e95a115ad22604854d6b0fca151cecd94111770e5d6ffc9dc2b'],
  ['USDC', 'USDC', '0xbae207659db88bea0cbead6da0ed00aac12edcdda169e591cd41c94180b46f3b'],
  ['World Liberty Financial USD', 'USD1', '0x05fabd1b12e39967a3c24e91b7b8f67719a6dacee74f3c8b9fb7d93e855437d2'],
  ['AURO USDA', 'USDA', '0x534e4c3dc0f038dab1a8259e89301c4da58779a5d482fb354a41c08147e6b9ec'],
  ['Ondo US Dollar Yield', 'USDY', '0xf0876baf6f8c37723f0e9d9c1bbad1ccb49324c228bcc906e2f1f5a9e139eda1'],
  ['USD Coin (LayerZero)', 'lzUSDC', '0x2b3be0a97a73c87ff62cbdd36837a9fb5bbd1d7f06a73b7ed62ec15c5326c1b8'],
  ['Tether USD (Wormhole)', 'whUSDT', '0x6704464238d73a679486420aab91a8a2a01feb9d700e8ba3332aa3e41d3eab62'],
  ['Tether USD (LayerZero)', 'lzUSDT', '0xe568e9322107a5c9ba4cbd05a630a5586aa73e744ada246c3efb0f4ce3e295f3'],
  ['USD Coin (Wormhole)', 'whUSDC', '0x54fc0d5fa5ad975ede1bf8b1c892ae018745a1afd4a4da9b70bb6e5448509fc0'],
  ['USD Coin (Celer)', 'ceUSDC', '0xf92047adba5ec4a21ad076b19a0c8806b195435696d30dc3f43781d1e6d91563'],
  ['Tether USD (Celer)', 'ceUSDT', '0xc448a48da1ed6f6f378bb82ece996be8b5fc8dd1ea851ea2c023de17714dd747']
]

// const address = '0xbae207659db88bea0cbead6da0ed00aac12edcdda169e591cd41c94180b46f3b'
// coins.forEach(([, , address]) => {
AptosResourcesProcessor.bind({
  network: AptosNetwork.MAIN_NET,
  address: '0xbae207659db88bea0cbead6da0ed00aac12edcdda169e591cd41c94180b46f3b'
  // startVersion: 3722500000
  // endVersion: 3722543947
})
  // fungible_asset
  //   .bind({
  //     network: AptosNetwork.MAIN_NET,
  //     startVersion: 1
  //   })
  .onTimeInterval(
    // AptosGlobalProcessor.bind({
    //   network: AptosNetwork.MAIN_NET,
    //   address: '*'
    // }).onTimeInterval(
    async (resources, ctx) => {
      console.log('-- resources', resources)
      const concurrentSupply = resources.find((x) => x.type == '0x1::fungible_asset::ConcurrentSupply')
      const amount = (concurrentSupply?.data as any).current.value
      if (!amount) {
        console.error('supply amount not found')
      }
      console.log('- amount', amount)
      ctx.eventLogger.emit('supply', { amount })
      // const client = ctx.getClient()
      // for (const [, , asset] of assets) {
      //   console.log('asset', asset)
      //   try {
      //     const meta = await client.getFungibleAssetMetadataByAssetType({
      //       assetType: asset
      //     })
      //     const { symbol, decimals, supply_v2 } = meta
      //     ctx.eventLogger.emit('supply', {
      //       asset,
      //       symbol,
      //       amount: supply_v2.scaleDown(decimals)
      //     })
      //   } catch (e) {
      //     console.error(e)
      //   }
      // }
    },
    60 * 6,
    // 1,
    60 * 24
  )
// .onEventDeposit(
//   async (evt, ctx) => {
//     return handleBalanceChange('deposit', evt, ctx)
//   },
//   undefined,
//   { eventAccount: address }
// )
// .onEventWithdraw(
//   async (evt, ctx) => {
//     return handleBalanceChange('withdraw', evt, ctx)
//   },
//   undefined,
//   { eventAccount: address }
// )
// })

const tokenCache = new LRUCache<string, TokenInfo>({
  max: 100_000
})

interface ObjectInfo {
  owner: string
  fungibleAsset: string
}

const objectCache = new LRUCache<string, ObjectInfo>({
  max: 100_000
})

async function getTokenInfo(address: string) {
  let info = tokenCache.get(address)
  if (!info) {
    try {
      info = await getTokenInfoWithFallback(address)
      tokenCache.set(address, info)
    } catch (e) {
      console.error(e)
    }
  }
  return info
}

async function getObjectInfo(ctx: AptosContext, address: string) {
  let info = objectCache.get(address)
  if (!info) {
    try {
      const client = ctx.getClient()
      const [objectData, resource] = await Promise.all([
        {} as any,
        // client.getObjectDataByObjectAddress({
        //   objectAddress: address
        // }),
        client.getTypedAccountResource({
          accountAddress: normalizeAddress(address),
          resourceType: fungible_asset.FungibleStore.type()
        })
      ])
      info = {
        owner: objectData.owner_address,
        fungibleAsset: resource.metadata
      }
      objectCache.set(address, info)
    } catch (e) {
      console.error(e)
    }
  }
  return info
}

function normalizeAddress(address: string) {
  return '0x' + (address.startsWith('0x') ? address.slice(2) : address).padStart(64, '0')
}

async function handleBalanceChange(
  type: string,
  evt: fungible_asset.DepositInstance | fungible_asset.WithdrawInstance,
  ctx: AptosContext
) {
  const { amount, store } = evt.data_decoded
  // const objectInfo = await getObjectInfo(ctx, store)
  // if (!objectInfo) {
  //   console.error('failed to get object info', store)
  //   return
  // }
  // const tokenInfo = await getTokenInfo(objectInfo.fungibleAsset)
  const tokenInfo = await getTokenInfo(ctx.address)

  ctx.eventLogger.emit(type, {
    distinctId: ctx.transaction.sender,
    store,
    // owner: objectInfo.owner,
    // asset: objectInfo.fungibleAsset,
    asset: ctx.address,
    symbol: tokenInfo?.symbol,
    amount: tokenInfo?.decimals ? amount.scaleDown(tokenInfo.decimals) : amount
  })
}
