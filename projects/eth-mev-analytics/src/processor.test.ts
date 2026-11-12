import assert from 'assert'
import { TestProcessorServer, firstCounterValue } from "@sentio/sdk/testing";
import blockJson from "./17121437.json" with { type: "json" };
import blockJsonX from "./17126233.json" with { type: "json" };
import blockJsonUniswapMint from "./14202253.json" with { type: "json" };
import blockWrongRevenue from "./17128908.json" with { type: "json" };
import block2Botsfrom from "./17134096.json" with { type: "json" };
import blockSandwichBasic from "./17139815.json" with { type: "json" };
import blockSandwichJared from "./17141262.json" with { type: "json" };
import blockMissedArb from "./17153025.json" with { type: "json" };
import blockLido from "./17148112.json" with { type: "json" };
import blockWrongRevenue2 from "./17160609.json" with { type: "json" };
import blockWrongSandWich from "./17148068.json" with { type: "json" };
import blockLosingSandwich from "./17148268.json" with { type: "json" };
import blockUniswapSandwich from "./17163020.json" with { type: "json" };
import blockEulerHack1 from "./16818057.json" with { type: "json" };
import blockForTubeHack from "./17143711.json" with { type: "json" };
import blockWrongArbRevenue from "./17173197.json" with { type: "json" };
import blockSandwichWrongRev1 from "./17100036.json" with { type: "json" };
import blockHugeGraph from "./17124947.json" with { type: "json" };
import zeroXBlock from "./44290568.json" with { type: "json" };
import { RichBlock, formatRichBlock } from "@sentio/sdk/eth";
import { txnProfitAndCost, isArbitrage, handleBlock } from "./eth_processor.js";
import { dataByTxn, getDataByTxn } from "./eth_util.js";
import { chainConfigs, ChainConstants } from "./common.js";
import { before, describe, test } from 'node:test'

function filterByHash(
  b: RichBlock,
  hash: string,
  chainConfig: ChainConstants
): dataByTxn {
  const allData = getDataByTxn(b, chainConfig);
  for (const [txnHash, data] of allData) {
    if (txnHash.toLowerCase() === hash.toLowerCase()) {
      return data;
    }
  }
  throw new Error(`cannot find txn ${hash}`);
}

function handleTxn(
  data: dataByTxn,
  chainConfig: ChainConstants,
  printInfo = false
): [boolean, Map<string, bigint>, Map<string, bigint>] {
  let ret = txnProfitAndCost(data, chainConfig);
  if (printInfo) {
    console.log(ret);
  }
  return [
    isArbitrage(data, chainConfig, ret.revenue, ret.addressProperty, ret.graph),
    ret.revenue,
    ret.costs,
  ];
}

function compute(
  b: any,
  hash: string,
  chainConfigIndex = 0,
  printInfo = false
): [boolean, Map<string, bigint>, Map<string, bigint>] {
  const strValue = JSON.stringify(b);
  const block = JSON.parse(strValue) as RichBlock;
  const formattedBlock = formatRichBlock(block);
  //const test = await service.eth.testBlock(formattedBlock);
  const data = filterByHash(
    formattedBlock,
    hash,
    chainConfigs[chainConfigIndex]
  );
  return handleTxn(data, chainConfigs[chainConfigIndex], printInfo);
}

