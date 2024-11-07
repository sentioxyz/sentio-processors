import { ClmmPoolUtil, TickMath } from "@cetusprotocol/cetus-sui-clmm-sdk";
import { BigDecimal } from "@sentio/sdk";
import { SuiAddressContext, SuiNetwork } from "@sentio/sdk/sui";
import { getPriceByType } from "@sentio/sdk/utils";
import BN from "bn.js";
import { fetchBuilder } from "fetch-retry-ts";

const options = {
  retries: 3,
  retryDelay: 1000,
  retryOn: [419, 503, 504],
};

const rfetch = fetchBuilder(fetch, options);

export interface Position {
  id: string;
  pool: string;
  owner: string;
  tickLower: bigint;
  tickUpper: bigint;
  decimalA: number;
  decimalB: number;
  coinTypeA: string;
  coinTypeB: string;
  liquidity: bigint;
}

export type DecodedPosition = Position & {
  price: BigDecimal; // priceA = priceB * price
  amountA: BigDecimal;
  amountB: BigDecimal;
};

export type DecodedPositionWithValue = DecodedPosition & {
  usdValue: BigDecimal;
};

export async function getDecodedPositionsWithValue(
  ctx: SuiAddressContext
): Promise<DecodedPositionWithValue[]> {
  const positions = await getDecodedPositions(ctx);
  return await Promise.all(
    positions.map(async (position) => {
      let priceA = await getPriceByType(
        SuiNetwork.MAIN_NET,
        position.coinTypeA,
        ctx.timestamp
      );
      let priceB = await getPriceByType(
        SuiNetwork.MAIN_NET,
        position.coinTypeB,
        ctx.timestamp
      );
      if (!priceA && !priceB) {
        console.error(
          "missing price for both coin",
          position.coinTypeA,
          position.coinTypeB,
          "at",
          ctx.timestamp
        );
        return {
          ...position,
          usdValue: new BigDecimal(0),
        };
      }
      if (!priceA) {
        priceA = priceB! * position.price.toNumber();
      }
      if (!priceB) {
        priceB = priceA / position.price.toNumber();
      }
      const usdValue = position.amountA
        .multipliedBy(priceA)
        .plus(position.amountB.multipliedBy(priceB));
      return {
        ...position,
        usdValue,
      };
    })
  );
}

export async function getDecodedPositions(
  ctx: SuiAddressContext
): Promise<DecodedPosition[]> {
  const positions = await fetchPositions(ctx);
  const sqrtPrices = await getPoolPricesByTime(ctx.timestamp.getTime() / 1000);
  return positions
    .filter((position) => {
      if (!(position.pool in sqrtPrices)) {
        console.error(
          "missing price for pool",
          position.pool,
          "at",
          ctx.timestamp
        );
        return false;
      }
      return true;
    })
    .map((position) => {
      const { id, pool, tickLower, tickUpper, liquidity, decimalA, decimalB } =
        position;
      const lowerSqrtPrice = TickMath.tickIndexToSqrtPriceX64(
        Number(tickLower)
      );
      const upperSqrtPrice = TickMath.tickIndexToSqrtPriceX64(
        Number(tickUpper)
      );
      const sqrtPrice = new BN(sqrtPrices[pool].toString());
      const amounts = ClmmPoolUtil.getCoinAmountFromLiquidity(
        new BN(liquidity.toString()),
        sqrtPrice,
        lowerSqrtPrice,
        upperSqrtPrice,
        false
      );
      const { coinA, coinB } = amounts;
      return {
        ...position,
        price: new BigDecimal(
          TickMath.sqrtPriceX64ToPrice(sqrtPrice, decimalA, decimalB).toFixed(
            10
          )
        ),
        amountA: BigInt(coinA.toString()).scaleDown(decimalA),
        amountB: BigInt(coinB.toString()).scaleDown(decimalB),
      };
    });
}

