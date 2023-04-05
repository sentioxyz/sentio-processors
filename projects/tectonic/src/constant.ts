export const CORE_ADDRESS = "0x7De56Bd8b37827c51835e162c867848fE2403a48"
export const SOCKET_ADDRESS = "0xb3831584acb95ed9ccb0c11f677b5ad01deaEc0"


export const T_TOKEN_POOLS = [
    "0xeadf7c01da7e93fdb5f16b0aa9ee85f978e89e95",
    "0x543f4db9bd26c9eb6ad4dd1c33522c966c625774",
    "0x67fd498e94d95972a4a2a44acce00a000af7fe00",
    "0xb3bbf1be947b245aef26e3b6a9d777d7703f4c8e",
    "0xa683fdfd9286eedfea81cf6da14703da683c44e5",
    "0x4bd41f188f6a05f02b46bb2a1f8ba776e528f9d2",
    "0xe1c4c56f772686909c28c319079d41adfd6ec89b",
    "0xfe6934fdf050854749945921faa83191bccf20ad"
]

export const T_TOKEN_SYMBOL: Map<string, string> = new Map([
    ["0xeadf7c01da7e93fdb5f16b0aa9ee85f978e89e95", "tCRO"],
    ["0x543f4db9bd26c9eb6ad4dd1c33522c966c625774", "tETH"],
    ["0x67fd498e94d95972a4a2a44acce00a000af7fe00", "tWBTC"],
    ["0xb3bbf1be947b245aef26e3b6a9d777d7703f4c8e", "tUSDC"],
    ["0xa683fdfd9286eedfea81cf6da14703da683c44e5", "tUSDT"],
    ["0x4bd41f188f6a05f02b46bb2a1f8ba776e528f9d2", "tTUSD"],
    ["0xe1c4c56f772686909c28c319079d41adfd6ec89b", "tDAI"],
    ["0xfe6934fdf050854749945921faa83191bccf20ad", "tTONIC"]
])


export const COLLATERAL_TOKENS: Map<string, string> = new Map([
    ["tCRO", "cro"],
    ["tETH", "eth"],
    ["tWBTC", "wbtc"],
    ["tUSDC", "usdc"],
    ["tUSDT", "usdt"],
    ["tTUSD", "tusd"],
    ["tDAI", "dai"],
    ["tTONIC", "tonic"]
])

export const COLLATERAL_DECIMAL: Map<string, number> = new Map([
    ["cro", 8],
    ["eth", 18],
    ["wbtc", 8],
    ["usdc", 6],
    ["usdt", 6],
    ["tusd", 18],
    ["dai", 18],
    ["tonic", 18]
])


export const L_CRO_POOLS = [
    "0x972173afb7eefb80a0815831b318a643442ad0c1",
    "0xcd8f4147a4f9452e027f5203bfc5b7a786055138",
    "0x498bd0cbdf3ba43c02fe768f8e993d4bf21d011d",
    "0x3c920600e049a128b01d2ef0b932108687196502",
]

// tCRO (LCRO) - Smart Contract - 0x972173AfB7Eefb80a0815831B318A643442ad0C1
// tLCRO (LCRO) - Smart Contract - 0xCd8F4147A4F9452e027f5203bfc5B7A786055138
// tUSDC (LCRO) - Smart Contract - 0x498BD0Cbdf3ba43c02fE768F8E993d4bF21d011d
// tUSDT (LCRO) - Smart Contract - 0x3C920600e049A128b01D2Ef0b932108687196502