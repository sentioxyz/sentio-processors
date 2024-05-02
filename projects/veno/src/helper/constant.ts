import { EthChainId } from "@sentio/sdk/eth"


export const CHAINS = [EthChainId.CRONOS, EthChainId.ZKSYNC_ERA]

export const FOUNDTAIN_ADDRESS_MAP = new Map<EthChainId, string>([
    [EthChainId.CRONOS, "0xb4be51216f4926ab09ddf4e64bc20f499fd6ca95"],
    [EthChainId.ZKSYNC_ERA, "0x4E313FF3A7210b9356be34fd35007d42a0B8cd24"]
])


export const VENOSTORM_ADDRESS_MAP = new Map<EthChainId, string>([
    [EthChainId.CRONOS, "0x579206e4e49581ca8ada619e9e42641f61a84ac3"],
    [EthChainId.ZKSYNC_ERA, "0xBDdD1Aa977AcD01510A9E9627eEE8AC1C5e20aCA"]
])