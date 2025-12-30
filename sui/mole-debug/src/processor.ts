import { Counter, Gauge } from '@sentio/sdk'
import { SuiNetwork, SuiObjectProcessorTemplate, SuiObjectProcessor, SuiWrappedObjectProcessor } from "@sentio/sdk/sui"
import { vault, vault_config, managed_vault_config } from './types/sui/0x5ffa69ee4ee14d899dcc750df92de12bad4bacf81efa1ae12ee76406804dda7f.js'
import { cetus_clmm_worker } from './types/sui/0x334bed7f6426c1a3710ef7f4d66b1225df74146372b40a64e9d0cbfc76d76e67.js'
import { pool } from './types/sui/0x1eabed72c53feb3805120a081dc15963c204dc8d091542592abaf7a35689b2fb.js'
import { getPriceByType, token } from "@sentio/sdk/utils"
import { buildCoinInfo } from './utils/mole_utils.js'
import { ANY_TYPE, BUILTIN_TYPES, TypeDescriptor, parseMoveType } from '@sentio/sdk/move'
import { string$ } from "@sentio/sdk/sui/builtin/0x1";
import { dynamic_field } from "@sentio/sdk/sui/builtin/0x2";


// vault.bind({
//   address: '0x5ffa69ee4ee14d899dcc750df92de12bad4bacf81efa1ae12ee76406804dda7f',
//   network: SuiNetwork.MAIN_NET,
//   // startCheckpoint: 4000000n
//   startCheckpoint: 20000000n
// })
//   .onEventDepositEvent(
//     async (event, ctx) => {
//       const coinType = event.type_arguments[0]

//       const coinInfo = await buildCoinInfo(ctx, coinType)
//       const coin_symbol = coinInfo.symbol

//       const amount = Number(event.data_decoded.amount) / Math.pow(10, coinInfo.decimal)
//       const share = Number(event.data_decoded.share) / Math.pow(10, coinInfo.decimal)

//       const price = await getPriceByType(SuiNetwork.MAIN_NET, coinType, ctx.timestamp)
//       const amount_usd = amount * price!

//       ctx.meter.Counter("vault_deposit_amount_usd").add(amount_usd, { coin_symbol,  project: "mole" })
//       ctx.meter.Counter("vault_deposit_counter").add(1, { coin_symbol,  project: "mole" })

//       ctx.eventLogger.emit("VaultDepositEvent", {
//         distinctId: event.sender,
//         amount: amount,
//         amount_usd: amount_usd,
//         share: share,
//         project: "mole"
//       })
//     },
//   )

//   .onEventWithdrawEvent(
//     async (event, ctx) => {
//       const coinType = event.type_arguments[0]

//       const coinInfo = await buildCoinInfo(ctx, coinType)
//       const coin_symbol = coinInfo.symbol

//       const amount = Number(event.data_decoded.amount) / Math.pow(10, coinInfo.decimal)
//       const share = Number(event.data_decoded.share) / Math.pow(10, coinInfo.decimal)

//       const price = await getPriceByType(SuiNetwork.MAIN_NET, coinType, ctx.timestamp)
//       const amount_usd = amount * price!

//       ctx.meter.Counter("vault_withdraw_amount_usd").add(amount_usd, { coin_symbol,  project: "mole" })
//       ctx.meter.Counter("vault_withdraw_counter").add(1, { coin_symbol,  project: "mole" })

//       ctx.eventLogger.emit("VaultWithdrawEvent", {
//         distinctId: event.sender,
//         amount: amount,
//         amount_usd: amount_usd,
//         share: share,
//         project: "mole"
//       })
//     },
//   )

//   .onEventAddDebtEvent(
//     async (event, ctx) => {
//       const coinType = event.type_arguments[0]

//       const coinInfo = await buildCoinInfo(ctx, coinType)
//       const coin_symbol = coinInfo.symbol

//       const debt_share = Number(event.data_decoded.debt_share) / Math.pow(10, coinInfo.decimal)

//       const price = await getPriceByType(SuiNetwork.MAIN_NET, coinType, ctx.timestamp)
//       const debt_share_usd = debt_share * price!

//       ctx.meter.Counter("vault_add_debt_share_usd").add(debt_share_usd, { coin_symbol,  project: "mole" })

//       ctx.eventLogger.emit("VaultAddDebtEvent", {
//         distinctId: event.sender,
//         debt_share: debt_share,
//         debt_share_usd: debt_share_usd,
//         project: "mole"
//       })
//     },
//   )

