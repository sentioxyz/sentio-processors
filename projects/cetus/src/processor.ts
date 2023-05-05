import { SuiNetwork } from "@sentio/sdk/sui"
import { pool, factory } from "./types/sui/testnet/clmm.js"
import { pool_script } from "./types/sui/testnet/integrate.js"
import { SuiObjectProcessor } from "@sentio/sdk/sui"

export const CLMM_MAINNET = "0x1eabed72c53feb3805120a081dc15963c204dc8d091542592abaf7a35689b2fb"
export const INTEGRATE_MAINNET = "0x2eeaab737b37137b94bfa8f841f92e36a153641119da3456dec1926b9960d9be"

export const POOLS_INFO_MAINNET: { [address: string]: { pairName: string } } = {
  "0xc8d7a1503dc2f9f5b05449a87d8733593e2f0f3e7bffd90541252782e4d2ca20": { pairName: "USDT-USDC" },
  "0x5b0b24c27ccf6d0e98f3a8704d2e577de83fa574d3a9060eb8945eeb82b3e2df": { pairName: "WETH-USDC" },
  "0xcf994611fd4c48e277ce3ffd4d4364c914af2c3cbb05f7bf6facd371de688630": { pairName: "SUI-USDC" },
  "0xc93fb2ccd960bd8e369bd95a7b2acd884abf45943e459e95835941322e644ef1": { pairName: "USDCso-USDC" },
  "0xad1b2a78890b46eb47d872916df18d2bf3f4629c244539989b3a8546b5a0b4ed": { pairName: "SHIBA-USDC" }
}

export const POOLS_COIN_INFO_MAINNET: { [address: string]: { coin_a_address: string, coin_b_address: string } } = {
  "0xc8d7a1503dc2f9f5b05449a87d8733593e2f0f3e7bffd90541252782e4d2ca20": { coin_a_address: "0xc060006111016b8a020ad5b33834984a437aaa7d3c74c18e09a95d48aceab08c", coin_b_address: "0x5d4b302506645c37ff133b98c4b50a5ae14841659738d6d733d59d0d217a93bf" },
  "0x5b0b24c27ccf6d0e98f3a8704d2e577de83fa574d3a9060eb8945eeb82b3e2df": { coin_a_address: "0xaf8cd5edc19c4512f4259f0bee101a40d41ebed738ade5874359610ef8eeced5", coin_b_address: "0x5d4b302506645c37ff133b98c4b50a5ae14841659738d6d733d59d0d217a93bf" },
  "0xcf994611fd4c48e277ce3ffd4d4364c914af2c3cbb05f7bf6facd371de688630": { coin_a_address: "0x2", coin_b_address: "0x5d4b302506645c37ff133b98c4b50a5ae14841659738d6d733d59d0d217a93bf" },
  "0xc93fb2ccd960bd8e369bd95a7b2acd884abf45943e459e95835941322e644ef1": { coin_a_address: "0xb231fcda8bbddb31f2ef02e6161444aec64a514e2c89279584ac9806ce9cf037", coin_b_address: "0x5d4b302506645c37ff133b98c4b50a5ae14841659738d6d733d59d0d217a93bf" },
  "0xad1b2a78890b46eb47d872916df18d2bf3f4629c244539989b3a8546b5a0b4ed": { coin_a_address: "0xd01cebc27fe22868df462f33603646549e13a4b279f5e900b99b9843680445e1", coin_b_address: "0x5d4b302506645c37ff133b98c4b50a5ae14841659738d6d733d59d0d217a93bf" }
}

const CoinInfoMap_MAINNET: { [address: string]: { symbol: string, decimal: number } } = {
  "0xc060006111016b8a020ad5b33834984a437aaa7d3c74c18e09a95d48aceab08c": {
    symbol: "USDT", decimal: 6
  },
  "0x5d4b302506645c37ff133b98c4b50a5ae14841659738d6d733d59d0d217a93bf": {
    symbol: "USDC", decimal: 6
  },
  "0xaf8cd5edc19c4512f4259f0bee101a40d41ebed738ade5874359610ef8eeced5": {
    symbol: "WETH", decimal: 8
  },
  "0x027792d9fed7f9844eb4839566001bb6f6cb4804f66aa2da6fe1ee242d896881": {
    symbol: "WBTC", decimal: 8
  },
  "0x2": {
    symbol: "SUI", decimal: 9
  },
  "0xb231fcda8bbddb31f2ef02e6161444aec64a514e2c89279584ac9806ce9cf037": {
    symbol: "USDCSO", decimal: 6
  },
  "0xd01cebc27fe22868df462f33603646549e13a4b279f5e900b99b9843680445e1": {
    symbol: "SHIBA", decimal: 6
  }
}

