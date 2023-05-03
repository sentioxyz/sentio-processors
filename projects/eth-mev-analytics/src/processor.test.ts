import { TestProcessorServer, firstCounterValue } from "@sentio/sdk/testing";
import blockJson from "./17121437.json";
import blockJsonX from "./17126233.json";
import blockJsonUniswapMint from "./14202253.json";
import blockWrongRevenue from "./17128908.json";
import block2Botsfrom from "./17134096.json";
import blockSandwichBasic from "./17139815.json";
import blockSandwichJared from "./17141262.json";
import blockMissedArb from "./17153025.json";
import blockLido from "./17148112.json";
import blockWrongRevenue2 from "./17160609.json";
import blockWrongSandWich from "./17148068.json";
import blockLosingSandwich from "./17148268.json";
import blockUniswapSandwich from "./17163020.json";
import blockEulerHack1 from "./16818057.json";
import blockForTubeHack from "./17143711.json";
import blockWrongArbRevenue from "./17173197.json";
import blockSandwichWrongRev1 from "./17100036.json";
import { RichBlock, formatRichBlock } from "@sentio/sdk/eth";
import { txnProfitAndCost, isArbitrage, handleBlock } from "./eth_processor.js";
import { dataByTxn, getDataByTxn } from "./eth_util.js";
import { chainConfigs, ChainConstants } from "./common.js";

function filterByHash(b: RichBlock, hash: string): dataByTxn {
  const allData = getDataByTxn(b);
  for (const [txnHash, data] of allData) {
    if (txnHash.toLowerCase() === hash.toLowerCase()) {
      return data;
    }
  }
  throw new Error(`cannot find txn ${hash}`);
}

function handleTxn(
  data: dataByTxn,
  chainConfig: ChainConstants
): [boolean, Map<string, bigint>, Map<string, bigint>] {
  let ret = txnProfitAndCost(data, chainConfig);
  //console.log(ret);
  return [
    isArbitrage(data, chainConfig, ret.revenue, ret.addressProperty),
    ret.revenue,
    ret.costs,
  ];
}

function compute(
  b: any,
  hash: string
): [boolean, Map<string, bigint>, Map<string, bigint>] {
  const strValue = JSON.stringify(b);
  const block = JSON.parse(strValue) as RichBlock;
  const formattedBlock = formatRichBlock(block);
  //const test = await service.eth.testBlock(formattedBlock);
  const data = filterByHash(formattedBlock, hash);
  return handleTxn(data, chainConfigs[0]);
}

