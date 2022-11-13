import { getCoinInfo } from "@sentio-processor/common/dist/aptos";

export function isWormhole(coinx: string, coiny: string): string {
  const coinXInfo = getCoinInfo(coinx)
  const coinYInfo = getCoinInfo(coiny)

  return String(coinXInfo.bridge === "Wormhole" || coinYInfo.bridge === "Wormhole");
}