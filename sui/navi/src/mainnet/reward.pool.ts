import { SuiObjectProcessor } from "@sentio/sdk/sui"
import { ChainId } from "@sentio/chain"
import { BigDecimal } from "@sentio/sdk"
import { COIN_MAP, SymbolMatcher } from "./utils.js";

const rewardPools = [
    "0x9180e0b8758f4b03f74fa3fa1350ae023af88bc2b5b347352a298b8ad547b7f5", // Reward Pool For SUI
    "0x6c5d1f05ca6794ff24ea6bd5e1ee93ecae82b65e7f4361aa0a2d5f8b985b6639", // Reward Pool For USDC
    "0x8d146663da3afc111f8e7dd197591c01a950049ed552f940bc20927411072ca2", // Reward Pool For SUI
    "0x595c64e52d44ddac6e84fa55ddec7b993526ca73ea8df1f0887a05307ce09435", // Reward Pool For USDC
]

export function PoolProcessor() {
    for (let pool of rewardPools) {
        SuiObjectProcessor.bind({
            objectId: pool,
            network: ChainId.SUI_MAINNET,
            startCheckpoint: 7800000n
        }).onTimeInterval(async (self, data, ctx) => {
            //TODO: find out the token type
            const type = String(self.type);
            const coin_type = SymbolMatcher(type);
            const coin_symbol = COIN_MAP[coin_type];

            //@ts-ignore
            const decimal = self.fields.decimal;
            //@ts-ignore
            const distributedAmountForRewardPool = BigDecimal(self.fields.distributed_amount).div(Math.pow(10, decimal));
            //@ts-ignore
            const balanceForRewardPool = BigDecimal(self.fields.balance).div(Math.pow(10, decimal));
            //@ts-ignore
            const assetForRewardPool = self.fields.asset;
            //@ts-ignore
            const currentIdxForRewardPool = self.fields.current_idx;


            //TODO: 
            ctx.meter.Gauge("distributedAmountForRewardPool").record(distributedAmountForRewardPool, { env: "mainnet", type, coin_type, coin_symbol });
            ctx.meter.Gauge("balanceForRewardPool").record(balanceForRewardPool, { env: "mainnet", type, coin_type, coin_symbol });
            ctx.meter.Gauge("assetForRewardPool").record(assetForRewardPool, { env: "mainnet", type, coin_type, coin_symbol });
            ctx.meter.Gauge("currentIdxForRewardPool").record(currentIdxForRewardPool, { env: "mainnet", type, coin_type, coin_symbol });
        
        })
    }
}
