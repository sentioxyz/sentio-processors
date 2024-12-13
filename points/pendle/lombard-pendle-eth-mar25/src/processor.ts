import { ERC20Processor } from "@sentio/sdk/eth/builtin";
import { MISC_CONSTS, PENDLE_POOL_ADDRESSES, CONFIG } from "./consts.js";
import { handleSYTransfer } from "./handlers/SY.js";
import { PendleYieldTokenProcessor } from "./types/eth/pendleyieldtoken.js";
import {
  handleYTRedeemInterest,
  handleYTTransfer,
  processAllYTAccounts,
} from "./handlers/YT.js";
import { PendleMarketProcessor } from "./types/eth/pendlemarket.js";
import {
  handleLPTransfer,
  handleMarketRedeemReward,
  handleMarketSwap,
  processAllLPAccounts,
} from "./handlers/LP.js";
import { GLOBAL_CONFIG } from "@sentio/runtime";
import { EQBBaseRewardProcessor } from "./types/eth/eqbbasereward.js";

GLOBAL_CONFIG.execution = {
  sequential: true,
};

ERC20Processor.bind({
  address: PENDLE_POOL_ADDRESSES.SY,
  startBlock: PENDLE_POOL_ADDRESSES.SY_START_BLOCK,
  name: "Pendle Pool SY",
  network: CONFIG.BLOCKCHAIN,
}).onEventTransfer(async (evt, ctx) => {
  await handleSYTransfer(evt, ctx);
});

PendleYieldTokenProcessor.bind({
  address: PENDLE_POOL_ADDRESSES.YT,
  startBlock: PENDLE_POOL_ADDRESSES.START_BLOCK,
  name: "Pendle Pool YT",
  network: CONFIG.BLOCKCHAIN,
})
  .onEventTransfer(async (evt, ctx) => {
    await handleYTTransfer(evt, ctx);
  })
  // .onEventRedeemInterest(async (evt, ctx) => {
  //   await handleYTRedeemInterest(evt, ctx);
  // })
  .onTimeInterval(async (_, ctx) => {
    await processAllYTAccounts(ctx);
  },
    MISC_CONSTS.ONE_HOUR_IN_MINUTE,
    MISC_CONSTS.ONE_HOUR_IN_MINUTE
  )

PendleMarketProcessor.bind({
  address: PENDLE_POOL_ADDRESSES.LP,
  startBlock: PENDLE_POOL_ADDRESSES.START_BLOCK,
  name: "Pendle Pool LP",
  network: CONFIG.BLOCKCHAIN,
})
  .onEventTransfer(async (evt, ctx) => {
    await handleLPTransfer(evt, ctx);
  })
  .onEventRedeemRewards(async (evt, ctx) => {
    await handleMarketRedeemReward(evt, ctx);
  })
  .onEventSwap(async (evt, ctx) => {
    await handleMarketSwap(evt, ctx);
  });

EQBBaseRewardProcessor.bind({
  address: PENDLE_POOL_ADDRESSES.EQB_STAKING,
  startBlock: PENDLE_POOL_ADDRESSES.EQB_START_BLOCK,
  name: "Equilibria Base Reward",
  network: CONFIG.BLOCKCHAIN
}).onEventStaked(async (evt, ctx) => {
  await processAllLPAccounts(ctx, [evt.args._user.toLowerCase()]);
}).onEventWithdrawn(async (evt, ctx) => {
  await processAllLPAccounts(ctx, [evt.args._user.toLowerCase()]);
})
ERC20Processor.bind({
  address: PENDLE_POOL_ADDRESSES.PENPIE_RECEIPT_TOKEN,
  startBlock: PENDLE_POOL_ADDRESSES.PENPIE_START_BLOCK,
  name: "Pendle Pie Receipt Token",
  network: CONFIG.BLOCKCHAIN,
}).onEventTransfer(async (evt, ctx) => {
  await processAllLPAccounts(ctx, [
    evt.args.from.toLowerCase(),
    evt.args.to.toLowerCase(),
  ]);
});

// ERC20Processor.bind({
//   address: PENDLE_POOL_ADDRESSES.STAKEDAO_RECEIPT_TOKEN,
//   startBlock: PENDLE_POOL_ADDRESSES.STAKEDAO_START_BLOCK,
//   name: "Stakedao Receipt Token",
// }).onEventTransfer(async (evt, ctx) => {
//   await processAllLPAccounts(ctx, [
//     evt.args.from.toLowerCase(),
//     evt.args.to.toLowerCase(),
//   ]);
// });
