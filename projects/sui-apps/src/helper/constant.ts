export const BOT_ADDRESS = "0x1002960e45f57e0cd8aa872f0be379a4254afab7f15382fa88085dad3f772e22"

//cetus, similar as v3
export const CETUS_SWAP_TYPE = "0x1eabed72c53feb3805120a081dc15963c204dc8d091542592abaf7a35689b2fb::pool::SwapEvent"
export const CETUS_POOL_TYPE = "0x1eabed72c53feb3805120a081dc15963c204dc8d091542592abaf7a35689b2fb::pool::Pool"
//kriya, similar as v2
export const KRIYA_SWAP_TYPE = "0xa0eba10b173538c8fecca1dff298e488402cc9ff374f8a12ca7758eebe830b66::spot_dex::SwapEvent"
export const KRIYA_POOL_TYPE = "0xa0eba10b173538c8fecca1dff298e488402cc9ff374f8a12ca7758eebe830b66::spot_dex::Pool"
//kriya another event, no use
export const KRIYA_SWAPTOKEN_TYPE = "0x361dd589b98e8fcda9a7ee53b85efabef3569d00416640d2faa516e3801d7ffc::pool::SwapTokenEvent"
//flowx dex
export const FLOWX_SWAP_TYPE = "0xb24b6789e088b876afabca733bed2299fbc9e2d6369be4d1acfa17d8145454d9::swap::Swap_Event"
//flowx router
export const FLOWX_ROUTER_TYPE = "0xba153169476e8c3114962261d1edc70de5ad9781b83cc617ecc8c1923191cae0::pair::Swapped"
export const FLOWX_POOL_TYPE = "0xb24b6789e088b876afabca733bed2299fbc9e2d6369be4d1acfa17d8145454d9::swap::Pool"
//flashloan vault
export const FLASHLOAN_VAULT_TYPE = "0x62285e6bf9ce841f9bf98b7e3a8e4478e02219135cf2bc1ccaf409ec5883f7b6::vault::FlashLoanEvent"
export const FLASHLOAN_VAULT_TYPE2 = "0xf0865c67c2bf2dfa10e131f939aea54e06ea7825d2cb66afc4e5652b6b727127::pool::FlashLoanEvent"
//deepbook
export const DEEPBOOK_TYPE = "0xdee9::clob_v2::OrderFilled"
export const DEEPBOOK_POOL_TYPE = "0xdee9::clob_v2::Pool"
//interest protocol
export const IPX_SWAP_TYPE = "0x5c45d10c26c5fb53bfaff819666da6bc7053d2190dfa29fec311cc666ff1f4b0::core::SwapToken"
export const IPX_POOL_TYPE = "0x5c45d10c26c5fb53bfaff819666da6bc7053d2190dfa29fec311cc666ff1f4b0::core::Pool"
//aftermath
export const AFTERMATH_SWAP_TYPE = "0xefe170ec0be4d762196bedecd7a065816576198a6527c99282a2551aaa7da38c::events::SwapEvent"
export const AFTERMATH_POOL_TYPE = "0xefe170ec0be4d762196bedecd7a065816576198a6527c99282a2551aaa7da38c::pool::Pool"
//turbos
export const TURBOS_SWAP_TYPE = "0x91bfbc386a41afcfd9b2533058d7e915a1d3829089cc268ff4333d54d6339ca1::pool::SwapEvent"
export const TURBOS_POOL_TYPE = "0x91bfbc386a41afcfd9b2533058d7e915a1d3829089cc268ff4333d54d6339ca1::pool::Pool"
//baysway
export const BAYSWAP_SWAP_TYPE = "0x227f865230dd4fc947321619f56fee37dc7ac582eb22e3eab29816f717512d9d::liquidity_pool::EventSwap"



export const AFTERMATH_ADD_LIQUIDITY_TYPE = "0xefe170ec0be4d762196bedecd7a065816576198a6527c99282a2551aaa7da38c::events::DepositEvent"
export const AFTERMATH_REMOVE_LIQUIDITY_TYPE = "0xefe170ec0be4d762196bedecd7a065816576198a6527c99282a2551aaa7da38c::events::WithdrawEvent"
//whitelisted type prefix
export const WHITELISTED_TYPE_MAP = [
    //swaps
    CETUS_SWAP_TYPE,
    KRIYA_SWAP_TYPE,
    KRIYA_SWAPTOKEN_TYPE,
    FLOWX_SWAP_TYPE,
    FLOWX_ROUTER_TYPE,
    DEEPBOOK_TYPE,
    IPX_SWAP_TYPE + "X",
    IPX_SWAP_TYPE + "Y",
    AFTERMATH_SWAP_TYPE,
    TURBOS_SWAP_TYPE,
    //liquidity
    AFTERMATH_ADD_LIQUIDITY_TYPE,
    AFTERMATH_REMOVE_LIQUIDITY_TYPE
]



