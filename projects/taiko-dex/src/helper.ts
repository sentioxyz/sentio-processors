// async function getTokenInfo(ctx: PancakePairContext, address: string): Promise<token.TokenInfo> {
//     // TODO(ye): this is wrong in the first place. this is a special address for native eth. does not apply here.
//     if (address !== "0x0000000000000000000000000000000000000000") {
//         // This is a hack.
//         try {
//             return await token.getERC20TokenInfo(ctx, address)
//         } catch (error) {
//             console.log(error, address)
//             return token.NATIVE_ETH
//         }
//     } else {
//         return token.NATIVE_ETH
//     }
// }

// interface poolInfo {
//     token0: token.TokenInfo
//     token1: token.TokenInfo
//     token0Address: string
//     token1Address: string
// }

// // define a map from string to poolInfo
// let poolInfoMap = new Map<string, Promise<poolInfo>>()

// async function buildPoolInfo(ctx: PancakePairContext, token0Promise: Promise<string>,
//     token1Promise: Promise<string>): Promise<poolInfo> {
//     let address0 = ""
//     let address1 = ""
//     try {
//         address0 = await token0Promise
//     } catch (error) {
//         console.log(error, address0)
//     }
//     try {
//         address1 = await token1Promise
//     } catch (error) {
//         console.log(error, address1)
//     }
//     const tokenInfo0 = await getTokenInfo(ctx, address0)
//     const tokenInfo1 = await getTokenInfo(ctx, address1)
//     return {
//         token0: tokenInfo0,
//         token1: tokenInfo1,
//         token0Address: address0,
//         token1Address: address1
//     }
// }

// const getOrCreatePool = async function (ctx: PancakePairContext): Promise<poolInfo> {
//     let infoPromise = poolInfoMap.get(ctx.address)
//     if (!infoPromise) {
//         infoPromise = buildPoolInfo(ctx, ctx.contract.token0(), ctx.contract.token1())
//         poolInfoMap.set(ctx.address, infoPromise)
//         const info = await infoPromise
//         const symbol0 = info.token0.symbol
//         const symbol1 = info.token1.symbol
//         const address0 = info.token0Address
//         const address1 = info.token1Address
//         console.log("set poolInfoMap for " + ctx.address + " " + symbol0 + " " + address0 + " " + symbol1 + " " + address1)
//     }
//     return await infoPromise
// }