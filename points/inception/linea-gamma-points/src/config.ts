import { EthChainId, getProvider } from "@sentio/sdk/eth";

export const TOKEN_DECIMALS = 18;

export const NETWORK = EthChainId.LINEA;
export const HYPERVISOR_ADDRESS = "0xc491c1b173e932e97d9f739ccd9ae5b6d5fce4ce";
export const GAUGE_ADDRESS = "0x26D9DaD34412bbA1C5aD4b78a272537eB0ABA836";
export const GAUGE_START_BLOCK = await getCreationBlock(NETWORK, GAUGE_ADDRESS);

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
