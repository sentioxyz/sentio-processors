export const CORE_ADDRESS = "0x7De56Bd8b37827c51835e162c867848fE2403a48"
export const SOCKET_ADDRESS = "0xb3831584acb95ed9ccb0c11f677b5ad01deaeec0"
export const WCRO_ADDRESS = "0x5c7f8a570d578ed84e63fdfa7b1ee72deae1ae23"
export const TONIC_STAKING_ADDRESS = "0xe165132fda537fa89ca1b52a647240c2b84c8f89"
export const TONIC_VAULT_ADDRESS = "0xff9361dff9f485f563b6e947b4adc51f9190a2c8"
export const REPAY_WITH_COLLATERAL = "0x7ed3c11fa9acf7f5e34dca571e5058c2a75401f5"


export const MAIN_POOLS = [
    "0xeadf7c01da7e93fdb5f16b0aa9ee85f978e89e95",
    "0x543f4db9bd26c9eb6ad4dd1c33522c966c625774",
    "0x67fd498e94d95972a4a2a44acce00a000af7fe00",
    "0xb3bbf1be947b245aef26e3b6a9d777d7703f4c8e",
    "0xa683fdfd9286eedfea81cf6da14703da683c44e5",
    "0x4bd41f188f6a05f02b46bb2a1f8ba776e528f9d2",
    "0xe1c4c56f772686909c28c319079d41adfd6ec89b",
    "0xfe6934fdf050854749945921faa83191bccf20ad",
    "0x0d9706531b517d24623118934de69108968ba266",
    "0x29984c47b0bac5a59290ef082e1f651a7019ec4a",
    "0xb075a3590c9ffc8332c47db49f5c6ee1dbcdf804"
]

export const TOKEN_SYMBOL: Map<string, string> = new Map([
    ["0xeadf7c01da7e93fdb5f16b0aa9ee85f978e89e95", "tCRO"],
    ["0x543f4db9bd26c9eb6ad4dd1c33522c966c625774", "tETH"],
    ["0x67fd498e94d95972a4a2a44acce00a000af7fe00", "tWBTC"],
    ["0xb3bbf1be947b245aef26e3b6a9d777d7703f4c8e", "tUSDC"],
    ["0xa683fdfd9286eedfea81cf6da14703da683c44e5", "tUSDT"],
    ["0x4bd41f188f6a05f02b46bb2a1f8ba776e528f9d2", "tTUSD"],
    ["0xe1c4c56f772686909c28c319079d41adfd6ec89b", "tDAI"],
    ["0xfe6934fdf050854749945921faa83191bccf20ad", "tTONIC"],
    ["0x0d9706531b517d24623118934de69108968ba266", "tATOM"],
    ["0x29984c47b0bac5a59290ef082e1f651a7019ec4a", "tADA"],
    ["0xb075a3590c9ffc8332c47db49f5c6ee1dbcdf804", "tVVS"],
    ["0x972173afb7eefb80a0815831b318a643442ad0c1", "tCROl"],
    ["0xcd8f4147a4f9452e027f5203bfc5b7a786055138", "tLCROl"],
    ["0x498bd0cbdf3ba43c02fe768f8e993d4bf21d011d", "tUSDCl"],
    ["0x3c920600e049a128b01d2ef0b932108687196502", "tUSDTl"]
])


export const COLLATERAL_TOKENS: Map<string, string> = new Map([
    ["tCRO", "cro"],
    ["tETH", "eth"],
    ["tWBTC", "wbtc"],
    ["tUSDC", "usdc"],
    ["tUSDT", "usdt"],
    ["tTUSD", "tusd"],
    ["tDAI", "dai"],
    ["tTONIC", "tonic"],
    ["tATOM", "atom"],
    ["tADA", "ada"],
    ["tVVS", "vvs"],
    ["tCROl", "cro"],
    ["tLCROl", "lcro"],
    ["tUSDCl", "usdc"],
    ["tUSDTl", "usdt"]
])

export const COLLATERAL_ADDRESSES: Map<string, string> = new Map([
    ["cro", "0x5c7f8a570d578ed84e63fdfa7b1ee72deae1ae23"],
    ["eth", "0xe44fd7fcb2b1581822d0c862b68222998a0c299a"],
    ["wbtc", "0x062e66477faf219f25d27dced647bf57c3107d52"],
    ["usdc", "0xc21223249ca28397b4b6541dffaecc539bff0c59"],
    ["usdt", "0x66e428c3f67a68878562e79a0234c1f83c208770"],
    ["tusd", "0x87efb3ec1576dec8ed47e58b832bedcd86ee186e"],
    ["dai", "0xf2001b145b43032aaf5ee2884e456ccd805f677d"],
    ["tonic", "0xdd73dea10abc2bff99c60882ec5b2b81bb1dc5b2"],
    ["atom", "0xb888d8dd1733d72681b30c00ee76bde93ae7aa93"],
    ["ada", "0x0e517979c2c1c1522ddb0c73905e0d39b3f990c0"],
    ["vvs", "0x2d03bece6747adc00e1a131bba1469c15fd11e03"],
    ["lcro", "0x9fae23a2700feecd5b93e43fdbc03c76aa7c08a6"]
])

export const COLLATERAL_DECIMAL: Map<string, number> = new Map([
    ["cro", 18],
    ["eth", 18],
    ["wbtc", 8],
    ["usdc", 6],
    ["usdt", 6],
    ["tusd", 18],
    ["dai", 18],
    ["tonic", 18],
    ["atom", 6],
    ["ada", 6],
    ["vvs", 18],
    ["lcro", 18]
])

//lcro pool
export const LCRO_POOLS = [
    "0x972173afb7eefb80a0815831b318a643442ad0c1",
    "0xcd8f4147a4f9452e027f5203bfc5b7a786055138",
    "0x498bd0cbdf3ba43c02fe768f8e993d4bf21d011d",
    "0x3c920600e049a128b01d2ef0b932108687196502",
]



