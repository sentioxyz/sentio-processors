import { SuiContext } from "@sentio/sdk/sui";
import { SuiObjectProcessor } from "@sentio/sdk/sui";
import { ChainId } from "@sentio/chain";
import { scaleDown, BigDecimal } from "@sentio/sdk";
import { stake_pool } from "../types/sui/0x68d22cf8bdbcd11ecba1e094922873e4080d4d11133e2443fddda0bfd11dae20.js";

const V2_STAKE_POOL_ADDRESS =
  "0x68d22cf8bdbcd11ecba1e094922873e4080d4d11133e2443fddda0bfd11dae20";

// V2 Stake Event Handler
const v2StakeHandler = async function (
  event: stake_pool.StakeEventExtInstance,
  ctx: SuiContext
) {
  const suiAmountIn = scaleDown(event.data_decoded.sui_amount_in, 9);
  const lstAmountOut = scaleDown(event.data_decoded.lst_amount_out, 9);
  const feeAmount = scaleDown(event.data_decoded.fee_amount, 9);

  ctx.eventLogger.emit("poolInteractionsV2", {
    staker: event.sender,
    type: "stake",
    sui_amount: suiAmountIn,
    lst_amount: lstAmountOut,
    fee_amount: feeAmount,
    env: "mainnet",
    version: "v2",
  });

  ctx.meter.Gauge("v2StakeVolume").record(suiAmountIn, {
    type: "stake",
    env: "mainnet",
  });
};

// V2 Unstake Event Handler
const v2UnstakeHandler = async function (
  event: stake_pool.UnstakeEventExtInstance,
  ctx: SuiContext
) {
  const lstAmountIn = scaleDown(event.data_decoded.lst_amount_in, 9);
  const suiAmountOut = scaleDown(event.data_decoded.sui_amount_out, 9);
  const feeAmount = scaleDown(event.data_decoded.fee_amount, 9);
  const redistributionAmount = scaleDown(
    event.data_decoded.redistribution_amount,
    9
  );

  ctx.eventLogger.emit("poolInteractionsV2", {
    staker: event.sender,
    type: "unstake",
    sui_amount: suiAmountOut,
    lst_amount: lstAmountIn,
    fee_amount: feeAmount,
    redistribution_amount: redistributionAmount,
    env: "mainnet",
    version: "v2",
  });

  ctx.meter.Gauge("v2UnstakeVolume").record(suiAmountOut, {
    type: "unstake",
    env: "mainnet",
  });
};

// V2 Epoch Changed Event Handler
const v2EpochChangedHandler = async function (
  event: stake_pool.EpochChangedEventInstance,
  ctx: SuiContext
) {
  const oldSuiSupply = scaleDown(event.data_decoded.old_sui_supply, 9);
  const newSuiSupply = scaleDown(event.data_decoded.new_sui_supply, 9);
  const boostedRewardAmount = scaleDown(
    event.data_decoded.boosted_reward_amount,
    9
  );
  const lstSupply = scaleDown(event.data_decoded.lst_supply, 9);
  const rewardFee = scaleDown(event.data_decoded.reward_fee, 9);

  ctx.eventLogger.emit("epochChangedV2", {
    old_sui_supply: oldSuiSupply,
    new_sui_supply: newSuiSupply,
    boosted_reward_amount: boostedRewardAmount,
    lst_supply: lstSupply,
    reward_fee: rewardFee,
    time: event.timestampMs,
    env: "mainnet",
    version: "v2",
  });

  // Record supply and reward metrics
  ctx.meter.Gauge("v2SuiSupply").record(newSuiSupply, { env: "mainnet" });
  ctx.meter.Gauge("v2LstSupply").record(lstSupply, { env: "mainnet" });
  ctx.meter.Gauge("v2RewardFee").record(rewardFee, { env: "mainnet" });

  // Calculate exchange rate (SUI per LST)
  if (lstSupply.gt(BigDecimal(0))) {
    const exchangeRate = newSuiSupply.div(lstSupply);
    ctx.meter.Gauge("v2ExchangeRate").record(exchangeRate, { env: "mainnet" });
  }
};

// V2 Delegate Stake Event Handler
const v2DelegateStakeHandler = async function (
  event: stake_pool.DelegateStakeEventInstance,
  ctx: SuiContext
) {
  const suiAmountIn = scaleDown(event.data_decoded.sui_amount_in, 9);
  const lstAmountOut = scaleDown(event.data_decoded.lst_amount_out, 9);

  ctx.eventLogger.emit("delegateStakeV2", {
    validator_address: event.data_decoded.v_address,
    sui_amount: suiAmountIn,
    lst_amount: lstAmountOut,
    env: "mainnet",
    version: "v2",
  });
};

// V2 Collect Fees Event Handler
const v2CollectFeesHandler = async function (
  event: stake_pool.CollectFeesEventInstance,
  ctx: SuiContext
) {
  const amount = scaleDown(event.data_decoded.amount, 9);

  ctx.eventLogger.emit("collectFeesV2", {
    amount: amount,
    collector: event.sender,
    env: "mainnet",
    version: "v2",
  });

  ctx.meter.Gauge("v2CollectedFees").record(amount, { env: "mainnet" });
};

// V2 Pool Processor for monitoring stake pool state
export function PoolProcessorV2() {
  SuiObjectProcessor.bind({
    objectId: V2_STAKE_POOL_ADDRESS,
    network: ChainId.SUI_MAINNET,
    startCheckpoint: 51293457n,
  }).onTimeInterval(
    async (self, _, ctx) => {
      try {
        // Monitor V2 pool metrics
        const poolData = self.fields as any;

        if (poolData.fees) {
          const fees = scaleDown(poolData.fees, 9);
          ctx.meter.Gauge("v2PoolFees").record(fees, { env: "mainnet" });
        }

        if (poolData.boosted_balance) {
          const boostedBalance = scaleDown(poolData.boosted_balance, 9);
          ctx.meter
            .Gauge("v2BoostedBalance")
            .record(boostedBalance, { env: "mainnet" });
        }

        if (poolData.accrued_reward_fees) {
          const accruedRewardFees = scaleDown(poolData.accrued_reward_fees, 9);
          ctx.meter
            .Gauge("v2AccruedRewardFees")
            .record(accruedRewardFees, { env: "mainnet" });
        }
      } catch (error) {
        console.error("V2 Pool monitoring error:", error);
      }
    },
    60,
    60
  );
}

// Initialize V2 Event Handlers
export function initializeV2Processors() {
  // Bind V2 event handlers
  stake_pool
    .bind({
      address: V2_STAKE_POOL_ADDRESS, 
      network: ChainId.SUI_MAINNET,
      startCheckpoint: 51293457n,
    })
    .onEventStakeEventExt(v2StakeHandler)
    .onEventUnstakeEventExt(v2UnstakeHandler)
    .onEventEpochChangedEvent(v2EpochChangedHandler)
    .onEventDelegateStakeEvent(v2DelegateStakeHandler)
    .onEventCollectFeesEvent(v2CollectFeesHandler);

  // Initialize pool monitoring
  PoolProcessorV2();
}