describe("Test MEV", () => {
  const service = new TestProcessorServer(() => import("./processor.js"));

  before(async () => {
    await service.start();
  });

  test("check parse block 1", async () => {
    const ret = compute(
      blockJson,
      "0x629971cc2bceb52b73804546b76842084ef6d77c66f7b1c3b06d639760a54fd5"
    );
    console.log(ret);
    assert.equal(ret[0], false);
  });

  test("WETH transfer duplicate", async () => {
    const ret = compute(
      blockJsonX,
      "0x33ca03529227101658f7112c243e9844d0a543ee4f8da791c8fcf29dc155708b"
    );
    assert.equal(ret[0], false);
  });

  test("uniswap mint", async () => {
    const ret = compute(
      blockJsonUniswapMint,
      "0xfc876f3b2c2b18840d20e98ecfaaa8f716674d71ecfd793b38a3d7b5a35d6890"
    );
    assert.equal(ret[0], false);
  });

  test("wrong revenue", async () => {
    const ret = compute(
      blockWrongRevenue,
      "0x80114900676c3c3da04ed5f4acd702acb344b0190f92a40a00dafb001fff6c71"
    );
    assert.equal(ret[0], true);
  });
  // TODO(qiaokan): solve these 2 cases.
  /*
  test("2 bots", async () => {
    const ret = compute(
      block2Botsfrom,
      "0xd5695fefdc8c4e00f648fe62d8e77c7f9b4ab2b98ac1fcee5cbfd529689dcd49"
    );
    assert.equal(ret[0], true);
    assert.equal(ret[1].get("0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2"),
      2939038981219406289n
    );
  });

  test("missed arb", async () => {
    const ret = compute(
      blockMissedArb,
      "0xa8c7466e779d19c9b441ea79310ea16bff74982255d581e3d92766c768e3e1a3"
    );
    console.log(ret);
    assert.equal(ret[0], true);
  });

  test("wrong renevue 2", async () => {
    const ret = compute(
      blockWrongRevenue2,
      "0x3135d2ffd8c7f7e6a387b0809dce37d0fabebc3055a62c425f1c2fb74dd4ae44"
    );
    assert.equal(ret[0], true);
    assert.equal(ret[1].get("0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2"),
      247338348117742464n
    );
  });
*/
  test("sandwich", async () => {
    const strValue = JSON.stringify(blockSandwichBasic);
    const block = JSON.parse(strValue) as RichBlock;
    const formattedBlock = formatRichBlock(block);
    const mevResults = handleBlock(formattedBlock, chainConfigs[0]);
    assert.equal(mevResults.sandwichTxns.length, 2);
    assert.equal(mevResults.arbTxns.length, 2);
  });

  test("sandwich jared", async () => {
    const strValue = JSON.stringify(blockSandwichJared);
    const block = JSON.parse(strValue) as RichBlock;
    const formattedBlock = formatRichBlock(block);
    const mevResults = handleBlock(formattedBlock, chainConfigs[0]);
    assert.equal(mevResults.sandwichTxns.length, 1);
    assert.equal(mevResults.arbTxns.length, 2);
  });

  // Make sure that it does not contain "0xc7bca6c1830300aac17ff5d7d527c464d0ee8312e6611bcf37f95ff611560af3"
  test("sandwich wrong", async () => {
    const strValue = JSON.stringify(blockWrongSandWich);
    const block = JSON.parse(strValue) as RichBlock;
    const formattedBlock = formatRichBlock(block);
    const mevResults = handleBlock(formattedBlock, chainConfigs[0]);
    assert.equal(mevResults.sandwichTxns.length, 1);
    assert.equal(mevResults.sandwichTxns[0].frontTxnHash,
      "0xe30faee2731b78d747287047e315f0c0b1c1ee31b40ddcb3ccca69dfa155bd85"
    );
  });

  test("losing sandwich and different decimals", async () => {
    const strValue = JSON.stringify(blockLosingSandwich);
    const block = JSON.parse(strValue) as RichBlock;
    const formattedBlock = formatRichBlock(block);
    const mevResults = handleBlock(formattedBlock, chainConfigs[0]);
    assert.equal(mevResults.sandwichTxns.length, 3);
    assert.equal(mevResults.sandwichTxns[0].frontTxnHash,
      "0x1a2d66cd1ac86b63b452ee0f2f6672e1a7605c74e1e88c034d0a0f9ec66e71ed"
    );
  });

  test("too many uniswap sandwich", async () => {
    const strValue = JSON.stringify(blockUniswapSandwich);
    const block = JSON.parse(strValue) as RichBlock;
    const formattedBlock = formatRichBlock(block);
    const mevResults = handleBlock(formattedBlock, chainConfigs[0]);
    assert.equal(mevResults.sandwichTxns.length, 0);
  });

  test("wrong renevue 3", async () => {
    const ret = compute(
      blockWrongArbRevenue,
      "0x8ba2aea93588d8d2977bf400148b01301dacfab47cf281a3b2345329a6158ae1"
    );
    assert.equal(ret[0], true);
    assert.equal(ret[1].get("0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2"),
      1056620760836823262n
    );
    assert.equal(ret[1].get("0x4e3fbd56cd56c3e72c1403e103b45db9da5b9d2b"),
      12618978090578852n
    );
  });

  test("lido shouldn't count", async () => {
    const ret = compute(
      blockLido,
      "0xf89d9779021ef9247e35347d55a0332bf6927c5027ae63a54bd848cf2a9113b3"
    );
    assert.equal(ret[0], true);
    assert.equal(ret[1].get("0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2"),
      17596399668493445n
    );
    assert.equal(ret[1].get("0xae7ab96520de3a18e5e111b5eaab095312d7fe84"), 0n);
  });

  test("sandwich wrong rev", async () => {
    const strValue = JSON.stringify(blockSandwichWrongRev1);
    const block = JSON.parse(strValue) as RichBlock;
    const formattedBlock = formatRichBlock(block);
    const mevResults = handleBlock(formattedBlock, chainConfigs[0]);
    assert.equal(mevResults.sandwichTxns.length, 1);
    assert.equal(mevResults.sandwichTxns[0].frontTxnHash,
      "0xdc567dd3b915f4fe0763d38690277a1d8e3b9967e0b113b936e0f0a11f3e5304"
    );
    assert.equal(
      mevResults.sandwichTxns[0].revenue.get(
        "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2"
      )
      , 22971036132798645n);
  });

  test("huge graph", async () => {
    const ret = compute(
      blockHugeGraph,
      "0x2c434d3622428abf3e91b9a2cc491ea371d1705441ee00897c305a5adeb53068"
    );
    assert.equal(ret[0], true);
    assert.equal(ret[1].get("0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48"),
      1039187993n
    );
  });

  test("zeroX", async () => {
    const ret = compute(
      zeroXBlock,
      "0x28e46cfcc48eb692229cd244ab205a278f95d69171a45a200762395045c369ea",
      1,
      true
    );
    assert.equal(ret[0], false);
  });
});

// TODO(qiaokan): Currently hack is labeled as a arbitrage. All these need to be fixed.
describe("Test hack", () => {
  const service = new TestProcessorServer(() => import("./processor.js"));

  before(async () => {
    await service.start();
  });

  test("test fortube hack", async () => {
    const ret = compute(
      blockForTubeHack,
      "0x082144b012cf4cb266569085829a12fa64fb3a4a9931289e930e14ead4a3737d"
    );
    assert.equal(ret[0], false);
  });

  test("test euler hack", async () => {
    const ret = compute(
      blockEulerHack1,
      "0x71a908be0bef6174bccc3d493becdfd28395d78898e355d451cb52f7bac38617"
    );
    assert.equal(ret[0], false);
  });
});
