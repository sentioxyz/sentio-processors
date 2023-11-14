import { EthChainId } from "@sentio/sdk/eth"


export const CHAINS = [EthChainId.CRONOS, EthChainId.ZKSYNC_ERA]
export const VAULT_ADDRESS_MAP = new Map<EthChainId, string>([
    [EthChainId.CRONOS, "0x8c7ef34aa54210c76d6d5e475f43e0c11f876098"],
    [EthChainId.ZKSYNC_ERA, "0x7d5b0215EF203D0660BC37d5D09d964fd6b55a1E"]
])
export const FUL_ADDRESS_MAP = new Map<EthChainId, string>([
    [EthChainId.CRONOS, "0x83afb1c32e5637acd0a452d87c3249f4a9f0013a"],
    [EthChainId.ZKSYNC_ERA, "0xe593853b4d603d5b8f21036Bb4AD0D1880097a6e"]
])
export const sFUL_ADDRESS_MAP = new Map<EthChainId, string>([
    [EthChainId.CRONOS, "0x2a628916f85caaf21daba223ff2d93aa07816652"],
    [EthChainId.ZKSYNC_ERA, "0x54E710b22D688DF71FDB98571E2066BEE66C45dE"]
])
export const esFUL_ADDRESS_MAP = new Map<EthChainId, string>([
    [EthChainId.CRONOS, "0x09d7c9f284686c27a2caff3f2ff12e5cd3dfe20f"],
    [EthChainId.ZKSYNC_ERA, "0x1886DFA728ed34A1b46dECf7211Cb643a844b982"]
])
export const vFUL_ADDRESS_MAP = new Map<EthChainId, string>([
    [EthChainId.CRONOS, "0xa461fa4bf68c72369db4fa8ed7cba4796598f2b0"],
    [EthChainId.ZKSYNC_ERA, "0x4d9193D87C57c0839157F8EfDE0A6Aa8f4118a33"]
])
export const vFLP_ADDRESS_MAP = new Map<EthChainId, string>([
    [EthChainId.CRONOS, "0x27e51d2b5a3283bef4014519f095ab8ddcf023f6"],
    [EthChainId.ZKSYNC_ERA, "0x2Fb40160020Ca0F87f3D2169e2Af74F0706Ef561"]
])
export const FUL_MANAGER_ADDRESS_MAP = new Map<EthChainId, string>([
    [EthChainId.CRONOS, "0x6148107bcac794d3fc94239b88fa77634983891f"],
    [EthChainId.ZKSYNC_ERA, "0x84DD021B2FCA11ef1bcCADF4231c75989516308b"]
])
export const REWARD_ROUTER_ADDRESS_MAP = new Map<EthChainId, string>([
    [EthChainId.CRONOS, "0x133b7f9570b3be8e51ccd5da4654c3dde7657ae1"],
    [EthChainId.ZKSYNC_ERA, "0x76dF63db845027965b7f2DA9acbD5994F3524c16"]
])
