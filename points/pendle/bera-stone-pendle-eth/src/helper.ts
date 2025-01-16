import { PENDLE_POOL_ADDRESSES } from "./consts.ts";
import { EthContext } from "@sentio/sdk/eth";
import { AccountSnapshot } from "./schema/schema.ts";
import os from "os";

export function isPendleAddress(addr: string) {
  addr = addr.toLowerCase();
  return (
    addr == PENDLE_POOL_ADDRESSES.SY ||
    addr == PENDLE_POOL_ADDRESSES.YT ||
    addr == PENDLE_POOL_ADDRESSES.LP
  );
}

// export function isLiquidLockerAddress(addr: string) {
//   addr = addr.toLowerCase();
//   return PENDLE_POOL_ADDRESSES.LIQUID_LOCKERS.some(
//     (liquidLockerInfo) => liquidLockerInfo.address == addr
//   );
// }

export function getUnixTimestamp(date: Date) {
  return Math.floor(date.getTime() / 1000);
}

export function isSentioInternalError(err: any): boolean {
  if (
    err.code === os.constants.errno.ECONNRESET ||
    err.code === os.constants.errno.ECONNREFUSED ||
    err.code === os.constants.errno.ECONNABORTED ||
    err.toString().includes("ECONNREFUSED") ||
    err.toString().includes("ECONNRESET") ||
    err.toString().includes("ECONNABORTED")
  ) {
    return true;
  }
  return false;
}

// returns all addresses in the storage
export async function getAllAddresses(ctx: EthContext) {
  // removes the suffix comprised of two letters coming from POINT_SOURCE
  const addresses = (await ctx.store.list(AccountSnapshot, [])).map((snapshot) =>
    snapshot.id.toString().toLowerCase().slice(0, -2)
  );
  return [...new Set(addresses)];
}
