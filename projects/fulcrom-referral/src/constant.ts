import { EthChainId } from "@sentio/sdk/eth"
export const CHAINS = [EthChainId.CRONOS, EthChainId.ZKSYNC_ERA]
export const VREFERRAL_MANAGER_MAP = new Map<EthChainId, string>([
    [EthChainId.CRONOS, "0xd565CB10930f63FC9B5244310Aa74bFD22069934"],
    [EthChainId.ZKSYNC_ERA, "0x0CF43637c3040Cf27a0b66d559e2dafaE4105992"]
])