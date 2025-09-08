import { SuiWrappedObjectProcessor } from "@sentio/sdk/sui";
import { ChainId } from "@sentio/chain";
import { BUILTIN_TYPES } from "@sentio/sdk/move";
import { oracle } from "./types/sui/0xca441b44943c16be0e6e23c5a955bb971537ea3289ae8016fbf33fffe1fd210f.js";
import {
  COIN,
  PRICE_ORACLE_CONFIG,
  updatePriceCache,
  getCurrentDateUTC,
} from "./utils.js";

export function OracleProcessor() {
  SuiWrappedObjectProcessor.bind({
    network: ChainId.SUI_MAINNET,
    objectId: PRICE_ORACLE_CONFIG.ORACLE_ADDRESS,
    startCheckpoint: PRICE_ORACLE_CONFIG.START_CHECKPOINT,
  }).onTimeInterval(
    async (objects, ctx) => {
      const decodedObjects = await ctx.coder.getDynamicFields(
        objects,
        BUILTIN_TYPES.U8_TYPE,
        oracle.Price.type()
      );

      const currentDate = getCurrentDateUTC();

      decodedObjects.forEach((entry) => {
        const name = entry.name.toString();
        const priceObject = entry.value as any;
        const value = priceObject.value;
        const decimal = priceObject.decimal;
        const normalizedPrice = value
          .asBigDecimal()
          .div(Math.pow(10, Number(decimal)));
        let coin_symbol = COIN[Number(name)];
        if (!coin_symbol) {
          coin_symbol = name;
        }

        // Update price cache for real-time access
        updatePriceCache(
          name,
          Number(normalizedPrice),
          Number(decimal),
          coin_symbol,
          ctx.timestamp
        );

        // Record metrics (existing functionality)
        try {
          ctx.meter
            .Gauge("oracle")
            .record(normalizedPrice, { id: name, name, coin_symbol });
        } catch (e) {
          console.error(
            `Error recording oracle metrics for ${coin_symbol}:`,
            e
          );
        }
      });
    },
    PRICE_ORACLE_CONFIG.UPDATE_INTERVAL,
    PRICE_ORACLE_CONFIG.UPDATE_OFFSET,
    "",
    { owned: true }
  );
}
