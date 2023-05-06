import { BigDecimal, Gauge } from "@sentio/sdk";
import { AptosContext, AptosResourcesProcessor, defaultMoveCoder } from "@sentio/sdk/aptos";
import { getPriceBySymbol } from "@sentio/sdk/utils";
import {
    thalaTvl,
    thalaTvlAll,
    thalaTvlByPool,
    thalaVolume, thalaVolumeByCoin,
    recordAccount,
} from "./metrics.js";
import { weighted_pool, stable_pool, base_pool } from "./types/aptos/thala.js";
import {AptosDex, getCoinInfo, getPrice, getPairValue} from "@sentio/sdk/aptos/ext"

const START_VERSION = 110350957;
const NULL_TYPE = `${stable_pool.DEFAULT_OPTIONS.address}::base_pool::Null`;


const commonOptions = {
  sparse: true,
};

const volOptions = {
  sparse: true,
  aggregationConfig: {
    intervalInMinutes: [60],
  },
};

export async function onEventSwapEvent(
  ctx: AptosContext,
  type: "weighted" | "stable",
  poolType: string,
  coin_in: string,
  coin_out: string,
  amount_in: bigint,
  amount_out: bigint,
  fee_amount: bigint
) {
  const timestamp = Number(ctx.transaction.timestamp);

  const coinIn = getCoinInfo(coin_in);
  const coinOut = getCoinInfo(coin_out);

  const swapAmountIn = amount_in.scaleDown(coinIn.decimals);
  const swapAmountOut = amount_out.scaleDown(coinOut.decimals);
  // relative price
  // say 5 A -> 50 B, then we want to display relative price 10 for A/B pair, which says 1 A = 10 B
  const relativePrice = swapAmountOut.dividedBy(swapAmountIn);

  const pairTag = getPairTag(coin_in, coin_out);
//   swapPriceGauge.record(ctx, relativePrice, {
//     pairTag,
//     coin: coinIn.token_type.type,
//   });

  // use coingecko price for volume and fee
  const priceIn = await getPrice(coinIn.token_type.type, timestamp);
  const volumeUsd = swapAmountIn.multipliedBy(priceIn);
  const feeUsd = fee_amount.scaleDown(coinIn.decimals).multipliedBy(priceIn);

  const swapAttributes = {
    pair: pairTag,
    coin_address_in: coin_in,
    coin_address_out: coin_out,
    amount_in: swapAmountIn,
    amount_out: swapAmountOut,
    volume: volumeUsd,
    fee: feeUsd,
    type,
  };

  thalaVolume.record(ctx, volumeUsd, { poolType, pairTag });
}

// get usd prices based on the first asset with known price (which is available via price API)
// if none of the assets have known price, use 0
// returns an array of price for each asset
async function getActualCoinPrices(
  coins: string[],
  relativePrices: number[],
  timestampMicros: number
): Promise<number[]> {
  let knownPriceIdx = 0;
  let knownPrice = 0;

  while (knownPriceIdx < coins.length) {
    knownPrice = await getPrice(coins[knownPriceIdx], timestampMicros);
    if (knownPrice) {
      break;
    }
    knownPriceIdx += 1;
  }

  return knownPrice == 0
    ? Array(coins.length).fill(0)
    : relativePrices.map(
        (e) => (knownPrice / relativePrices[knownPriceIdx]) * e
      );
}

// use "123456coin1Name-789012coin2Name" as pair tag for each pool
// the first 6 digits of coin address are used to reduce the length of the tag
// tags are sorted alphabetically
function getPairTag(coin0: string, coin1: string): string {
  const fragments0 = coin0.split("::");
  const coinTag0 =
    fragments0[0].slice(2, 8) + fragments0[fragments0.length - 1];
  const fragments1 = coin1.split("::");
  const coinTag1 =
    fragments1[0].slice(2, 8) + fragments1[fragments1.length - 1];
  return coinTag0.localeCompare(coinTag1) < 0
    ? coinTag0.concat("-").concat(coinTag1)
    : coinTag1.concat("-").concat(coinTag0);
}

