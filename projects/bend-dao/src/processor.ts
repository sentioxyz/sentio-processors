import { Counter, Gauge, LogLevel } from "@sentio/sdk";
import { ERC20Processor } from "@sentio/sdk/eth/builtin";
import { X2y2Processor } from "./types/eth/x2y2.js";
import { BenddistributorProcessor } from "./types/eth/benddistributor.js";

const rewardPerDistributed = Gauge.register("reward_per_distributed", {
    description: "rewards for each distribution",
    unit: "bend",
});

const userReward = Gauge.register("user_reward", {
    description: "user rewards",
    unit: "bend",
});

const addrs = [
    "0x826eB237dAC0bC494cED68Fb93d3337a0379EEA1",
];

BenddistributorProcessor.bind({
    address: "0x2338D34337dd0811b684640de74717B73F7B8059",
})
    .onEventDistributed(async (event, ctx) => {
        const val = event.args.tokenAmount.scaleDown(18);
        ctx.meter.Counter("bend_distributed").add(val);
        rewardPerDistributed.record(ctx, val);
        ctx.eventLogger.emit("bend_distributed", {
            severity: LogLevel.INFO,
            message: `Distributed $${val} at ${ctx.blockNumber}`,
            amount: val,
            time: event.args.time,
        });
    })
    .onEventClaimed(async (event, ctx) => {
        const val = event.args.amount.scaleDown(18);
        ctx.eventLogger.emit("bend_claimed", {
            distinctId: event.args.recipient,
            severity: LogLevel.INFO,
            message: `Claimed ${val.toFixed(2)} at block: ${ctx.blockNumber} epoch: ${
                event.args.claimEpoch
            }/${event.args.maxEpoch} by ${event.args.recipient}`,
            amount: val,
            recipient: event.args.recipient,
            claimEpoch: event.args.claimEpoch,
        });
    })
    .onBlockInterval(async (block, ctx) => {
        for (const addr in addrs) {
            try {
                const claimed = await ctx.contract.totalClaimed(addr.toLowerCase());
                const claimable = await ctx.contract.claimable(addr.toLowerCase());
                const total = (claimed + claimable).scaleDown(18);
                userReward.record(ctx, total);
            } catch (e) {
                console.log(e);
            }
        }
    }, 5 * 60 * 24 * 7);