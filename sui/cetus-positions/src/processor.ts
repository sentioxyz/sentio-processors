import { SuiAddressProcessor, SuiNetwork } from "@sentio/sdk/sui";
import { getDecodedPositionsWithValue } from "./positions.js";
import { PositionSnapshot } from "./schema/store.js";
import { BigDecimal } from "@sentio/sdk";

SuiAddressProcessor.bind({
  network: SuiNetwork.MAIN_NET,
  startCheckpoint: 77256689n,
  address: "0xb6f7b13ba47ab4a691cc743e413a5a36b8a4587c3bb625bf02ae26cd080f4ed0", // random address
}).onTimeInterval(
  async (_, ctx) => {
    const positions = await getDecodedPositionsWithValue(ctx);
    const newPositionIds = new Set();
    let newSnapshots = [];
    for (const position of positions) {
      newPositionIds.add(position.id);
      const newSnapshot = new PositionSnapshot({
        id: position.id,
        pool: position.pool,
        owner: position.owner,
        price: position.price,
        tickLower: position.tickLower,
        tickUpper: position.tickUpper,
        coinSymbolA: position.coinSymbolA,
        coinSymbolB: position.coinSymbolB,
        coinTypeA: position.coinTypeA,
        coinTypeB: position.coinTypeB,
        liquidity: position.liquidity,
        amountA: position.amountA,
        amountB: position.amountB,
        usdValue: position.usdValue,
        timestamp: BigInt(ctx.timestamp.getTime())
      });
      newSnapshots.push(newSnapshot);
      ctx.eventLogger.emit("position", {
        id: position.id,
        pool: position.pool,
        owner: position.owner,
        price: position.price,
        tickLower: position.tickLower,
        tickUpper: position.tickUpper,
        coinSymbolA: position.coinSymbolA,
        coinSymbolB: position.coinSymbolB,
        coinTypeA: position.coinTypeA,
        coinTypeB: position.coinTypeB,
        liquidity: position.liquidity,
        amountA: position.amountA,
        amountB: position.amountB,
        usdValue: position.usdValue,
      });
    }

    const snapshots = await ctx.store.list(PositionSnapshot);
    const deleteIds = [];
    for (const snapshot of snapshots) {
      if (newPositionIds.has(snapshot.id)) {
        continue;
      }
      deleteIds.push(snapshot.id);
      ctx.eventLogger.emit("position", {
        id: snapshot.id,
        pool: snapshot.pool,
        owner: snapshot.owner,
        price: snapshot.price,
        tickLower: snapshot.tickLower,
        tickUpper: snapshot.tickUpper,
        coinSymbolA: snapshot.coinSymbolA,
        coinSymbolB: snapshot.coinSymbolB,
        coinTypeA: snapshot.coinTypeA,
        coinTypeB: snapshot.coinTypeB,
        liquidity: new BigDecimal(0),
        amountA: new BigDecimal(0),
        amountB: new BigDecimal(0),
        usdValue: new BigDecimal(0),
      });
    }
    await ctx.store.delete(PositionSnapshot, deleteIds);
    await ctx.store.upsert(newSnapshots);
  },
  60,
  60
);
