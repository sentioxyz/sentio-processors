import { EthChainId, EthContext } from '@sentio/sdk/eth'
import { token } from '@sentio/sdk/utils'
import { scaleDown } from '@sentio/sdk'

export const network = EthChainId.SONEIUM_MAINNET
export const startBlock = 0
// export const startBlock = 1940000

const tokenMap = new Map<string, token.TokenInfo | undefined>()

export async function getTokenInfo(
  address1: string,
  address2: string,
  ctx: EthContext
): Promise<token.TokenInfo | undefined> {
  if (address1 == '0x0000000000000000000000000000000000000000') {
    return token.NATIVE_ETH
  } else {
    if (!tokenMap.has(address2)) {
      const info = await token.getERC20TokenInfo(ctx, address2)
      tokenMap.set(address2, info)
    }
    return tokenMap.get(address2)
  }
}
