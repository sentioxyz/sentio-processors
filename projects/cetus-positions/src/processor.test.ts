import { getClient, SuiNetwork } from "@sentio/sdk/sui";
import { fetchPositions, getDecodedPositions, getPoolPricesByTime, getPositionOwner } from "./positions.js";
import { BigDecimal } from "@sentio/sdk";

const client = getClient(SuiNetwork.MAIN_NET);
const ctx = { client, timestamp: new Date() } as any;

// const prices = await getPoolPricesByTime(Date.now() / 1000)
// console.log(prices)


// getPositionOwners(ctx, ["0x78793e79269486b01c2d6d09d665431dce834524754e6da1ab7c76daf5b48400", "0xa88dcc42e0bd555a780bdc753502b800c97a709cc9c734d5ca2982e43d899b6e"])
// const r = await getDecodedPositions(ctx);
// for (const t of r) {
//   if (t.amountA.gt(new BigDecimal(0))) {
//     console.log(t);
//   }
// }


console.log(await getPositionOwner(ctx, "0x4d180c792147c104258a65057a3f097e4217bf62310fd99358144a856b9e61a7"))