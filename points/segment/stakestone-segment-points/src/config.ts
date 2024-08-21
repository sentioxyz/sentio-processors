import { EthChainId } from "@sentio/sdk/eth";

export const SESTONE_DECIMALS = 8;
export const STONE_DECIMALS = 18;
export const EXCHANGE_RATE_DECIMALS = 18;

export const configs = [
  {
    network: EthChainId.BOB,
    address: "0xfB71992Ed470632105F16C331a0C9365C8A4f613",
  },
  {
    network: EthChainId.BINANCE,
    address: "0x24a8117Bf6F4a5BE6759918f7C111f279a999ef3",
  }
];
