//TODO handles new token additions automatically
export const WhitelistTokenMap: { [address: string]: { symbol: string, decimal: number } } = {
    "0xc21223249ca28397b4b6541dffaecc539bff0c59": {
        symbol: "USDC", decimal: 6
    },
    "0xe44fd7fcb2b1581822d0c862b68222998a0c299a": {
        symbol: "WETH", decimal: 18
    },
    "0x66e428c3f67a68878562e79a0234c1f83c208770": {
        symbol: "USDT", decimal: 6
    },
    "0x0e517979c2c1c1522ddb0c73905e0d39b3f990c0": {
        symbol: "ADA", decimal: 6
    },
    "0xb888d8dd1733d72681b30c00ee76bde93ae7aa93": {
        symbol: "ATOM", decimal: 6
    },
    "0x062e66477faf219f25d27dced647bf57c3107d52": {
        symbol: "WBTC", decimal: 8
    },
    "0xb9ce0dd29c91e02d4620f57a66700fc5e41d6d15": {
        symbol: "XRP", decimal: 6
    },
    "0x9d97be214b68c7051215bb61059b4e299cd792c3": {
        symbol: "LTC", decimal: 8
    },
    "0x7589b70abb83427bb7049e08ee9fc6479ccb7a23": {
        symbol: "BCH", decimal: 8
    }
}

export const FUL = "0x83afb1c32e5637acd0a452d87c3249f4a9f0013a"
export const sFUL = "0x2a628916f85caaf21daba223ff2d93aa07816652"
export const esFUL = "0x09d7c9f284686c27a2caff3f2ff12e5cd3dfe20f"
export const vFUL = "0xa461fa4bf68c72369db4fa8ed7cba4796598f2b0"
export const vFLP = "0x27e51d2b5a3283bef4014519f095ab8ddcf023f6"
export const VAULT = "0x8c7ef34aa54210c76d6d5e475f43e0c11f876098"
export const FUL_MANAGER = "0x6148107bcac794d3fc94239b88fa77634983891f"
export const REWARD_ROUTER = "0x133b7f9570b3be8e51ccd5da4654c3dde7657ae1"