import { EthContext } from "@sentio/sdk/eth";
import { SEASONS } from "../config.js";

export function getCurrentSeason(ctx: EthContext): string {
    const currentTimestampMs = ctx.timestamp.getTime();
    for (const [season, seasonEndMs] of SEASONS) {
        if (!seasonEndMs) {
            return season;
        }

        if (currentTimestampMs < seasonEndMs) {
            return season;
        }
    }
    throw new Error(`No season found for timestamp ${currentTimestampMs}`);
}
