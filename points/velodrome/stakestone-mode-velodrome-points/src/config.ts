import { addContractByABI, EthChainId, getContractByABI, getProvider } from "@sentio/sdk/eth";
import { getPoolFactoryContract, PoolFactory__factory, PoolFactoryContractView } from "./types/eth/poolfactory.js";
import { JsonRpcProvider } from "ethers";
import { getPoolContract, Pool__factory, PoolContractView } from "./types/eth/pool.js";

export interface PoolInfo {
  address: string;
  token0: string;
  token1: string;
}

// export const configs = [
//   {
//     network: EthChainId.MODE,
//     factoryAddress: "0x31832f2a97Fd20664D76Cc421207669b55CE4BC0",
//     stoneAddress: "0x80137510979822322193FC997d400D5A6C747bf7"
//   },
//   {
//     network: EthChainId.BOB,
//     factoryAddress: "0x31832f2a97Fd20664D76Cc421207669b55CE4BC0",
//     stoneAddress: "0x96147A9Ae9a42d7Da551fD2322ca15B71032F342"
//   }
// ]

// configs.forEach(async config => {
//   const p = getProvider(config.network);
//   const {network, factoryAddress} = config;
//   let contract = getContractByABI(
//     "PoolFactory",
//     factoryAddress,
//     network
//   ) as PoolFactoryContractView;
//   if (!contract) {
//     const rawContract = PoolFactory__factory.connect(
//       factoryAddress,
//       p
//     );
//     contract = new PoolFactoryContractView(rawContract);
//     addContractByABI("PoolFactory", factoryAddress, network, contract);
//   }
//   const pools = await contract.allPools_()
//   for (const pool of pools) {
//     let contract = getContractByABI(
//       "Pool",
//       pool,
//       network
//     ) as PoolContractView;
//     if (!contract) {
//       const rawContract = Pool__factory.connect(
//         pool,
//         p
//       );
//       contract = new PoolContractView(rawContract);
//       addContractByABI("Pool", pool, network, contract);
//     }
//     const tokens = await contract.tokens();
//     if (tokens[0].toLowerCase() == config.stoneAddress.toLowerCase() || tokens[1].toLowerCase() == config.stoneAddress.toLowerCase()) {
//       console.log(network, `Pool: ${pool}`);
//     }
//   }
// })

export const NETWORK = EthChainId.MODE;

const POOL_ADDRESSES = [
  "0x5613B76Ed4CF65D771bAa5E68ceA787a8FF43cAD",
  "0x8EFbe6d29fB4bf0310E34A68De2e1C826c67F979",
];

export const configs: PoolInfo[] = await Promise.all(
  POOL_ADDRESSES.map(async (address) => {
    const c = getPoolContract(NETWORK, address);
    const [token0, token1] = await Promise.all([c.token0(), c.token1()]);
    return {
      address,
      token0,
      token1,
    };
  })
);

export function getPoolInfo(address: string) {
  return configs.find(
    (config) => config.address.toLowerCase() === address.toLowerCase()
  );
}

export const STONE_ADDRESS = "0x80137510979822322193FC997d400D5A6C747bf7";

export function isStone(address: string) {
  return address.toLowerCase() === STONE_ADDRESS.toLowerCase();
}
