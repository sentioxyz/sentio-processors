import { TestProcessorServer, firstCounterValue } from "@sentio/sdk/testing";
import blockJson from "./17121437.json";
import blockJsonX from "./17126233.json";
import { RichBlock, formatRichBlock } from "@sentio/sdk/eth";
import { handleBlock, handleTxn } from "./processor.js";
import { dataByTxn, getDataByTxn } from "./eth_util.js";

describe("Test Processor", () => {
  const service = new TestProcessorServer(() => import("./processor.js"));

  beforeAll(async () => {
    await service.start();
  });

  function filterByHash(b: RichBlock, hash: string): dataByTxn {
    const allData = getDataByTxn(b);
    for (const [txnHash, data] of allData) {
      if (txnHash === hash) {
        return data;
      }
    }
    throw new Error(`cannot find txn ${hash}`);
  }

  test("check parse block 1", async () => {
    const strValue = JSON.stringify(blockJson);
    const block = JSON.parse(strValue) as RichBlock;
    const formattedBlock = formatRichBlock(block);
    //const test = await service.eth.testBlock(formattedBlock);
    const data = filterByHash(
      formattedBlock,
      "0x629971cc2bceb52b73804546b76842084ef6d77c66f7b1c3b06d639760a54fd5"
    );
    const ret = handleTxn(data);
    expect(ret).toBe(false);
  });

  test("WETH transfer duplicate", async () => {
    const strValue = JSON.stringify(blockJsonX);
    const block = JSON.parse(strValue) as RichBlock;
    const formattedBlock = formatRichBlock(block);
    //const test = await service.eth.testBlock(formattedBlock);
    const data = filterByHash(
      formattedBlock,
      "0x33ca03529227101658f7112c243e9844d0a543ee4f8da791c8fcf29dc155708b"
    );
    const ret = handleTxn(data);
    expect(ret).toBe(false);
  });
});
