import { BigDecimal, Gauge } from '@sentio/sdk';
import {
    BroadcastResultsEvent,
    PendleVotingControllerContext,
    PendleVotingControllerProcessor,
} from '../../types/eth/pendlevotingcontroller.js';
import config from '../../config/main.json';

const WEEK = 86400 * 7;

const votingResult = Gauge.register('voting_result', {
    sparse: true,
});

const globVotingResult = Gauge.register('glob_voting_result', { sparse: true });

export async function votingResult_handleVotingResult(
    event: BroadcastResultsEvent,
    ctx: PendleVotingControllerContext
) {
    const allPools = await ctx.contract.getAllActivePools({ blockTag: ctx.blockNumber });
    const wTime = Math.floor(ctx.timestamp.getTime() / 1000 / WEEK) * WEEK;
    let totalVePendleVoted: BigDecimal = new BigDecimal(0);
    for (let pool of allPools) {
        let res = (
            await ctx.contract.getPoolTotalVoteAt(pool, wTime, { blockTag: ctx.blockNumber })
        ).scaleDown(18);
        votingResult.record(ctx, res, { pool: pool });
        totalVePendleVoted = totalVePendleVoted.plus(res);
    }
    globVotingResult.record(ctx, totalVePendleVoted);
}
