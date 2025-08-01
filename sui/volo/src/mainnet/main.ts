import { SuiContext } from "@sentio/sdk/sui";

import { OracleProcessor } from "./oracle.js";
import { native_pool } from "../types/sui/volo.js";
import { SuiObjectProcessor } from "@sentio/sdk/sui";
import { ChainId } from "@sentio/chain";
import { initializeV2Processors } from "./v2_processor.js";

const axios = require("axios");

// Initialize Oracle Processor
OracleProcessor();

// Initialize V2 Processors
initializeV2Processors();

const stakeHandler = async function (
  event: native_pool.StakedEventInstance,
  ctx: SuiContext
) {
  ctx.eventLogger.emit("poolInteractions", {
    staker: event.data_decoded.staker,
    type: "stake",
    sui_amount: event.data_decoded.sui_amount,
    cert_amount: event.data_decoded.cert_amount,
    env: "mainnet",
    version: "v1",
  });
};

const unstakeHandler = async function (
  event: native_pool.UnstakedEventInstance,
  ctx: SuiContext
) {
  ctx.eventLogger.emit("poolInteractions", {
    staker: event.data_decoded.staker,
    type: "unstake",
    sui_amount: event.data_decoded.sui_amount,
    cert_amount: event.data_decoded.cert_amount,
    env: "mainnet",
    version: "v1",
  });
};

const feeCollectedEventHandler = async function (
  event: native_pool.FeeCollectedEventInstance,
  ctx: SuiContext
) {
  ctx.eventLogger.emit("feeCollectedEvent", {
    sender: event.sender,
    to: event.data_decoded.to,
    value: event.data_decoded.value,
    version: "v1",
  });
};

const rewardUpdateEventHandle = async function (
  event: native_pool.RewardsUpdatedInstance,
  ctx: SuiContext
) {
  ctx.eventLogger.emit("rewardsUpdated", {
    rewards: event.data_decoded.value,
    time: event.timestampMs,
    env: "mainnet",
    version: "v1",
  });
};

const ratioEventHandle = async function (
  event: native_pool.RatioUpdatedEventInstance,
  ctx: SuiContext
) {
  ctx.eventLogger.emit("ratioUpdated", {
    newRatio: event.data_decoded.ratio,
    time: event.timestampMs,
    env: "mainnet",
    version: "v1",
  });
};

export function PoolProcessor() {
  SuiObjectProcessor.bind({
    objectId:
      "0x96df0fce3c471489f4debaaa762cf960b3d97820bd1f3f025ff8190730e958c5",
    network: ChainId.SUI_MAINNET,
    startCheckpoint: 51293457n,
  }).onTimeInterval(
    async (self, _, ctx) => {
      const apy = async function () {
        try {
          const response = await axios.get(
            "https://stake.volosui.com/api/metrics",
            {
              timeout: 10000, // 10 second timeout
              validateStatus: (status: number) => status >= 200 && status < 300,
            }
          );

          // Validate response structure
          if (!response.data || typeof response.data.apy === "undefined") {
            console.warn(
              "Invalid response structure from volo API:",
              response.data
            );
            return 0; // Default APY value
          }

          const vSuiData = response.data.apy;

          // Ensure valid numeric value
          if (typeof vSuiData !== "number" || isNaN(vSuiData)) {
            console.warn("Invalid APY value from volo API:", vSuiData);
            return 0;
          }

          return vSuiData;
        } catch (error) {
          console.error("Failed to fetch volo APY:", {
            error: error.message,
            code: error.code,
            url: "https://stake.volosui.com/api/metrics",
          });
          return 0; // Return default value instead of empty object
        }
      };

      const lstData = await apy();

      // Only record if we have a valid number
      if (typeof lstData === "number" && !isNaN(lstData)) {
        ctx.meter.Gauge("voloApy").record(lstData);
      }
    },
    60,
    60
  );
}