factory.bind({
  address: CLMM_MAINNET,
  network: SuiNetwork.MAIN_NET,
  //startCheckpoint: BigInt(2602665)
})
  .onEventCreatePoolEvent((event, ctx) => {
    ctx.meter.Counter("create_pool_counter").add(1)
    const coin_type_a = event.data_decoded.coin_type_a
    const coin_type_b = event.data_decoded.coin_type_b
    const pool_id = event.data_decoded.pool_id
    const tick_spacing = event.data_decoded.tick_spacing
    ctx.eventLogger.emit("CreatePoolEvent", {
      distinctId: ctx.transaction.sender,
      pool_id,
      coin_type_a,
      coin_type_b,
      tick_spacing
    })
  })

pool.bind({
  address: CLMM_MAINNET,
  network: SuiNetwork.MAIN_NET,
  //startCheckpoint: BigInt(2602665)
})
  .onEventSwapEvent(async (event, ctx) => {
    ctx.meter.Counter("swap_counter").add(1)
    const pool = event.data_decoded.pool

    //TODO: adding getClient support for sui
    const coin_a_address = POOLS_COIN_INFO_MAINNET[pool].coin_a_address
    const coin_b_address = POOLS_COIN_INFO_MAINNET[pool].coin_b_address

    const before_sqrt_price = Number(event.data_decoded.before_sqrt_price)
    const after_sqrt_price = Number(event.data_decoded.after_sqrt_price)
    const amount_in = Number(event.data_decoded.amount_in) / Math.pow(10, CoinInfoMap_MAINNET[coin_a_address].decimal)
    const amount_out = Number(event.data_decoded.amount_out) / Math.pow(10, CoinInfoMap_MAINNET[coin_b_address].decimal)
    const fee_amount = Number(event.data_decoded.fee_amount)
    ctx.eventLogger.emit("SwapEvent", {
      distinctId: ctx.transaction.sender,
      pool,
      before_sqrt_price,
      after_sqrt_price,
      amount_in,
      amount_out,
      fee_amount,
      coin_symbol: CoinInfoMap_MAINNET[coin_b_address].symbol.toLowerCase()
    })
  })
// .onEventCollectRewardEvent(async (event, ctx) => {
//   ctx.meter.Counter("collect_reward_counter").add(1)
//   const position = event.data_decoded.position
//   const pool = event.data_decoded.pool
//   const amount = event.data_decoded.amount
//   ctx.eventLogger.emit("CollectRewardEvent", {
//     distinctId: ctx.transaction.sender,
//     position,
//     pool,
//     amount
//   })
// })

//mainnet pool test usdt-usdc
for (const pool_addresses in POOLS_INFO_MAINNET) {
  SuiObjectProcessor.bind({
    objectId: pool_addresses,
    network: SuiNetwork.MAIN_NET,
    // startCheckpoint: BigInt(1698922)
  }).onTimeInterval(async (self, _, ctx) => {

    if (!self) return

    const pairName = POOLS_INFO_MAINNET[pool_addresses].pairName
    //get coin addresses
    const type = self.type
    const regex = /0x[a-fA-F0-9]+:/g
    const matches = type.match(regex)
    let coin_a_address = ""
    let coin_b_address = ""
    if (matches && matches.length >= 2) {
      coin_a_address = type.match(regex)[1].slice(0, -1)
      coin_b_address = type.match(regex)[2].slice(0, -1)
    }

    //get coin balance
    const pool_info = await ctx.coder.decodedType(self, pool.Pool.type())
    // const coin_a_balance = Number(pool_info?.coin_a) / Math.pow(10, 6)
    // const coin_b_balance = Number(pool_info?.coin_b) / Math.pow(10, 6)
    const coin_a_balance = Number(self.fields.coin_a) / Math.pow(10, CoinInfoMap_MAINNET[coin_a_address].decimal)
    const coin_b_balance = Number(self.fields.coin_b) / Math.pow(10, CoinInfoMap_MAINNET[coin_b_address].decimal)

    if (coin_a_balance) {
      ctx.meter.Gauge('coin_a_balance').record(coin_a_balance, {
        coin_symbol: CoinInfoMap_MAINNET[coin_a_address].symbol.toLowerCase(),
        pairName
      })
    }
    // else { console.log("empty a ", JSON.stringify(pool_info), ctx.timestamp) }

    if (coin_b_balance) {
      ctx.meter.Gauge('coin_b_balance').record(coin_b_balance, {
        coin_symbol: CoinInfoMap_MAINNET[coin_b_address].symbol.toLowerCase(),
        pairName
      })
    }
    // else { console.log("empty b ", JSON.stringify(pool_info), ctx.timestamp) }
    const fee_rate = Number(self.fields.fee_rate)
    const liquidity = Number(self.fields.liquidity)
    const current_sqrt_price = Number(self.fields.current_sqrt_price)
    let coin_a2b_price = Number(current_sqrt_price) ** 2 / (2 ** 192)

    ctx.meter.Gauge("a2b_price").record(coin_a2b_price, { pairName })
    ctx.meter.Gauge("liquidity").record(liquidity, { pairName })


  }, 1440, 60)
}