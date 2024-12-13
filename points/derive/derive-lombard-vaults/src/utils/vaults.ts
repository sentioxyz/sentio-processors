import { EthChainId, EthContext, isNullAddress } from "@sentio/sdk/eth";
import { DERIVE_VAULTS, MILLISECONDS_PER_DAY, MULTIPLIER, SEASONS } from "../config.js";
import { getCurrentSeason, schemas } from "@derivefinance/derive-sentio-utils";
import { VaultConfig } from "@derivefinance/derive-sentio-utils/dist/vaults/vaultConfig.js";

export function emitVaultUserPoints(ctx: EthContext, vaultConfig: VaultConfig, lastSnapshot: schemas.DeriveVaultUserSnapshot | undefined, newSnapshot: schemas.DeriveVaultUserSnapshot | undefined) {
    if (!lastSnapshot || !newSnapshot) return;

    if (lastSnapshot.vaultBalance.isZero()) return;

    const elapsedDays = (Number(newSnapshot.timestampMs) - Number(lastSnapshot.timestampMs)) / MILLISECONDS_PER_DAY
    const earnedLombardPoints = elapsedDays * vaultConfig.pointMultipliersPerDay["lombard"] * lastSnapshot.underlyingEffectiveBalance.toNumber()
    const earnedBabylonPoints = elapsedDays * vaultConfig.pointMultipliersPerDay["babylon"] * lastSnapshot.underlyingEffectiveBalance.toNumber()
    ctx.eventLogger.emit("point_update", {
        account: lastSnapshot.owner,
        vaultAddress: lastSnapshot.vaultAddress,
        lPoints: earnedLombardPoints,
        bPoints: earnedBabylonPoints,
        // last snapshot
        lastTimestampMs: lastSnapshot.timestampMs,
        lastVaultBalance: lastSnapshot.vaultBalance,
        lastUnderlyingEffectiveBalance: lastSnapshot.underlyingEffectiveBalance,
        // new snapshot
        newTimestampMs: newSnapshot.timestampMs,
        newVaultBalance: newSnapshot.vaultBalance,
        newUnderlyingEffectiveBalance: newSnapshot.underlyingEffectiveBalance,

        // season
        season: getCurrentSeason(SEASONS, BigInt(ctx.timestamp.getTime())),
        multiplier: MULTIPLIER
    });
}
