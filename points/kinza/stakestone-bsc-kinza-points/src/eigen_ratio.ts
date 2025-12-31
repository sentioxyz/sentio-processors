import { BigDecimal } from "@sentio/sdk";
import { EthContext } from "@sentio/sdk/eth";
import { Mutex } from "async-mutex";

interface EigenRatio {
  timestampMilli: number;
  ratio: BigDecimal;
}

const updateIntervalMilli = 10 * 60 * 1000; // 10 minutes
export const eigenRatioStartTimestampMilli = 1717157039000;

const mutex = new Mutex();
let lastUpdateTimestampMilli = 0;
let eigenRatios: EigenRatio[];

fetchEigenRatios();

export async function getEigenRatio(ctx: EthContext) {
  return getEigenRatioByTime(ctx.timestamp.getTime());
}

export async function getEigenRatioByTime(timestampMilli: number) {
  const eigenRatios = await mutex.runExclusive(fetchEigenRatios);
  let l = 0,
    r = eigenRatios.length - 1;
  while (l < r) {
    const m = (l + r) >> 1;
    if (eigenRatios[m].timestampMilli <= timestampMilli) {
      r = m;
    } else {
      l = m + 1;
    }
  }
  return eigenRatios[l].timestampMilli <= timestampMilli
    ? eigenRatios[l]
    : {
      ratio: new BigDecimal(0),
      timestampMilli: 0,
    };
}

export async function fetchEigenRatios() {
  if (Date.now() - lastUpdateTimestampMilli < updateIntervalMilli) {
    return eigenRatios;
  }
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("api key not set");
  }
  const resp = await fetch(
    "https://app.sentio.xyz/api/v1/analytics/stakestone/eigen-ratio/sql/execute",
    {
      method: "POST",
      headers: {
        "api-key": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        sqlQuery: {
          sql: "select ratio, timestampMilli from `EigenRatio` order by id desc",
          size: 100000,
        },
      }),
    }
  ).then((res) => res.json());

  if (!resp.result) {
    console.error("empty eigen ratio resp", resp);
    return eigenRatios;
  }
  eigenRatios = resp.result.rows.map(
    (row: any) =>
      <EigenRatio>{
        timestampMilli: row.timestampMilli,
        ratio: BigDecimal(row.ratio),
      }
  );
  lastUpdateTimestampMilli = Date.now();
  console.log("successfully updated eigen ratios, size:", eigenRatios.length);
  return eigenRatios;
}