export function PoolProcessor1() {
  SuiObjectProcessor.bind({
    objectId:
      "0x96df0fce3c471489f4debaaa762cf960b3d97820bd1f3f025ff8190730e958c5",
    network: ChainId.SUI_MAINNET,
    startCheckpoint: 51293457n,
  }).onTimeInterval(
    async (self, _, ctx) => {
      const apy = async function () {
        try {
          const response1 = await axios.get(
            "https://open-api.naviprotocol.io/api/haedal/stats",
            {
              timeout: 10000,
              validateStatus: (status: number) => status >= 200 && status < 300,
            }
          );

          // Validate response structure
          if (
            !response1.data ||
            !response1.data.data ||
            typeof response1.data.data.apy === "undefined"
          ) {
            console.warn(
              "Invalid response structure from haedal API:",
              response1.data
            );
            return 0;
          }

          const haSuiData = response1.data.data.apy;

          // Ensure valid numeric value
          if (typeof haSuiData !== "number" || isNaN(haSuiData)) {
            console.warn("Invalid APY value from haedal API:", haSuiData);
            return 0;
          }

          return haSuiData;
        } catch (error) {
          console.error("Failed to fetch haedal APY:", {
            error: error.message,
            code: error.code,
            url: "https://open-api.naviprotocol.io/api/haedal/stats",
          });
          return 0;
        }
      };

      const lstData = await apy();

      if (typeof lstData === "number" && !isNaN(lstData)) {
        ctx.meter.Gauge("haSuiApy").record(lstData);
      }
    },
    60,
    60
  );
}
export function PoolProcessor2() {
  SuiObjectProcessor.bind({
    objectId:
      "0x96df0fce3c471489f4debaaa762cf960b3d97820bd1f3f025ff8190730e958c5",
    network: ChainId.SUI_MAINNET,
    startCheckpoint: 51293457n,
  }).onTimeInterval(
    async (self, _, ctx) => {
      const apy = async function () {
        try {
          const response2 = await axios.get(
            "https://open-api.naviprotocol.io/api/afsui/stats",
            {
              timeout: 10000,
              validateStatus: (status: number) => status >= 200 && status < 300,
            }
          );

          // Validate response structure
          if (
            !response2.data ||
            !response2.data.data ||
            typeof response2.data.data.apy === "undefined"
          ) {
            console.warn(
              "Invalid response structure from afsui API:",
              response2.data
            );
            return 0;
          }

          const afSuiData = response2.data.data.apy;

          // Ensure valid numeric value
          if (typeof afSuiData !== "number" || isNaN(afSuiData)) {
            console.warn("Invalid APY value from afsui API:", afSuiData);
            return 0;
          }

          return afSuiData;
        } catch (error) {
          console.error("Failed to fetch afsui APY:", {
            error: error.message,
            code: error.code,
            url: "https://open-api.naviprotocol.io/api/afsui/stats",
          });
          return 0;
        }
      };

      const afSuiData = await apy();

      if (typeof afSuiData === "number" && !isNaN(afSuiData)) {
        ctx.meter.Gauge("afSuiApy").record(afSuiData);
      }
    },
    60,
    60
  );
}
export function ValidatorProcessor() {
  SuiObjectProcessor.bind({
    objectId:
      "0x96df0fce3c471489f4debaaa762cf960b3d97820bd1f3f025ff8190730e958c5",
    network: ChainId.SUI_MAINNET,
    startCheckpoint: 51293457n,
  }).onTimeInterval(
    async (self, _, ctx) => {
      const valiData = async function () {
        try {
          const response = await axios.get(
            "https://open-api.naviprotocol.io/api/volo/stats",
            {
              timeout: 10000,
              validateStatus: (status: number) => status >= 200 && status < 300,
            }
          );

          // Validate response structure
          if (!response.data || !response.data.data) {
            console.warn(
              "Invalid response structure from volo stats API:",
              response.data
            );
            return { validators: [], totalStaked: 0 };
          }

          const data = response.data.data;

          // Ensure validators is an array
          if (!Array.isArray(data.validators)) {
            console.warn(
              "Invalid validators data from volo stats API:",
              data.validators
            );
            return { validators: [], totalStaked: data.totalStaked || 0 };
          }

          // Ensure totalStaked is a valid number
          const totalStaked =
            typeof data.totalStaked === "number" && !isNaN(data.totalStaked)
              ? data.totalStaked
              : 0;

          return {
            validators: data.validators,
            totalStaked: totalStaked,
          };
        } catch (error) {
          console.error("Failed to fetch volo validator stats:", {
            error: error.message,
            code: error.code,
            url: "https://open-api.naviprotocol.io/api/volo/stats",
          });
          return { validators: [], totalStaked: 0 };
        }
      };

      const vsData = await valiData();

      // Process validators safely
      if (vsData && Array.isArray(vsData.validators)) {
        const validators = vsData.validators;
        for (let i = 0; i < validators.length; i++) {
          const validator = validators[i];
          if (
            validator &&
            validator.name &&
            typeof validator.totalStaked !== "undefined"
          ) {
            const totalStaked = Number(validator.totalStaked);
            if (!isNaN(totalStaked)) {
              ctx.meter.Gauge("validatorData").record(totalStaked, {
                name: validator.name,
              });
            }
          }
        }
      }

      // Record total staked safely
      if (
        typeof vsData.totalStaked === "number" &&
        !isNaN(vsData.totalStaked)
      ) {
        ctx.meter.Gauge("voloTotalStaked").record(vsData.totalStaked);
      }
    },
    60,
    60
  );
}

PoolProcessor();
PoolProcessor1();
PoolProcessor2();
ValidatorProcessor();
native_pool
  .bind({
    startCheckpoint: 16000000n,
  })
  .onEventStakedEvent(stakeHandler)
  .onEventUnstakedEvent(unstakeHandler)
  .onEventFeeCollectedEvent(feeCollectedEventHandler)
  .onEventRewardsUpdated(rewardUpdateEventHandle)
  .onEventRatioUpdatedEvent(ratioEventHandle);