export function bigintToInteger(a: bigint): number {
  if (a > BigInt(Number.MAX_SAFE_INTEGER)) {
    throw new Error("too large");
  }
  return Number(a);
}

//stable pool helper functions
function getCoins(
    event:
      | stable_pool.SwapEventInstance
      | stable_pool.AddLiquidityEventInstance
      | stable_pool.RemoveLiquidityEventInstance
  ): string[] {
    const coins = [];
    coins.push(event.type_arguments[0]);
    coins.push(event.type_arguments[1]);
  
    const coin2 = event.type_arguments[2];
    if (!isNullType(coin2)) {
      coins.push(coin2);
    }
  
    const coin3 = event.type_arguments[3];
    if (!isNullType(coin3)) {
      coins.push(coin3);
    }
  
    return coins;
  }
  
  function isNullType(typeArg: string): boolean {
    return typeArg === NULL_TYPE;
  }
  
  // get complete pool type name. notice: there's a space after ", ". example:
  // 0xf727908689c999b8aa9ad6bd2d73b964bcc65a700dbbcc234d02827e2fc71d56::stable_pool::StablePool<0x347b2ef2a5509414630d939e6cedb0c7fae5e1a295bf93587fec19cac34ba5b::mod_coin::MOD, 0x3c27315fb69ba6e4b960f1507d1cefcc9a4247869f26a8d59d6b7869d23782c::test_coins::USDC, 0xf727908689c999b8aa9ad6bd2d73b964bcc65a700dbbcc234d02827e2fc71d56::base_pool::Null, 0xf727908689c999b8aa9ad6bd2d73b964bcc65a700dbbcc234d02827e2fc71d56::base_pool::Null>
  function getPoolType(
    event:
      | stable_pool.AddLiquidityEventInstance
      | stable_pool.RemoveLiquidityEventInstance
      | stable_pool.SwapEventInstance
  ) {
    return `${
      stable_pool.DEFAULT_OPTIONS.address
    }::stable_pool::StablePool<${event.type_arguments
      .map((e) => e.trim())
      .join(", ")}>`;
  }

  // weighted pool helper functions
  function getCoinsAndWeights(
    event:
      | weighted_pool.SwapEventInstance
      | weighted_pool.AddLiquidityEventInstance
      | weighted_pool.RemoveLiquidityEventInstance
  ): {
    coins: string[];
    weights: number[];
  } {
    const coins = [];
    const weights = [];
    coins.push(event.type_arguments[0]);
    coins.push(event.type_arguments[1]);
  
    weights.push(parseWeight(event.type_arguments[4]));
    weights.push(parseWeight(event.type_arguments[5]));
  
    const coin2 = event.type_arguments[2];
    if (!isNullType(coin2)) {
      coins.push(coin2);
      weights.push(parseWeight(event.type_arguments[6]));
    }
  
    const coin3 = event.type_arguments[3];
    if (!isNullType(coin3)) {
      coins.push(coin3);
      weights.push(parseWeight(event.type_arguments[7]));
    }
  
    return { coins, weights };
  }
  
  // weight typeArg format is like "0x1234::weighted_pool::Weight_5"
  // returns the floating point number e.g. 0.05
  function parseWeight(typeArg: string): number {
    const list = typeArg.split("_");
    return parseFloat(list[list.length - 1]) / 100;
  }
  function getWeightedPoolType(
    event:
      | weighted_pool.AddLiquidityEventInstance
      | weighted_pool.RemoveLiquidityEventInstance
      | weighted_pool.SwapEventInstance
  ) {
    return `${
      weighted_pool.DEFAULT_OPTIONS.address
    }::weighted_pool::WeightedPool<${event.type_arguments
      .map((e) => e.trim())
      .join(", ")}>`;
  }
  // stable pool onSwap
