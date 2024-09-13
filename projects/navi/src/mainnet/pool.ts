import { SuiObjectProcessor } from "@sentio/sdk/sui"
import { ChainId } from "@sentio/chain"
import { BigDecimal } from "@sentio/sdk"
import { COIN_MAP, SymbolMatcher } from "./utils.js";

const pools = [
    "0x96df0fce3c471489f4debaaa762cf960b3d97820bd1f3f025ff8190730e958c5", // Treasury Pool For SUI
    "0xa02a98f9c88db51c6f5efaaf2261c81f34dd56d86073387e0ef1805ca22e39c8", // Treasury Pool For USDC
    "0x0e060c3b5b8de00fb50511b7a45188c8e34b6995c01f69d98ea5a466fe10d103", // Treasury Pool For USDT
    "0x71b9f6e822c48ce827bceadce82201d6a7559f7b0350ed1daa1dc2ba3ac41b56",  // Treasury Pool For WETH
    "0x3c376f857ec4247b8ee456c1db19e9c74e0154d4876915e54221b5052d5b1e2e",  //Treasury Pool For CETUS
    "0x9790c2c272e15b6bf9b341eb531ef16bcc8ed2b20dfda25d060bf47f5dd88d01",  // Treasury Pool For VoloSui
    "0x6fd9cb6ebd76bc80340a9443d72ea0ae282ee20e2fd7544f6ffcd2c070d9557a", //Treasury Pool For haSui
    "0xc0e02e7a245e855dd365422faf76f87d9f5b2148a26d48dda6e8253c3fe9fa60",  // Treasury Pool For NAVX
    "0xd162cbe40f8829ce71c9b3d3bf3a83859689a79fa220b23d70dc0300b777ae6e",// Treasury Pool For WBTC
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

            //@ts-ignore
            const decimal = self.fields.decimal;
            //@ts-ignore
            const balance = BigDecimal(self.fields.balance).div(Math.pow(10, decimal));
            //@ts-ignore
            const treasuryBalance = BigDecimal(self.fields.treasury_balance).div(Math.pow(10, decimal));

            //TODO
            ctx.meter.Gauge("balanceForPool").record(balance, { env: "mainnet", type, coin_type, coin_symbol });
            ctx.meter.Gauge("treasuryBalanceForPool").record(treasuryBalance, { env: "mainnet", type, coin_type, coin_symbol });
        })
    }
}
