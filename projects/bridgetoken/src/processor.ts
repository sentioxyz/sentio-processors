// NOTE: This processor is temporarily disabled due to breaking SDK changes:
// - whitelistCoins() -> whitelistTokens() with different TokenInfo structure
// - getAptosClient() no longer available (use ctx.getClient() instead)
// - SimpleCoinInfo type replaced by TokenInfo with different properties
//   (token_type.type -> tokenAddress, etc.)
// 
// This file needs a full refactor to work with the new SDK API.

// import { whitelistTokens, TokenInfo } from "@sentio/sdk/aptos/ext";
// import { AptosNetwork } from "@sentio/sdk/aptos";
// import { account, coin, type_info } from "@sentio/sdk/aptos/builtin/0x1";
// import { getPriceByType } from "@sentio/sdk/utils";
// import { defaultMoveCoder } from "@sentio/sdk/aptos";
// import { MoveStructId, EntryFunctionPayloadResponse } from "@aptos-labs/ts-sdk"
// import { scaleDown } from "@sentio/sdk";

console.log("bridgetoken processor is disabled - needs refactoring for new SDK API");