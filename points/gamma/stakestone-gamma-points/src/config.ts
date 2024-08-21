import { EthChainId, getProvider } from "@sentio/sdk/eth";
import { getHypervisorContract } from "./types/eth/hypervisor.js";

export const TOKEN_DECIMALS = 18;

export interface Config {
  network: EthChainId;
  addresses: string[];
  lynexGauges?: {
    [key: string]: {
      address: string;
      startBlock: number;
    };
  };
  stone: string;
}

export const configs: Config[] = [
  {
    network: EthChainId.MANTA_PACIFIC,
    addresses: [
      "0xB833e6fc4E634d38b91bf05E4eD672f5396fFEf2",
      "0x020dC3018c914A6973643502D4cC142276394A05",
      "0xE7549089F0D1ca6e9E3E2b06812B347E0Bbd68E1",
      "0x099dD23Eaab20F5eC43f50055D6e3030C66CC182",
      "0x89BD0737F2B860535711678259b7fB931F493344",
      "0x9d4472934648975A3ccb558FEB2AbAbcE6359Ffa",
      "0x258D485a17E1BA65fF6367D0e8b8ACc70Ab200F2",
    ],
    stone: "0xEc901DA9c68E90798BbBb74c11406A32A70652C3",
  },
  {
    network: EthChainId.LINEA,
    addresses: ["0xcffbfd665bedb19b47837461a5abf4388c560d35"],
    lynexGauges: {
      "0xcffbfd665bedb19b47837461a5abf4388c560d35": {
        address: "0x86d2D7709D390bd2946A335147965E54947c82d7",
        startBlock: await getCreationBlock(
          EthChainId.LINEA,
          "0x86d2D7709D390bd2946A335147965E54947c82d7"
        ),
      },
    },
    stone: "0x93F4d0ab6a8B4271f4a28Db399b5E30612D21116",
  },
];

export interface BeefyConfig {
  network: EthChainId;
  vault: string;
  strategy: string;
  gammaVault: string;
}

// user -> vault aSTONE-WETH, vault -> user: vault lp token
// strategy -> lynex gauge: aSTONE-WETH, lynex gauge -> strategy: gauge lp token
export const beefyConfigs: BeefyConfig[] = [
  {
    network: EthChainId.LINEA,
    strategy: "0x9fEd9C82B7a4E3fff1512edBAF756CEf83EF27d4",
    vault: "0x1C973f35325947f30F20fE1189605A332FD9F40F",
    gammaVault: "0xcffbfd665bedb19b47837461a5abf4388c560d35",
  },
];

export const token0IsStone: Record<string, boolean> = {};

for (const conf of configs) {
  for (const address of conf.addresses) {
    const c = getHypervisorContract(conf.network, address);
    const token0 = await c.token0();
    token0IsStone[address.toLowerCase()] =
      token0.toLowerCase() == conf.stone.toLowerCase();
  }
}

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
