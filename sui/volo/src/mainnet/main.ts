import { SuiContext } from "@sentio/sdk/sui";

import { OracleProcessor } from "./oracle.js";
import { native_pool } from "../types/sui/volo.js"
import { SuiObjectProcessor } from "@sentio/sdk/sui"
import { ChainId } from "@sentio/chain"
const axios = require('axios');
OracleProcessor()

const stakeHandler = async function (event: native_pool.StakedEventInstance, ctx: SuiContext) {

    ctx.eventLogger.emit("poolInteractions", {
        staker: event.data_decoded.staker,
        type: "stake",
        sui_amount: event.data_decoded.sui_amount,
        cert_amount: event.data_decoded.cert_amount,
        env: "mainnet"
    })
}

const unstakeHandler = async function (event: native_pool.UnstakedEventInstance, ctx: SuiContext) {

    ctx.eventLogger.emit("poolInteractions", {
        staker: event.data_decoded.staker,
        type: "unstake",
        sui_amount: event.data_decoded.sui_amount,
        cert_amount: event.data_decoded.cert_amount,
        env: "mainnet"
    })
}

const feeCollectedEventHandler = async function (event: native_pool.FeeCollectedEventInstance, ctx: SuiContext) {

    ctx.eventLogger.emit("feeCollectedEvent", {
        sender: event.sender,
        to: event.data_decoded.to,
        value: event.data_decoded.value,
    })
}

const rewardUpdateEventHandle = async function (event: native_pool.RewardsUpdatedInstance, ctx: SuiContext) {
    ctx.eventLogger.emit("rewardsUpdated", {
        rewards: event.data_decoded.value,
        time: event.timestampMs,
        env: "mainnet"
    })

}

const ratioEventHandle = async function (event: native_pool.RatioUpdatedEventInstance, ctx: SuiContext) {
    ctx.eventLogger.emit("ratioUpdated", {
        newRatio: event.data_decoded.ratio,
        time: event.timestampMs,
        env: "mainnet"
    })

}

export function PoolProcessor() {

    SuiObjectProcessor.bind({
        objectId: "0x96df0fce3c471489f4debaaa762cf960b3d97820bd1f3f025ff8190730e958c5",
        network: ChainId.SUI_MAINNET,
        startCheckpoint: 51293457n
    }).onTimeInterval(async (self, _, ctx) => {

        const apy = async function () {
            try {
                const response = await axios.get('https://stake.volosui.com/api/metrics');
                const vSuiData = response.data.apy;

                // const response1 = await axios.get('https://open-api.naviprotocol.io/api/haedal/stats');
                // const haSuiData = response1.data.apy;

                // const response2 = await axios.get('https://open-api.naviprotocol.io/api/afsui/stats');
                // const afSuiData = response2.data.apy;

                return vSuiData;
            } catch (error) {
                console.error(`error`, error);
                return {}; // Add a return statement here
            }
        }

        const lstData = await apy();

        ctx.meter.Gauge("voloApy").record(lstData);
    }, 60, 60)

}

export function PoolProcessor1() {

    SuiObjectProcessor.bind({
        objectId: "0x96df0fce3c471489f4debaaa762cf960b3d97820bd1f3f025ff8190730e958c5",
        network: ChainId.SUI_MAINNET,
        startCheckpoint: 51293457n
    }).onTimeInterval(async (self, _, ctx) => {

        const apy = async function () {
            try {
                // const response = await axios.get('https://stake.volosui.com/api/metrics');
                // const vSuiData = response.data.apy;

                const response1 = await axios.get('https://open-api.naviprotocol.io/api/haedal/stats');
                const haSuiData = response1.data.data.apy;

                // const response2 = await axios.get('https://open-api.naviprotocol.io/api/afsui/stats');
                // const afSuiData = response2.data.apy;

                return haSuiData;
            } catch (error) {
                console.error(`error`, error);
                return {}; // Add a return statement here
            }
        }

        const lstData = await apy();

        ctx.meter.Gauge("haSuiApy").record(lstData);
    }, 60, 60)

}
export function PoolProcessor2() {

    SuiObjectProcessor.bind({
        objectId: "0x96df0fce3c471489f4debaaa762cf960b3d97820bd1f3f025ff8190730e958c5",
        network: ChainId.SUI_MAINNET,
        startCheckpoint: 51293457n
    }).onTimeInterval(async (self, _, ctx) => {

        const apy = async function () {
            try {
                // const response = await axios.get('https://stake.volosui.com/api/metrics');
                // const vSuiData = response.data.apy;

                // const response1 = await axios.get('https://open-api.naviprotocol.io/api/haedal/stats');
                // const haSuiData = response1.data.apy;

                const response2 = await axios.get('https://open-api.naviprotocol.io/api/afsui/stats');
                const afSuiData = response2.data.data.apy;

                return afSuiData;
            } catch (error) {
                console.error(`error`, error);
                return {}; // Add a return statement here
            }
        }

        const afSuiData = await apy();

        ctx.meter.Gauge("afSuiApy").record(afSuiData);
    }, 60, 60)

}
export function ValidatorProcessor() {

    SuiObjectProcessor.bind({
        objectId: "0x96df0fce3c471489f4debaaa762cf960b3d97820bd1f3f025ff8190730e958c5",
        network: ChainId.SUI_MAINNET,
        startCheckpoint: 51293457n
    }).onTimeInterval(async (self, _, ctx) => {

        const valiData = async function () {
            try {
                const response = await axios.get('https://open-api.naviprotocol.io/api/volo/stats');
                const data = response.data.data;

                return data;
            } catch (error) {
                console.error(error);
            }
        }

        const vsData = await valiData();
        const validators = vsData.validators;
        for (let i = 0; i < validators.length; i++) {
            if (validators[i].name) {
                ctx.meter.Gauge("validatorData").record(Number(validators[i].totalStaked), { name: validators[i].name });
            }
        }

        ctx.meter.Gauge("voloTotalStaked").record(vsData.totalStaked);

    }, 60, 60)

}

PoolProcessor();
PoolProcessor1();
PoolProcessor2();
ValidatorProcessor();
native_pool.bind({
    startCheckpoint: 16000000n
})
    .onEventStakedEvent(stakeHandler)
    .onEventUnstakedEvent(unstakeHandler)
    .onEventFeeCollectedEvent(feeCollectedEventHandler)
    .onEventRewardsUpdated(rewardUpdateEventHandle)
    .onEventRatioUpdatedEvent(ratioEventHandle)


