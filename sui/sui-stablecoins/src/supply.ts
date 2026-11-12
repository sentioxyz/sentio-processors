import { SuiNetwork, SuiObjectProcessor, BUILTIN_TYPES, SuiObjectTypeProcessor } from '@sentio/sdk/sui'
import { coin } from '@sentio/sdk/sui/builtin/0x2'
import { TypeDescriptor, parseMoveType } from '@sentio/sdk/move'
import { getCoinInfoWithFallback } from '@sentio/sdk/sui/ext'
import { START_CHECKPOINT } from './utils.js'

const coinTypes = [
  '0xdba34672e30cb065b1f93e3ab55318768fd6fef66c15942c9f7cb846e2f900e7::usdc::USDC',
  '0x375f70cf2ae4c00bf37117d0c85a2c71545e6ee05c4a5c7d282cd66a4504b068::usdt::USDT',
  '0xe14726c336e81b32328e92afc37345d159f5b550b09fa92bd43640cfdd0a0cfd::usdb::USDB',
  '0xce7ff77a83ea0cb6fd39bd8748e2ec89a3f41e8efdc3f4eb123e0ca37b184db2::buck::BUCK',
  '0x5d4b302506645c37ff133b98c4b50a5ae14841659738d6d733d59d0d217a93bf::coin::COIN',
  '0xf16e6b723f242ec745dfd7634ad072c42d5c1d9ac9d62a39c381303eaa57693a::fdusd::FDUSD',
  '0xc060006111016b8a020ad5b33834984a437aaa7d3c74c18e09a95d48aceab08c::coin::COIN',
  '0x2053d08c1e2bd02791056171aab0fd12bd7cd7efad2ab8f6b9c8902f14df2ff2::ausd::AUSD',
  '0x960b531667636f39e85867775f52f6b1f220a058c4de786905bdf761e06a56bb::usdy::USDY',
  '0x7fd8aba1652c58b6397c799fd375e748e5053145cb7e126d303e0a1545fd1fec::usdz::USDZ'
  // '0xe44df51c0b21a27ab915fa1fe2ca610cd3eaa6d9666fe5e62b988bf7f0bd8722::musd::MUSD'
]

for (const coinType of coinTypes) {
  SuiObjectTypeProcessor.bind({
    objectType: parseMoveType(`0x2::coin::TreasuryCap<${coinType}>`),
    startCheckpoint: START_CHECKPOINT
  }).onTimeInterval(
    async (self, objects, ctx) => {
      const { total_supply } = self.data_decoded
      const info = await getCoinInfoWithFallback(coinType)
      console.log('- type fields', self, objects)
      ctx.eventLogger.emit('supply', {
        symbol: info.symbol,
        amount: BigInt(total_supply.value).scaleDown(info.decimals)
      })
    },
    60 * 12,
    60 * 24
  )
}
