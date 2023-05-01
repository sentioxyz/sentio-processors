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
import { RichBlock, formatRichBlock } from "@sentio/sdk/eth";
import { txnProfitAndCost, isArbitrage, handleBlock } from "./processor.js";
import { dataByTxn, getDataByTxn } from "./eth_util.js";
import { chainConfigs, ChainConstants } from "./common.js";

describe("Test Processor", () => {
  const service = new TestProcessorServer(() => import("./processor.js"));

  beforeAll(async () => {
    await service.start();
  });

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
    console.log(ret);
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

  test("lido shouldn't count", async () => {
    const ret = compute(
      blockLido,
      "0xf89d9779021ef9247e35347d55a0332bf6927c5027ae63a54bd848cf2a9113b3"
    );
    expect(ret[0]).toBe(false);
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
});
