import { BigDecimal } from "@sentio/sdk"
import { SuiObjectProcessor } from "@sentio/sdk/sui"
import { ChainId } from "@sentio/chain"
import { DECIMAL_RAY, COIN, DEFAULT_COIN_DECIMAL } from "./utils.js"

const reserves = [
    "0xab644b5fd11aa11e930d1c7bc903ef609a9feaf9ffe1b23532ad8441854fbfaf", // Reserve For SUI
    "0xeb3903f7748ace73429bd52a70fff278aac1725d3b58afa781f25ce3450ac203", // Reserve For USDC
    "0xb8c5eab02a0202f638958cc79a69a2d30055565caad1684b3c8bbca3bddcb322",  // Reserve For USDT
    "0xafecf4b57899d377cc8c9de75854c68925d9f512d0c47150ca52a0d3a442b735",  // Reserve For WETH
]

export function ProtocolProcessor() {

    for (let i = 0; i < reserves.length; i++) {
        SuiObjectProcessor.bind({
            objectId: reserves[i],
            network: ChainId.SUI_MAINNET,
            startCheckpoint: 7800000n
        }).onTimeInterval(async (self, _, ctx) => {
            try {
                //@ts-ignore
                const type = String(self.fields.value.fields.coin_type)
                //@ts-ignore
                const id = String(self.fields.value.fields.id)
                //@ts-ignore
                const ltv = BigDecimal(self.fields.value.fields.ltv).div(Math.pow(10, DECIMAL_RAY))
                const coin_symbol = COIN[i]
                //@ts-ignore
                const totalSupply = BigDecimal(self.fields.value.fields.supply_balance.fields.total_supply).div(Math.pow(10, DEFAULT_COIN_DECIMAL))
                //@ts-ignore
                const totalBorrow = BigDecimal(self.fields.value.fields.borrow_balance.fields.total_supply).div(Math.pow(10, DEFAULT_COIN_DECIMAL))
                //@ts-ignore
                const currentSupplyIndex = BigDecimal(self.fields.value.fields.current_supply_index).div(Math.pow(10, DECIMAL_RAY))
                //@ts-ignore
                const currentBorrowIndex = BigDecimal(self.fields.value.fields.current_borrow_index).div(Math.pow(10, DECIMAL_RAY))
                //add
                //@ts-ignore
                const supplyCapCelling = BigDecimal(self.fields.value.fields.supply_cap_ceiling).div(Math.pow(10, DECIMAL_RAY))
                //@ts-ignore
                const borrowCapCeiling = BigDecimal(self.fields.value.fields.borrow_cap_ceiling).div(Math.pow(10, DECIMAL_RAY))
                //@ts-ignore
                const treasuryBalance = BigDecimal(self.fields.value.fields.treasury_balance).div(Math.pow(10, DEFAULT_COIN_DECIMAL))
                //@ts-ignore
                const currentBorrowRate = BigDecimal(self.fields.value.fields.current_borrow_rate).div(Math.pow(10, DECIMAL_RAY))
                //@ts-ignore
                const currentSupplyRate = BigDecimal(self.fields.value.fields.current_supply_rate).div(Math.pow(10, DECIMAL_RAY))

                // const supply rate
                // const borrow rate

                ctx.meter.Gauge("total_supply").record(totalSupply, { env: "mainnet", id, type, coin_symbol })
                ctx.meter.Gauge("total_borrow").record(totalBorrow, { env: "mainnet", id, type, coin_symbol })

                ctx.meter.Gauge("currentSupplyIndex").record(currentSupplyIndex, { env: "mainnet", id, type, coin_symbol })
                ctx.meter.Gauge("currentBorrowIndex").record(currentBorrowIndex, { env: "mainnet", id, type, coin_symbol })

                ctx.meter.Gauge("supplyCapCeiling").record(supplyCapCelling, { env: "mainnet", id, type, coin_symbol })
                ctx.meter.Gauge("borrowCapCeiling").record(borrowCapCeiling, { env: "mainnet", id, type, coin_symbol })

                // supply rate
                // borrow rate
                ctx.meter.Gauge("currentBorrowRate").record(currentBorrowRate, { env: "mainnet", id, type, coin_symbol })
                ctx.meter.Gauge("currentSupplyRate").record(currentSupplyRate, { env: "mainnet", id, type, coin_symbol })

                ctx.meter.Gauge("ltv").record(ltv, { env: "mainnet", id, type, coin_symbol })
                ctx.meter.Gauge("treasuryBalance").record(treasuryBalance, { env: "mainnet", id, type, coin_symbol })

            } catch (e) {
                console.log(e)
                console.log(JSON.stringify(self))
            }
        })
    }
}