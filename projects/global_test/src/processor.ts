import * as liquidswap from "./types/aptos/liquidswap.js";
import { AptosBaseProcessor, AptosModulesProcessor, AptosResourceProcessorTemplate } from "@sentio/sdk/aptos";
import { SuiAddressProcessorTemplate, SuiContext, SuiGlobalProcessor, SuiNetwork } from "@sentio/sdk/sui";
// import { decodeMultiSig } from "@mysten/sui.js"
// import { SuiModulesProcessor } from "@sentio/sdk/sui";
//
// for (const s of [liquidswap.scripts_v3, liquidswap.scripts_v2, liquidswap.scripts,
//   liquidswap.liquidity_pool, liquidswap.dao_storage, liquidswap.global_config, liquidswap.lp_account]) {
//   s.bind()
//       .onTransaction((tx, ctx) => {
//         ctx.meter.Counter("manual").add(1)
//       })
// }
//
// const address = liquidswap.liquidity_pool.DEFAULT_OPTIONS.address

// // doesn't matter if this works or not
// new AptosBaseProcessor("", { address })
//     .onTransaction((tx, ctx) => { ctx.meter.Counter("auto_1").add(1) })
//
// // TODO make this work, the number should be larger than "manual" for a bit
// AptosModulesProcessor.bind({address})
//     .onTransaction((tx, ctx) => { ctx.meter.Counter("auto_2").add(1) })
//
// // SuiModulesProcessor.bind({ address: '0x1be2df58d54d20d336886ef2c34d11c1d3ba194d53beb955318b8f6350acdb86', startCheckpoint: 1603788n })
// //     .onTransactionBlock((tx, ctx) => {
// //       ctx.eventLogger("transaction", {})
// //     })

SuiGlobalProcessor.bind({ network: SuiNetwork.MAIN_NET, startCheckpoint: 1603788n })
  // .onTransactionBlock((tx, ctx) => {
  //   const txSig = tx.transaction?.txSignatures[0]
  //   if (txSig) {
  //     const sigs = decodeMultiSig(txSig)
  //     ctx.eventLogger.emit("multisig", {
  //       message: txSig
  //     })
  //   } else {
  //     console.log("No sig found")
  //   }
  // },
  // {
  //   publicKeyPrefix: "0x5ae220b4b2f65e977c12ede61579ff5170b6c22c006168c37b5e7c61af018083"
  // })
    .onObjectChange(async (changes, ctx) => {
      console.log(changes.length, ctx.checkpoint)
    }, "0xa0eba10b173538c8fecca1dff298e488402cc9ff374f8a12ca7758eebe830b66::spot_dex::KriyaLPToken<0x5d4b302506645c37ff133b98c4b50a5ae14841659738d6d733d59d0d217a93bf::coin::COIN, 0xc060006111016b8a020ad5b33834984a437aaa7d3c74c18e09a95d48aceab08c::coin::COIN>")

//
//
// const addrTemplate = new SuiAddressProcessorTemplate().onTimeInterval(async (_, ctx) => {
//   // do query
//   console.log(ctx.address)
// }, 60, 240, undefined, {
//   owned: false
// })
//
// const resourceTemplate = new AptosResourceProcessorTemplate().onVersionInterval(
//     (resources, ctx) => {
//       //
//     }
// )
