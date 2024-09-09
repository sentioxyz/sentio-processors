import { EthChainId, getProvider } from "@sentio/sdk/eth";

export const NETWROK = EthChainId.ETHEREUM;
export const ADDRESSS = "0x657e8C867D8B37dCC18fA4Caead9C45EB088C642"; // this will be changed
export const LBTC_ADDRESS = "0x8236a87084f8B84306f72007F36F2618A5634494";
export const SYM_LBTC_ADDRESS = "0x9c0823d3a1172f9ddf672d438dec79c39a64f448";
export const SYM_LBTC_START_BLOCK = await getCreationBlock(
  NETWROK,
  SYM_LBTC_ADDRESS
);

export const DAILY_POINTS = 1000;
export const MULTIPLIER = 2;

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
