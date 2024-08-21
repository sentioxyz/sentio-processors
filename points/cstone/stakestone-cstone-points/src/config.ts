import { EthChainId } from "@sentio/sdk/eth";

export const configs = [
  {
    network: EthChainId.ETHEREUM,
    address: "0x4d831e22F062b5327dFdB15f0b6a5dF20E2E3dD0",
    excludeAddress: [
      "0x0B159aAcd4A93977a34928C417fCA3A2f3a40d1B", // allienx,
      "0xf047ab4c75cebf0eb9ed34ae2c186f3611aeafa6", // zircuit
    ].map((address) => address.toLowerCase()),
  },
  {
    network: EthChainId.MODE,
    address: "0xF419234b27D0EFb71D93D522804dF370A4107Be1",
  },
];
