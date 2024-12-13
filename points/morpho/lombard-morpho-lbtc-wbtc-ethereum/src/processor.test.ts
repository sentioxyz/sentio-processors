import {
  addContractByABI,
  EthChainId,
  getContractByABI,
  getProvider,
} from "@sentio/sdk/eth";
import { JsonRpcProvider } from "ethers";
import { Morpho__factory, MorphoContractView } from "./types/eth/morpho.js";
import { LBTC_WBTC_MARKET_ID } from "./config.js";
const address = "0xBBBBBbbBBb9cC5e90e3b3Af64bdAF62C37EEFFCb";
const chainId = EthChainId.ETHEREUM;
const p = new JsonRpcProvider("https://eth.llamarpc.com");
let contract = getContractByABI(
  "Morpho",
  address,
  chainId
) as MorphoContractView;
if (!contract) {
  const rawContract = Morpho__factory.connect(address, p);
  contract = new MorphoContractView(rawContract);
  addContractByABI("Morpho", address, chainId, contract);
}

const VAULT_ADDRESS = "0x443df5eEE3196e9b2Dd77CaBd3eA76C3dee8f9b2";

// const a = await contract.position("0x514efda728a646dcafe4fdc9afe4ea214709e110ac1b2b78185ae00c1782cc82", "0x443df5eEE3196e9b2Dd77CaBd3eA76C3dee8f9b2")
// console.log(a)




const TOKEN_DECIMALS = 8;
const VIRTUAL_SHARES = BigInt(1e6);
const VIRTUAL_ASSETS = BigInt(1);

function toAssetsDown(
  shares: bigint,
  totalAssets: bigint,
  totalShares: bigint
): bigint {
  return (
    (shares * (totalAssets + VIRTUAL_ASSETS)) / (totalShares + VIRTUAL_SHARES)
  );
}

async function getVaultAssetsInMarket(marketID: string) {
  const pos = await contract.position(marketID, VAULT_ADDRESS);
  const market = await contract.market(marketID);
  return toAssetsDown(pos.supplyShares, market.totalSupplyAssets, market.totalSupplyShares);
}

console.log(await getVaultAssetsInMarket("0x514efda728a646dcafe4fdc9afe4ea214709e110ac1b2b78185ae00c1782cc82"))