describe("Test MEV", () => {
  const service = new TestProcessorServer(() => import("./processor.js"));

  beforeAll(async () => {
    await service.start();
  });

  test("check parse block 1", async () => {
    const ret = compute(
      blockJson,
      "0x629971cc2bceb52b73804546b76842084ef6d77c66f7b1c3b06d639760a54fd5"
    );
    expect(ret[0]).toBe(false);
  });

  test("WETH transfer duplicate", async () => {
    const ret = compute(
      blockJsonX,
      "0x33ca03529227101658f7112c243e9844d0a543ee4f8da791c8fcf29dc155708b"
    );
    expect(ret[0]).toBe(false);
  });

  test("uniswap mint", async () => {
    const ret = compute(
      blockJsonUniswapMint,
      "0xfc876f3b2c2b18840d20e98ecfaaa8f716674d71ecfd793b38a3d7b5a35d6890"
    );
    expect(ret[0]).toBe(false);
  });

  test("wrong revenue", async () => {
    const ret = compute(
      blockWrongRevenue,
      "0x80114900676c3c3da04ed5f4acd702acb344b0190f92a40a00dafb001fff6c71"
    );
    expect(ret[0]).toBe(true);
  });

  test("2 bots", async () => {
    const ret = compute(
      block2Botsfrom,
      "0xd5695fefdc8c4e00f648fe62d8e77c7f9b4ab2b98ac1fcee5cbfd529689dcd49"
    );
    expect(ret[0]).toBe(true);
    expect(ret[1].get("0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2")).toBe(
      2939038981219406289n
    );
  });

  test("missed arb", async () => {
    const ret = compute(
      blockMissedArb,
      "0xa8c7466e779d19c9b441ea79310ea16bff74982255d581e3d92766c768e3e1a3"
    );
    expect(ret[0]).toBe(true);
  });

  test("wrong renevue 2", async () => {
    const ret = compute(
      blockWrongRevenue2,
      "0x3135d2ffd8c7f7e6a387b0809dce37d0fabebc3055a62c425f1c2fb74dd4ae44"
    );
    expect(ret[0]).toBe(true);
    expect(ret[1].get("0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2")).toBe(
      247338348117742464n
    );
  });

  test("sandwich", async () => {
    const strValue = JSON.stringify(blockSandwichBasic);
    const block = JSON.parse(strValue) as RichBlock;
    const formattedBlock = formatRichBlock(block);
    const mevResults = handleBlock(formattedBlock, chainConfigs[0]);
    expect(mevResults.sandwichTxns).toHaveLength(2);
    expect(mevResults.arbTxns).toHaveLength(2);
  });

  test("sandwich jared", async () => {
    const strValue = JSON.stringify(blockSandwichJared);
    const block = JSON.parse(strValue) as RichBlock;
    const formattedBlock = formatRichBlock(block);
    const mevResults = handleBlock(formattedBlock, chainConfigs[0]);
    expect(mevResults.sandwichTxns).toHaveLength(1);
    expect(mevResults.arbTxns).toHaveLength(2);
  });

  // Make sure that it does not contain "0xc7bca6c1830300aac17ff5d7d527c464d0ee8312e6611bcf37f95ff611560af3"
  test("sandwich wrong", async () => {
    const strValue = JSON.stringify(blockWrongSandWich);
    const block = JSON.parse(strValue) as RichBlock;
    const formattedBlock = formatRichBlock(block);
    const mevResults = handleBlock(formattedBlock, chainConfigs[0]);
    expect(mevResults.sandwichTxns).toHaveLength(1);
    expect(mevResults.sandwichTxns[0].frontTxnHash).toBe(
      "0xe30faee2731b78d747287047e315f0c0b1c1ee31b40ddcb3ccca69dfa155bd85"
    );
  });

  test("losing sandwich and different decimals", async () => {
    const strValue = JSON.stringify(blockLosingSandwich);
    const block = JSON.parse(strValue) as RichBlock;
    const formattedBlock = formatRichBlock(block);
    const mevResults = handleBlock(formattedBlock, chainConfigs[0]);
    expect(mevResults.sandwichTxns).toHaveLength(3);
    expect(mevResults.sandwichTxns[0].frontTxnHash).toBe(
      "0x1a2d66cd1ac86b63b452ee0f2f6672e1a7605c74e1e88c034d0a0f9ec66e71ed"
    );
  });

  test("too many uniswap sandwich", async () => {
    const strValue = JSON.stringify(blockUniswapSandwich);
    const block = JSON.parse(strValue) as RichBlock;
    const formattedBlock = formatRichBlock(block);
    const mevResults = handleBlock(formattedBlock, chainConfigs[0]);
    expect(mevResults.sandwichTxns).toHaveLength(0);
  });

  test("wrong renevue 3", async () => {
    const ret = compute(
      blockWrongArbRevenue,
      "0x8ba2aea93588d8d2977bf400148b01301dacfab47cf281a3b2345329a6158ae1"
    );
    console.log(ret);
    expect(ret[0]).toBe(true);
    expect(ret[1].get("0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2")).toBe(
      1056620760836823262n
    );
    expect(ret[1].get("0x4e3fbd56cd56c3e72c1403e103b45db9da5b9d2b")).toBe(
      12618978090578852n
    );
  });

  test("lido shouldn't count", async () => {
    const ret = compute(
      blockLido,
      "0xf89d9779021ef9247e35347d55a0332bf6927c5027ae63a54bd848cf2a9113b3"
    );
    console.log(ret);
    expect(ret[0]).toBe(true);
    expect(ret[1].get("0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2")).toBe(
      17596399668493445n
    );
    expect(ret[1].get("0xae7ab96520de3a18e5e111b5eaab095312d7fe84")).toBe(0n);
  });

  test("sandwich wrong rev", async () => {
    const strValue = JSON.stringify(blockSandwichWrongRev1);
    const block = JSON.parse(strValue) as RichBlock;
    const formattedBlock = formatRichBlock(block);
    const mevResults = handleBlock(formattedBlock, chainConfigs[0]);
    expect(mevResults.sandwichTxns).toHaveLength(1);
    expect(mevResults.sandwichTxns[0].frontTxnHash).toBe(
      "0xdc567dd3b915f4fe0763d38690277a1d8e3b9967e0b113b936e0f0a11f3e5304"
    );
    expect(
      mevResults.sandwichTxns[0].revenue.get(
        "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2"
      )
    ).toBe(22971036132798645n);
  });
});

// TODO(qiaokan): Currently hack is labeled as a arbitrage. All these need to be fixed.
describe("Test hack", () => {
  const service = new TestProcessorServer(() => import("./processor.js"));

  beforeAll(async () => {
    await service.start();
  });

  test("test fortube hack", async () => {
    const ret = compute(
      blockForTubeHack,
      "0x082144b012cf4cb266569085829a12fa64fb3a4a9931289e930e14ead4a3737d"
    );
    expect(ret[0]).toBe(false);
  });

  test("test euler hack", async () => {
    const ret = compute(
      blockEulerHack1,
      "0x71a908be0bef6174bccc3d493becdfd28395d78898e355d451cb52f7bac38617"
    );
    expect(ret[0]).toBe(false);
  });
});