stable_pool
  .bind({ startVersion: START_VERSION })
  .onEventSwapEvent(
    async (event: stable_pool.SwapEventInstance, ctx: AptosContext) => {
      const coins = getCoins(event);
      const poolType = getPoolType(event);

      await onEventSwapEvent(
        ctx,
        "stable",
        poolType,
        coins[Number(event.data_decoded.idx_in)],
        coins[Number(event.data_decoded.idx_out)],
        event.data_decoded.amount_in,
        event.data_decoded.amount_out,
        event.data_decoded.fee_amount
      );
    }
  )

// weighted pool onSwap
weighted_pool
  .bind({ startVersion: START_VERSION })
  .onEventSwapEvent(
    async (event: weighted_pool.SwapEventInstance, ctx: AptosContext) => {
      const { coins } = getCoinsAndWeights(event);
      const poolType = getWeightedPoolType(event);
      await onEventSwapEvent(
        ctx,
        "weighted",
        poolType,
        coins[Number(event.data_decoded.idx_in)],
        coins[Number(event.data_decoded.idx_out)],
        event.data_decoded.amount_in,
        event.data_decoded.amount_out,
        event.data_decoded.fee_amount
      );
    }
  )

// weighted pool TVL
AptosResourcesProcessor.bind({
    address: weighted_pool.DEFAULT_OPTIONS.address,
    startVersion: START_VERSION,
  }).onTimeInterval(
    async (resources, ctx) => {
      const pools = await defaultMoveCoder().filterAndDecodeResources<
        weighted_pool.WeightedPool<any, any, any, any, any, any, any, any>
      >(weighted_pool.WeightedPool.TYPE_QNAME, resources);
      console.log("number of weighted pools:", pools.length);
  
      for (const pool of pools) {
        const nullIndex = pool.type_arguments
          .slice(0, 4)
          .indexOf(base_pool.Null.TYPE_QNAME);
        const numCoins = nullIndex === -1 ? 4 : nullIndex;
  
        const coinTypes = pool.type_arguments.slice(0, numCoins);
        const coinPrices = await Promise.all(
          coinTypes.map((coinType) => getPrice(coinType, ctx.timestampInMicros))
        );
        const coinAmounts: BigDecimal[] = [...Array(numCoins).keys()].map((i) =>
          // @ts-ignore
          (pool.data_decoded[`asset_${i}`] as { value: bigint }).value.scaleDown(
            getCoinInfo(coinTypes[i]).decimals
          )
        );
        const tvl = coinAmounts.reduce(
          (acc, amount, i) => acc.plus(amount.times(coinPrices[i])),
          BigDecimal(0)
        );
  
        thalaTvl.record(ctx, tvl, { poolType: pool.type });
      }
    },
    5,
    60
);

AptosResourcesProcessor.bind({
    address: stable_pool.DEFAULT_OPTIONS.address,
    startVersion: START_VERSION,
  }).onTimeInterval(
    async (resources, ctx) => {
      const pools = await defaultMoveCoder().filterAndDecodeResources<
        stable_pool.StablePool<any, any, any, any>
      >(stable_pool.StablePool.TYPE_QNAME, resources);
      console.log("number of stable pools:", pools.length);
  
      for (const pool of pools) {
        const nullIndex = pool.type_arguments.indexOf(base_pool.Null.TYPE_QNAME);
        const numCoins = nullIndex === -1 ? 4 : nullIndex;
  
        const coinTypes = pool.type_arguments.slice(0, numCoins);
        const coinPrices = await Promise.all(
          coinTypes.map((coinType) => getPrice(coinType, ctx.timestampInMicros))
        );
        const coinAmounts: BigDecimal[] = [...Array(numCoins).keys()].map((i) =>
          // @ts-ignore
          (pool.data_decoded[`asset_${i}`] as { value: bigint }).value.scaleDown(
            getCoinInfo(coinTypes[i]).decimals
          )
        );
        const tvl = coinAmounts.reduce(
          (acc, amount, i) => acc.plus(amount.times(coinPrices[i])),
          BigDecimal(0)
        );
  
        thalaTvl.record(ctx, tvl, { poolType: pool.type });
      }
    },
    5,
    60
  );

