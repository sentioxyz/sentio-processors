import { getPriceByType } from "@sentio/sdk/utils"
import { SuiNetwork } from "@sentio/sdk/sui"
const coin_cetus_full_address = "0x06864a6f921804860930db6ddbe2e16acdf8504495ea7481637a1c8b9a8fe54b::cetus::CETUS"
const price_cetus = await getPriceByType(SuiNetwork.MAIN_NET, coin_cetus_full_address, new Date(1692627735000))
console.log(price_cetus)

const coin_sui_full_address = "0x2::sui::SUI"
const price_sui = await getPriceByType(SuiNetwork.MAIN_NET, coin_sui_full_address, new Date(1692627735000))
console.log(price_sui)