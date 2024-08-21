import { addContractByABI, EthChainId, getContractByABI } from "@sentio/sdk/eth";
import { LiquidityManager__factory, LiquidityManagerContractView } from "./types/eth/liquiditymanager.js";
import { JsonRpcProvider } from "ethers";

const provider = new JsonRpcProvider("http://nodes.sea.sentio.xyz/manta-pacific-mainnet");

const addr = "0x19b683A2F45012318d9B2aE1280d68d3eC54D663"


let contract = getContractByABI(
  "LiquidityManager",
  addr,
  EthChainId.MANTA_PACIFIC
) as LiquidityManagerContractView;
if (!contract) {
  const rawContract = LiquidityManager__factory.connect(
    addr,
    provider
  );
  contract = new LiquidityManagerContractView(rawContract);
  addContractByABI("LiquidityManager", addr, EthChainId.MANTA_PACIFIC, contract);
}

const liq = await contract.liquidities(12113, { blockTag: 902431 })
console.log(liq.remainTokenX, liq.remainTokenY)
