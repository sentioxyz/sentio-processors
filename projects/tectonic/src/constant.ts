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
    "0xb075a3590c9ffc8332c47db49f5c6ee1dbcdf804",
    "0x53b4112cba389302b065d2a92bb249d27f51c680",
    "0xe3e2cea8dffa592eadab7d9c7f1e0cc6700490aa"
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
    ["0x56b6000f7aa338d77ba834f6f70a1774d0248517", "tATOMl"],
    ["0x29984c47b0bac5a59290ef082e1f651a7019ec4a", "tADA"],
    ["0xb075a3590c9ffc8332c47db49f5c6ee1dbcdf804", "tVVS"],
    ["0x972173afb7eefb80a0815831b318a643442ad0c1", "tCROl"],
    ["0xcd8f4147a4f9452e027f5203bfc5b7a786055138", "tLCROl"],
    ["0x498bd0cbdf3ba43c02fe768f8e993d4bf21d011d", "tUSDCl"],
    ["0x3c920600e049a128b01d2ef0b932108687196502", "tUSDTl"],
    ["0x53b4112cba389302b065d2a92bb249d27f51c680", "tXRP"],
    ["0xe3e2cea8dffa592eadab7d9c7f1e0cc6700490aa", "tLTC"],
    ["0x0a927384cc7ff3d250ac276ae2158d837e42f667", "tLATOMl"],
    ["0x6b0ef5f3e00d7af1459879079d3df76afbbaf865", "tFULd"],
    ["0xf4ff4b8ee660d4276eda17e79094a7cc519e9606", "tCROd"],
    ["0x47e5229d46a11a25ff5dca210df57d62345decf1", "tbCROd"],
    ["0xf2a4c7595a64a18158d205148a975509d969cb8d", "tUSDCd"],
    ["0x2c5515be5bb123b8088843e85789e3e294670cad", "tFERd"],
    ["0x5f2e412392a317b8b80234b8a6941e0282161a25", "tVNOd"],
    ["0x0ba8683fb1d8f66d9ebbe3634b67da623188ac84", "tUSDTd"],
    ["0x131B6F908395f4F43A5A9320B7F96e755df86f8C", "tCDCETHd"]
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
    ["tATOMl", "atom"],
    ["tADA", "ada"],
    ["tVVS", "vvs"],
    ["tCROl", "cro"],
    ["tLCROl", "lcro"],
    ["tUSDCl", "usdc"],
    ["tUSDTl", "usdt"],
    ["tXRP", "xrp"],
    ["tLTC", "ltc"],
    ["tLATOM", "latom"],
    ["tFERd", "fer"],
    ["tFULd", "ful"],
    ["tbCROd", "bcro"],
    ["tLATOMl", "latom"],
    ["tCROd", "cro"],
    ["tUSDCd", "usdc"],
    ["tVNOd", "vno"],
    ["tUSDTd", "usdt"],
    ["tCDCETHd", "cdceth"]
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
    ["lcro", "0x9fae23a2700feecd5b93e43fdbc03c76aa7c08a6"],
    ["xrp", "0xb9ce0dd29c91e02d4620f57a66700fc5e41d6d15"],
    ["ltc", "0x9d97be214b68c7051215bb61059b4e299cd792c3"],
    ["latom", "0xac974ee7fc5d083112c809ccb3fce4a4f385750d"],
    ["fer", "0x39bc1e38c842c60775ce37566d03b41a7a66c782"],
    ["ful", "0x83afb1c32e5637acd0a452d87c3249f4a9f0013a"],
    ["bcro", "0xebaceb7f193955b946cc5dd8f8724a80671a1f2f"],
    ["vno", "0xdb7d0a1ec37de1de924f8e8adac6ed338d4404e9"],
    ["cdceth", "0x7a7c9db510ab29a2fc362a4c34260becb5ce3446"]
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
    ["lcro", 18],
    ["xrp", 6],
    ["ltc", 8],
    ["latom", 6],
    ["fer", 18],
    ["ful", 18],
    ["bcro", 18],
    ["vno", 18],
    ["cdceth", 18]
])

//lcro pool
export const LCRO_POOLS = [
    "0x972173afb7eefb80a0815831b318a643442ad0c1",
    "0xcd8f4147a4f9452e027f5203bfc5b7a786055138",
    "0x498bd0cbdf3ba43c02fe768f8e993d4bf21d011d",
    "0x3c920600e049a128b01d2ef0b932108687196502",
    "0x0a927384cc7ff3d250ac276ae2158d837e42f667",
    "0x56b6000f7aa338d77ba834f6f70a1774d0248517"
]


//defi pool
export const DEFI_POOLS = [
    "0xf2A4C7595A64A18158D205148A975509d969cB8d",
    "0x0bA8683fB1d8F66d9EBBE3634b67Da623188AC84",
    "0xf4Ff4B8Ee660D4276EdA17e79094A7CC519e9606",
    "0x2C5515bE5bb123b8088843e85789e3e294670caD",
    "0x5F2E412392A317b8b80234B8a6941e0282161A25",
    "0x6B0eF5f3E00D7aF1459879079d3Df76afbBAf865",
    "0x47e5229d46A11A25FF5dCa210DF57d62345dEcf1",
    "0x131B6F908395f4F43A5A9320B7F96e755df86f8C",
]


