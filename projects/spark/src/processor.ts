import { OrderbookProcessor } from "./types/fuel/OrderbookProcessor.js";
import { FuelNetwork } from "@sentio/sdk/fuel";
import { GLOBAL_CONFIG } from '@sentio/runtime';

GLOBAL_CONFIG.execution = {
  sequential: true,
};

OrderbookProcessor.bind({
  chainId: FuelNetwork.TEST_NET,
  address: '0x7134802bdefd097f1c9d8ad86ef27081ae609b84de0afc87b58bd4e04afc6a23'
}).onCallMatch_orders(async (order, ctx) => {
  const sellId = order.args[0]
  const buyId = order.args[1]

}, {})