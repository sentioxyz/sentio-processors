import { SuiContext, SuiObjectContext } from "@sentio/sdk/sui";
import { ChainId } from "@sentio/chain";

const oracleParentId = "0xce158622de9c229a6bd3e61ccd50555b03c2b7e9bafa00c3121361e505e3d0e3";
const SuiFeed = "0x2cab9b151ca1721624b09b421cc57d0bb26a1feb5da1f821492204b098ec35c9";
const USDCFeed = "0x70a79226dda5c080378b639d1bb540ddea64761629aa4ad7355d79266d55af61";
const USDTFeed = "0xf72d8933873bb4e5bfa1edbfa9ff6443ec5fac25c1d99ba2ef37f50a125826f3";

async function getHistoryData(feedAddress: string, ctx: SuiContext | SuiObjectContext) {
  const result: any = await ctx.client.getDynamicFieldObject({
    parentId: oracleParentId,
    name: { type: "address", value: feedAddress },
  });
  return result.data.content.fields.value.fields.history.fields; // return data like { price: '1119215110', updated_time: '1717688695470' }
}

export async function getAllTokenData(ctx: SuiContext | SuiObjectContext) {
  const feeds = [SuiFeed, USDCFeed, USDTFeed];
  const data = [];

  for (const feed of feeds) {
    const historyData = await getHistoryData(feed, ctx);
    data.push({
      coinFeed: feed,
      price: historyData.price,
      updated_time: historyData.updated_time,
    });
  }

  return data;
}

// getAllTokenData().then(data => console.log(data)).catch(err => console.error(err));
