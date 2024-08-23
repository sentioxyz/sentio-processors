import { EthChainId, getProvider } from "@sentio/sdk/eth";

export const NETWROK = EthChainId.ETHEREUM;
export const POOL_ADDRESS = "0xF130E387e2083EE79f3588e678c9B446A07860cb";
export const GAUGE_ADDRESS = "0xf5e3077173e4c21df78d8712c41c8daea9040481";
export const GAUGE_START_BLOCK = await getCreationBlock(NETWROK, GAUGE_ADDRESS);

export const VAULT_ADDRESS = "0x5401b8620E5FB570064CA9114fd1e135fd77D57c";

export const DAILY_POINTS = 1000;
export const MULTIPLIER = 3;

async function getCreationBlock(
  network: EthChainId,
  address: string
): Promise<number> {
  const provider = getProvider(network);
  let l = 0;
  let r = await provider.getBlockNumber();
  while (l < r) {
    const m = Math.floor((l + r) / 2);
    const code = await provider.getCode(address, m);
    if (code.length > 2) {
      r = m;
    } else {
      l = m + 1;
    }
  }
  return l;
}