//   .onEventRemoveDebtEvent(
//     async (event, ctx) => {
//       const coinType = event.type_arguments[0]

//       const coinInfo = await buildCoinInfo(ctx, coinType)
//       const coin_symbol = coinInfo.symbol

//       const debt_share = Number(event.data_decoded.debt_share) / Math.pow(10, coinInfo.decimal)

//       const price = await getPriceByType(SuiNetwork.MAIN_NET, coinType, ctx.timestamp)
//       const debt_share_usd = debt_share * price!

//       ctx.meter.Counter("vault_remove_debt_share_usd").add(debt_share_usd, {coin_symbol,  project: "mole" })

//       ctx.eventLogger.emit("VaultRemoveDebtEvent", {
//         distinctId: event.sender,
//         debt_share: debt_share,
//         debt_share_usd: debt_share_usd,
//         project: "mole"
//       })

//     },
//   )

//   .onEventWorkEvent(
//     async (event, ctx) => {
//       const coinType = event.type_arguments[0]

//       const coinInfo = await buildCoinInfo(ctx, coinType)
//       const coin_symbol = coinInfo.symbol

//       const loan = Number(event.data_decoded.loan) / Math.pow(10, coinInfo.decimal)
//       const price = await getPriceByType(SuiNetwork.MAIN_NET, coinType, ctx.timestamp)
//       const loan_usd = loan * price!

//       ctx.meter.Counter("work_loan_usd").add(loan_usd, { coin_symbol,  project: "mole" })
//       ctx.meter.Counter("work_counter").add(1, { coin_symbol,  project: "mole" })

//       ctx.eventLogger.emit("VaultWorkerEvent", {
//         distinctId: event.sender,
//         loan: loan,
//         loan_usd: loan_usd,
//         project: "mole"
//       })

//     },
//   )

//   .onEventKillEvent(
//     async (event, ctx) => {
//       const coinType = event.type_arguments[0]

//       const coinInfo = await buildCoinInfo(ctx, coinType)
//       const coin_symbol = coinInfo.symbol
//       const price = await getPriceByType(SuiNetwork.MAIN_NET, coinType, ctx.timestamp)

//       const debt = Number(event.data_decoded.debt) / Math.pow(10, coinInfo.decimal)

//       const posVal = Number(event.data_decoded.posVal) / Math.pow(10, coinInfo.decimal)
//       const posVal_usd = posVal * price!

//       const prize = Number(event.data_decoded.prize) / Math.pow(10, coinInfo.decimal)

//       ctx.meter.Counter("kill_posVal_usd").add(posVal_usd, { coin_symbol,  project: "mole" })
//       ctx.meter.Counter("kill_counter").add(1, { coin_symbol,  project: "mole" })

//       ctx.eventLogger.emit("VaultKillEvent", {
//         distinctId: event.sender,
//         debt: debt,
//         posVal: posVal,
//         posVal_usd: posVal_usd,
//         prize: prize,
//         project: "mole"
//       })
//     },
//   )

//   .onEventAddCollateralEvent(
//     async (event, ctx) => {
//       const coinType = event.type_arguments[0]

//       const coinInfo = await buildCoinInfo(ctx, coinType)
//       const coin_symbol = coinInfo.symbol
//       const price = await getPriceByType(SuiNetwork.MAIN_NET, coinType, ctx.timestamp)

//       const amount = Number(event.data_decoded.amount) / Math.pow(10, coinInfo.decimal)
//       const amount_usd = amount * price!

//       ctx.meter.Counter("add_collateral_amount_usd").add(amount_usd, { coin_symbol,  project: "mole" })

//       ctx.meter.Counter("add_collateral_counter").add(1, { coin_symbol,  project: "mole" })

//       ctx.eventLogger.emit("VaultAddCollateralEvent", {
//         distinctId: event.sender,
//         amount: amount,
//         amount_usd: amount_usd,
//         project: "mole"
//       })
//     },
//   )




// pool.bind({
//   address: constant.CLMM_MAINNET,
//   network: SuiNetwork.MAIN_NET,
//   startCheckpoint: 4000000n
// })
// .onEventAddLiquidityEvent(async (event, ctx) => {
//   const pool = event.data_decoded.pool
//   // black list
//   if (constant.POOLS_TVL_BLACK_LIST.includes(pool)) { return }
//   // white list
//   if (!constant.POOLS_MOLE_LIST.includes(pool)) { return }

//   const poolInfo = await helper.getOrCreatePool(ctx, pool)
//   const pairName = poolInfo.pairName
//   const decimal_a = poolInfo.decimal_a
//   const decimal_b = poolInfo.decimal_b

