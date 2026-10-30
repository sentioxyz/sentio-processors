
// import { SuiContext } from "@sentio/sdk/sui";
// import { getPriceByType } from "@sentio/sdk/utils";

// const getCoinTypesFromPoolType = (poolType: string) => {
//     const startIndex = poolType.indexOf("Pool<") + 5;
//     const endIndex = poolType.length - 1;

//     return poolType
//         .slice(startIndex, endIndex)
//         .split(",")
//         .map((item) => item.trim());
// };

// const getCoinTypeFriendlyName = (coinType: string) => {
//     switch (coinType) {
//         case "0x5d4b302506645c37ff133b98c4b50a5ae14841659738d6d733d59d0d217a93bf::coin::COIN":
//             return "USDCeth";
//         case "0xc060006111016b8a020ad5b33834984a437aaa7d3c74c18e09a95d48aceab08c::coin::COIN":
//             return "USDT";
//         case "0x2::sui::SUI":
//         case "0x0000000000000000000000000000000000000000000000000000000000000002::sui::SUI":
//             return "SUI";
//         case "0xaf8cd5edc19c4512f4259f0bee101a40d41ebed738ade5874359610ef8eeced5::coin::COIN":
//             return "WETH";
//         case "0x909cba62ce96d54de25bec9502de5ca7b4f28901747bbf96b76c2e63ec5f1cba::coin::COIN":
//             return "USDCbnb"
//         default:
//             return coinType;
//     }
// }
// const getPairFriendlyName = (coinTypeA: string, coinTypeB: string): string => {
//     let coinAFriendlyName = getCoinTypeFriendlyName(coinTypeA);
//     let coinBFriendlyName = getCoinTypeFriendlyName(coinTypeB);
//     return `${coinAFriendlyName}-${coinBFriendlyName}`;
// }

// const getPoolInfo = async (ctx: SuiContext, poolId: string) => {
//     try {
//         const obj = await ctx.client.getObject({
//             id: poolId,
//             options: { showType: true, showContent: true },
//         });

//         const scaleX = Number(obj.data.content.fields.scaleX);
//         const scaleY = Number(obj.data.content.fields.scaleY);
//         const reserveX = Number(obj.data.content.fields.token_x) / scaleX;
//         const reserveY = Number(obj.data.content.fields.token_y) / scaleY;
//         const [coinTypeA, coinTypeB] = getCoinTypesFromPoolType(obj.data.type);

//         let priceA = await getPriceByType(
//             SuiChainId.SUI_MAINNET,
//             coinTypeA,
//             ctx.timestamp
//         );

//         let priceB = await getPriceByType(
//             SuiChainId.SUI_MAINNET,
//             coinTypeB,
//             ctx.timestamp
//         );

//         if (!priceA ||
//             coinTypeA == "0xce7ff77a83ea0cb6fd39bd8748e2ec89a3f41e8efdc3f4eb123e0ca37b184db2::buck::BUCK"
//             || coinTypeA == "0x94e7a8e71830d2b34b3edaa195dc24c45d142584f06fa257b73af753d766e690::celer_usdt_coin::CELER_USDT_COIN"
//             || coinTypeA == "0x94e7a8e71830d2b34b3edaa195dc24c45d142584f06fa257b73af753d766e690::celer_usdc_coin::CELER_USDC_COIN") {
//             priceA = 1;
//         }

//         if (!priceB ||
//             coinTypeB == "0xce7ff77a83ea0cb6fd39bd8748e2ec89a3f41e8efdc3f4eb123e0ca37b184db2::buck::BUCK"
//             || coinTypeB == "0x94e7a8e71830d2b34b3edaa195dc24c45d142584f06fa257b73af753d766e690::celer_usdt_coin::CELER_USDT_COIN"
//             || coinTypeB == "0x94e7a8e71830d2b34b3edaa195dc24c45d142584f06fa257b73af753d766e690::celer_usdc_coin::CELER_USDC_COIN") {
//             priceB = 1;
//         }

//         const allData = {
//             ...obj.data.content.fields,
//         };

//         return {
//             coinTypeA,
//             coinTypeB,
//             priceA,
//             priceB,
//             scaleX,
//             scaleY,
//             reserveX,
//             reserveY,
//             allData,
//         };
//     } catch (error) {
//         console.log("Error getting pool info", poolId, ctx);
//         return null;
//     }
// };

// export { getPoolInfo, getPairFriendlyName, getCoinTypeFriendlyName };
