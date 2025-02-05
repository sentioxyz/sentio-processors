import { BigDecimal } from "@sentio/sdk";
import { EthContext } from "@sentio/sdk/eth";
import { Mutex } from "async-mutex";

interface Ratios {
  timestampMilli: number;
  eigenPointsPerStoneHour: BigDecimal;
  mellowPointsPerStoneHour: BigDecimal;
  symbioticPointsPerStoneHour: BigDecimal;
}

const updateIntervalMilli = 10 * 60 * 1000; // 10 minutes
export const ratioStartTimestampMilli = 1717157039000;

const mutex = new Mutex();
let lastUpdateTimestampMilli = 0;
let ratios: Ratios[];

fetchRatios();

export async function getRatios(ctx: EthContext) {
  return getRatiosByTime(ctx.timestamp.getTime());
}

export async function getRatiosByTime(timestampMilli: number) {
  const ratios = await mutex.runExclusive(fetchRatios);
  let l = 0,
    r = ratios.length - 1;
  while (l < r) {
    const m = (l + r) >> 1;
    if (ratios[m].timestampMilli <= timestampMilli) {
      r = m;
    } else {
      l = m + 1;
    }
  }
  return ratios[l].timestampMilli <= timestampMilli
    ? ratios[l]
    : <Ratios>{
        timestampMilli: 0,
        eigenPointsPerStoneHour: new BigDecimal(0),
        mellowPointsPerStoneHour: new BigDecimal(0),
        symbioticPointsPerStoneHour: new BigDecimal(0),
      };
}

export async function fetchRatios() {
  if (Date.now() - lastUpdateTimestampMilli < updateIntervalMilli) {
    return ratios;
  }
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("api key not set");
  }
  const resp = await fetch(
    "https://app.sentio.xyz/api/v1/analytics/stakestone/stakestone-ratios/sql/execute",
    {
      method: "POST",
      headers: {
        "api-key": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        sqlQuery: {
          sql: "select eigenPointsPerStoneHour, mellowPointsPerStoneHour, symbioticPointsPerStoneHour, timestampMilli from `Ratios` order by id desc",
          size: 100000,
        },
      }),
    }
  ).then((res) => res.json());

  if (!resp.result) {
    console.error("empty ratios resp", resp);
    return ratios;
  }
  ratios = resp.result.rows.map(
    (row: any) =>
      <Ratios>{
        timestampMilli: row.timestampMilli,
        eigenPointsPerStoneHour: new BigDecimal(row.eigenPointsPerStoneHour),
        mellowPointsPerStoneHour: new BigDecimal(row.mellowPointsPerStoneHour),
        symbioticPointsPerStoneHour: new BigDecimal(
          row.symbioticPointsPerStoneHour
        ),
      }
  );
  lastUpdateTimestampMilli = Date.now();
  console.log("successfully updated ratios, size:", ratios.length);
  return ratios;
}
