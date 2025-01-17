// // import { pool, pool_factory } from "./types/sui/turbos.js";
// import { SuiObjectProcessor, SuiContext, SuiObjectContext, SuiObjectProcessorTemplate } from "@sentio/sdk/sui"
// // import * as constant from './constant-turbos.js'
// import { ChainId } from "@sentio/chain"
// import { BUILTIN_TYPES } from "@sentio/sdk/move"
// import { Gauge, scaleDown } from "@sentio/sdk";
// import { pool } from "./types/sui/testnet/0x8ba6cdd02f5d1b9ff9970690681c21957d9a6a6fbb74546b2f0cfb16dbff4c25.js"
// import { lending as lendingTestnet } from "./types/sui/testnet/0x8ba6cdd02f5d1b9ff9970690681c21957d9a6a6fbb74546b2f0cfb16dbff4c25.js";
// import { lending } from "./types/sui/0xe17e8d461129585fdd83dd891b1b5858f51984acbb308daa7ad8627c13f31c9d.js";

// import { storage } from "./types/sui/testnet/0x6850914af4d097f53be63182675334fb41a6782e4e702a5d605a61969750e777.js";

// import { dynamic_field } from "@sentio/sdk/sui/builtin/0x2";
// import { getOrCreateCoin } from "./mainnet/main.js";

// export type LendingEvent = lending.BorrowEventInstance | lending.DepositEventInstance | lending.WithdrawEventInstance | lending.RepayEventInstance

// // SuiObjectProcessor.bind({
// //   objectId: "0x5d137ca143af1366db782327d957d8e2afbf10c17b9d45e0f46111e6bcc4e805",
// //   network: ChainId.SUI_TESTNET,
// //   startCheckpoint: 3150000n
// // }).onTimeInterval(async (self, _, ctx) => {

// //   // const typeDescriptor = dynamic_field.Field.type(BUILTIN_TYPES.U8_TYPE, storage.ReserveData.type())

// //   // const v = await ctx.coder.decodedType(self, typeDescriptor)
// //   // if (v) {
// //     try {
// //       const totalSupply = Number(self.fields.value.fields.supply_balance.fields.total_supply)
// //       ctx.meter.Gauge("total_supply").record(totalSupply)
// //     } catch(e) {
// //       console.log(e)
// //       console.log(JSON.stringify(self))
// //     }
// // })

// async function onEvent(event: LendingEvent, ctx: SuiContext) {
//   const sender = event.data_decoded.sender
//   const reserve = event.data_decoded.reserve

//   const typeArray = event.type.split("::")
//   const type = typeArray[typeArray.length - 1]

//   const coinDecimal = getOrCreateCoin(ctx,type)
//   const amount = scaleDown(event.data_decoded.amount, (await coinDecimal).decimal)

//   ctx.eventLogger.emit("UserInteraction", {
//     distinctId: sender,
//     sender,
//     amount,
//     reserve,
//     type,
//     env: "testnet"
//   })
// }

// lendingTestnet.bind()
// .onEventBorrowEvent(onEvent)
// .onEventDepositEvent(onEvent)
// .onEventRepayEvent(onEvent)
// .onEventWithdrawEvent(onEvent)