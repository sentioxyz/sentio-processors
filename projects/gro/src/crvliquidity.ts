import { CrvtokenContext, CrvtokenProcessor, TransferEvent } from "./types/eth/crvtoken.js";
import { CRV3_TOKEN } from "./constant.js";
import { getAddress } from 'ethers'
import { Gauge } from "@sentio/sdk";

const DECIMAL = 18

export const volOptions = {
    sparse: false,
    aggregationConfig: {
        intervalInMinutes: [60],
    }
}
const crv3_mint = Gauge.register("crv3_mint")
const crv3_burn = Gauge.register("crv3_burn")

function isNullAddress(address: string) {
    try {
      // Normalize the input address
      const normalizedAddress = getAddress(address);
      // Check if the normalized address is equal to the null address (all zeros)
      return normalizedAddress === '0x0000000000000000000000000000000000000000';
    } catch (error) {
      // If the getAddress function throws an error, the input is not a valid address
      return false;
    }
  }

const transferHandler = async function(event: TransferEvent, ctx: CrvtokenContext) {
    const from = event.args._from
    const to = event.args._to
    const amount = event.args._value.scaleDown(DECIMAL)
    const totalSupply = (await ctx.contract.totalSupply({blockTag: ctx.blockNumber})).scaleDown(DECIMAL)
    const changeRatio = amount.div(totalSupply)
    // there is no mint and burn events on CRV tokens -- it only uses transfer event
    if (isNullAddress(from)) {
        ctx.eventLogger.emit("mint", {
            distinctId: to,
            to: to,
            amount: amount,
            changeRatio: changeRatio,
            message: `${amount} CRV minted to ${to}`
        })
        crv3_mint.record(ctx, amount)
        
    } else if (isNullAddress(to)) {
        ctx.eventLogger.emit("burn", {
            distinctId: from,
            from: from,
            amount: amount,
            changeRatio: changeRatio,
            message: `${amount} CRV burned by ${to}`
        })
        crv3_burn.record(ctx, amount)
    } else {
        ctx.eventLogger.emit("transfer", {
            distinctId: from,
            from: from,
            to: to,
            amount: amount,
            changeRatio: changeRatio,
            message: `${amount} CRV transferred from ${from} to ${to}`
        })
    }

}

// 
CrvtokenProcessor.bind({address: CRV3_TOKEN, startBlock: 14915127})
.onEventTransfer(transferHandler)