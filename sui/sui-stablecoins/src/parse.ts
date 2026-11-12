// import { parseMoveType } from '@sentio/sdk/move'

// const type = parseMoveType(
//   '0x2::coin::TreasuryCap<0xdba34672e30cb065b1f93e3ab55318768fd6fef66c15942c9f7cb846e2f900e7::usdc::USDC>'
// )
// console.log('- type', type)

import { normalizeSuiAddress, normalizeSuiObjectId } from '@mysten/sui/utils'
const raw = 'af8cd5edc19c4512f4259f0bee101a40d41ebed738ade5874359610ef8eeced5::coin::COIN'
const addr = normalizeSuiAddress(raw)
console.log({ addr }, normalizeSuiObjectId(raw))