export async function getPoolPricesByTime(timestamp: Number) {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("api key not set");
  }
  const limit = 10000;
  let offset = 0;
  let ret: { [pool: string]: bigint } = {};
  while (true) {
    const sql = `
  select 
    pool, 
    argMax(after_sqrt_price, timestamp) as lastSqrtPrice
  from SwapEvent
  where timestamp < ${timestamp}
  group by pool
  limit ${limit} 
  offset ${offset}
  `;
    const resp = await rfetch(
      `https://app.sentio.xyz/api/v1/analytics/cetus/cetus/sql/execute`,
      {
        method: "POST",
        headers: {
          "api-key": apiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sqlQuery: {
            sql,
            size: 10000,
          },
        }),
      }
    ).then((res) => res.json());
    if (!resp.result) {
      console.error("empty resp", resp);
      throw new Error("empty resp");
    }
    for (const row of resp.result.rows) {
      ret[row.pool] = BigInt(row.lastSqrtPrice);
    }
    offset += limit;
    console.log("got prices rows", ret.length);
    if (resp.result.rows.length < limit) {
      break;
    }
  }
  return ret;
}

export async function fetchPositions(ctx: SuiAddressContext) {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("api key not set");
  }
  const limit = 10000;
  let offset = 0;
  let ret: Position[] = [];
  while (true) {
    const sql = `
  with cte as (
      with liquityEvents as (
          select * from AddLiquidityEvent UNION 
          select * from RemoveLiquidityEvent
      )
      select 
          position,
          max(timestamp) as lastTimestamp,
          argMax(tick_lower, timestamp) as tick_lower,
          argMax(tick_upper, timestamp) as tick_upper,
          argMax(decimal_a, timestamp) as decimal_a,
          argMax(decimal_b, timestamp) as decimal_b,
          argMax(coin_type_a, timestamp) as coin_type_a,
          argMax(coin_type_b, timestamp) as coin_type_b,
          argMax(pool, timestamp) as pool,
          argMax(after_liquidity, timestamp) as lastLiquidity
      from liquityEvents
      group by position
  )
  select 
      position,
      tick_lower,
      tick_upper,
      decimal_a,
      decimal_b,
      coin_type_a,
      coin_type_b,
      pool, 
      lastLiquidity 
  from cte 
  where lastLiquidity > 0
  limit ${limit} 
  offset ${offset}
  `;
    const resp = await rfetch(
      `https://app.sentio.xyz/api/v1/analytics/cetus/cetus/sql/execute`,
      {
        method: "POST",
        headers: {
          "api-key": apiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sqlQuery: {
            sql,
            size: 10000,
          },
        }),
      }
    ).then((res) => res.json());
    if (!resp.result) {
      console.error("empty resp", resp);
      throw new Error("empty resp");
    }
    const rows = await Promise.all(
      (resp.result.rows as any[]).map(async (row) => ({
        id: row.position,
        owner: await getPositionOwner(ctx, row.position),
        tickLower: BigInt(row.tick_lower),
        tickUpper: BigInt(row.tick_upper),
        decimalA: Number(row.decimal_a),
        decimalB: Number(row.decimal_b),
        coinTypeA: row.coin_type_a,
        coinTypeB: row.coin_type_b,
        pool: row.pool,
        liquidity: BigInt(row.lastLiquidity),
      }))
    );
    ret.push(...rows);
    offset += limit;
    console.log("got positions rows", ret.length);
    if (rows.length < limit) {
      break;
    }
  }
  return ret;
}

export async function getLatestPoolPrice(ctx: SuiAddressContext, pool: string) {
  const obj = await ctx.client.getObject({
    id: pool,
    options: {
      showContent: true,
    },
  });
  const content = obj.data?.content as any;
  return BigInt(content.fields.current_sqrt_price);
}

const owners: { [id: string]: string } = {};

export async function getPositionOwner(ctx: SuiAddressContext, id: string) {
  if (!owners[id]) {
    const obj = await ctx.client.getObject({
      id,
      options: {
        showOwner: true,
      },
    });
    if (!obj) {
      throw new Error("get object error " + id);
    }
    if (obj.error) {
      return "none";
    }
    const owner =
      (obj as any)?.data?.owner?.AddressOwner ??
      (obj as any)?.data?.owner?.ObjectOwner;
    if (!owner) {
      throw new Error("no owner for " + id);
    }
    owners[id] = owner;
  }
  return owners[id];
}
