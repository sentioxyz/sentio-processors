import { SuiObjectProcessor } from "@sentio/sdk/sui"
import { ChainId } from "@sentio/chain"
import { BigDecimal } from "@sentio/sdk"
import { COIN_MAP, SymbolMatcher } from "./utils.js";

const pools = [
    "0x96df0fce3c471489f4debaaa762cf960b3d97820bd1f3f025ff8190730e958c5", // Treasury Pool For SUI
    "0xa02a98f9c88db51c6f5efaaf2261c81f34dd56d86073387e0ef1805ca22e39c8", // Treasury Pool For USDC
    "0x0e060c3b5b8de00fb50511b7a45188c8e34b6995c01f69d98ea5a466fe10d103", // Treasury Pool For USDT
    "0x71b9f6e822c48ce827bceadce82201d6a7559f7b0350ed1daa1dc2ba3ac41b56",  // Treasury Pool For WETH
]

export function PoolProcessor() {
    for (let pool of pools) {
        SuiObjectProcessor.bind({
            objectId: pool,
            network: ChainId.SUI_MAINNET,
            startCheckpoint: 7800000n
        }).onTimeInterval(async (self, data, ctx) => {
            const type = String(self.type);
            const coin_type = SymbolMatcher(type);
            const coin_symbol = COIN_MAP[coin_type];

            const decimal = self.fields.decimal;
            const balance = BigDecimal(self.fields.balance).div(Math.pow(10, decimal));
            const treasuryBalance = BigDecimal(self.fields.treasury_balance).div(Math.pow(10, decimal));

            //TODO
            ctx.meter.Gauge("balanceForPool").record(balance, { env: "mainnet", type, coin_type, coin_symbol });
            ctx.meter.Gauge("treasuryBalanceForPool").record(treasuryBalance, { env: "mainnet", type, coin_type, coin_symbol });
        })
    }
}
