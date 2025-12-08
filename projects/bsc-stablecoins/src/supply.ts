import { ERC20Processor } from '@sentio/sdk/eth/builtin'
import { network, START_BLOCK } from './utils.js'
import { token } from '@sentio/sdk/utils'

const tokens = [
  ['Binance-Peg BSC-USD', 'BSC-USD', '0x55d398326f99059ff775485246999027b3197955'],
  ['Binance-Peg USD Coin', 'USDC', '0x8ac76a51cc950d9822d68b83fe1ad97b32cd580d'],
  ['USDC', 'anyUSDC', '0x8965349fb649a33a30cbfda057d8ec2c48abe2a2'],
  ['USDe', 'USDe', '0x5d3a1Ff2b6BAb83b63cd9AD0787074081a52ef34'],
  ['Usual USD', 'USD0', '0x758a3e0b1f842c9306b783f8a4078c6c8c03a270'],
  ['Decentralized USD', 'USDD', '0x45E51bc23D592EB2DBA86da3985299f7895d66Ba'],
  ['Decentralized USD', 'USDD', '0x392004BEe213F1FF580C867359C246924f21E6Ad'],
  ['TrueUSD', 'TUSD', '0x40af3827F39D0EAcBF4A168f8D4ee67c121D11c9'],
  ['Curve.fi USD Stablecoin', 'crvUSD', '0xe2fb3F127f5450DeE44afe054385d74C392BdeF4'],
  // ['Venus USDT', 'vUSDT', '0xfd5840cd36d94d7229439859c0112a4185bc0255'],
  ['AUSD', 'AUSD', '0x00000000efe302beaa2b3e6e1b18d08d69a9012a'],
  ['Astherus USDF', 'USDF', '0x5a110fc00474038f6c02e89c707d638602ea44b5'],
  ['Frax USD', 'frxUSD', '0xFb9bbE14d8a751725C9348AE72e8DFe68fa109F1'],
  ['Frax USD', 'frxUSD', '0x80eede496655fb9047dd39d9f418d5483ed600df'],
  // ['Venus USDC', 'vUSDC', '0xeca88125a5adbe82614ffc12d0db554e2e2867c8'],
  // ['Venus BUSD', 'vBUSD', '0x95c78222b3d6e262426483d42cfa53685a67ab9d'],
  ['Binance-Peg Pax Dollar Token', 'USDP', '0xb3c11196a4f3b1da7c23d9fb0a3dde9c6340934f'],
  ['Binance-Peg BUSD Token', 'BUSD', '0xe9e7cea3dedca5984780bafc599bd69add087d56'],
  ['USD+', 'USD+', '0xe80772eaf6e2e18b651f160bc9158b2a5cafca65'],
  ['XUSD', 'XUSD', '0xf81ac2e1a0373dde1bce01e2fe694a9b7e3bfcb9'],
  ['Ondo U.S. Dollar Token', 'USDon', '0x1f8955e640cbd9abc3c3bb408c9e2e1f5f20dfe6'],
  // ['USDX', 'USDX', '0xf3527ef8dE265eAa3716FB312c12847bFBA66Cef'],
  ['Lista USD', 'lisUSD', '0x0782b6d8c4551B9760e74c0545a9bCD90bdc41E5'],
  ['Astherus asUSDF', 'asUSDF', '0x917af46b3c3c6e1bb7286b9f59637fb7c65851fb'],
]

tokens.forEach(([, , address]) => {
  ERC20Processor.bind({ network, address, startBlock: START_BLOCK }).onTimeInterval(
    async (block, ctx) => {
      const supply = await ctx.contract.totalSupply()
      const { decimal, symbol } = await token.getERC20TokenInfo(ctx, address)
      ctx.eventLogger.emit('supply', {
        symbol,
        amount: BigInt(supply).scaleDown(decimal),
      })
    },
    60 * 12,
    60 * 24,
  )
})
