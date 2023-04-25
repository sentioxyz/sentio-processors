import { TestProcessorServer, firstCounterValue } from "@sentio/sdk/testing";
import { mockTransferLog } from "@sentio/sdk/eth/builtin/erc20";
import blockJson from "./17124494.json";
import { RichBlock, formatRichBlock } from "@sentio/sdk/eth";
import { handleBlock } from "./processor.js";

describe("Test Processor", () => {
  const service = new TestProcessorServer(() => import("./processor.js"));

  beforeAll(async () => {
    await service.start();
  });

  test("check parse block", async () => {
    const strValue = JSON.stringify(blockJson);
    const block = JSON.parse(strValue) as RichBlock;
    const formattedBlock = formatRichBlock(block);
    const ret = handleBlock(formattedBlock);
    expect(ret.length).toBe(1);
  });
});