//   const position = event.data_decoded.position
//   const tick_lower = Number(event.data_decoded.tick_lower.bits)
//   const tick_upper = Number(event.data_decoded.tick_upper.bits)
//   const liquidity = Number(event.data_decoded.liquidity)
//   const after_liquidity = Number(event.data_decoded.after_liquidity)
//   const amount_a = Number(event.data_decoded.amount_a) / Math.pow(10, decimal_a)
//   const amount_b = Number(event.data_decoded.amount_b) / Math.pow(10, decimal_b)

//   const [value_a, value_b] = await helper.calculateValue_USD(ctx, pool, amount_a, amount_b, ctx.timestamp)

//   const value = value_a + value_b

//   ctx.eventLogger.emit("AddLiquidityEvent", {
//     //@ts-ignore
//     distinctId: ctx.transaction.transaction.data.sender,
//     pool,
//     position,
//     tick_lower,
//     tick_upper,
//     liquidity,
//     after_liquidity,
//     amount_a,
//     amount_b,
//     value,
//     pairName,
//     project: "mole",
//     message: `Add USD$${value} Liquidity in ${pairName}`
//   })
//   ctx.meter.Counter("add_liquidity_usd").add(value, { pairName, project: "mole" })
//   ctx.meter.Counter("add_liquidity_counter").add(value, { pairName,  project: "mole" })

// })
// .onEventRemoveLiquidityEvent(async (event, ctx) => {
//   const pool = event.data_decoded.pool
//   // black list
//   if (constant.POOLS_TVL_BLACK_LIST.includes(pool)) { return }
//   // white list
//   if (!constant.POOLS_MOLE_LIST.includes(pool)) { return }

//   const poolInfo = await helper.getOrCreatePool(ctx, pool)
//   const pairName = poolInfo.pairName
//   const decimal_a = poolInfo.decimal_a
//   const decimal_b = poolInfo.decimal_b

//   const position = event.data_decoded.position
//   const tick_lower = Number(event.data_decoded.tick_lower.bits)
//   const tick_upper = Number(event.data_decoded.tick_upper.bits)
//   const liquidity = Number(event.data_decoded.liquidity)
//   const after_liquidity = Number(event.data_decoded.after_liquidity)
//   const amount_a = Number(event.data_decoded.amount_a) / Math.pow(10, decimal_a)
//   const amount_b = Number(event.data_decoded.amount_b) / Math.pow(10, decimal_b)

//   const [value_a, value_b] = await helper.calculateValue_USD(ctx, pool, amount_a, amount_b, ctx.timestamp)
//   const value = value_a + value_b

//   ctx.eventLogger.emit("RemoveLiquidityEvent", {
//     //@ts-ignore
//     distinctId: ctx.transaction.transaction.data.sender,
//     pool,
//     position,
//     tick_lower,
//     tick_upper,
//     liquidity,
//     after_liquidity,
//     amount_a,
//     amount_b,
//     value,
//     pairName,
//     project: "mole",
//     message: `Remove USD$${value} Liquidity in ${pairName}`
//   })
//   ctx.meter.Counter("remove_liquidity_usd").add(value, { pairName, project: "mole" })
//   ctx.meter.Counter("remove_liquidity_counter").add(value, { pairName,  project: "mole" })

// })




SuiWrappedObjectProcessor.bind({
  objectId: "0x0dcd6ff3155967823494c7d4dd3bc952e551102879562ff7c75019b290281583", //object owner address
  network: SuiNetwork.MAIN_NET,
  startCheckpoint: 20000000n
})
  .onTimeInterval(async (dynamicFieldObjects, ctx) => {
    try {
      console.log("hellp, onTimeInterval")
      // console.log("object 0", dynamicFieldObjects[0])

      const fieldType: TypeDescriptor<dynamic_field.Field<string$.String, vault.VaultInfo<any>>>
        = dynamic_field.Field.type(string$.String.type(), vault.VaultInfo.type(ANY_TYPE))

      const fields = await ctx.coder.filterAndDecodeObjects(fieldType, dynamicFieldObjects)

      for (const field of fields) {
        const coinType = parseMoveType(field.type).typeArgs[1].typeArgs[0].qname
        const fieldDecoded = field.data_decoded
        const value = fieldDecoded.value
        console.log(`pos ${coinType}, ${JSON.stringify(value)}`)
      }
    }
    catch (e) {
      console.log(`${e.message} error at ${JSON.stringify(self)}`)
    }
  }, 1000, 240, undefined, { owned: true })
