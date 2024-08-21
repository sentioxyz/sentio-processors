import { EthContext } from "@sentio/sdk/eth";

interface Response {
  success: boolean;
  total: number;
  data: Data[];
}

interface Data {
  address: string;
  netDepositAmount: number;
}

export async function getStoneBalance(
  ctx: EthContext,
  account: string
): Promise<number> {
  const url =
    "https://astherus.com/bapi/futures/v1/public/future/snapshot/getNetDeposit";
  const resp = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      address: account,
      chainId: ctx.chainId.toString(),
      blockNumber: ctx.blockNumber.toString(),
      asset: "stone",
    }),
  });
  const res = await resp.json();
  if (!res.data || res.data.length == 0) {
    throw new Error(
      `data not found, account: ${account}, block: ${ctx.blockNumber}`
    );
  }
  return res.data[0].netDepositAmount;
}

export async function getStoneBalances(
  ctx: EthContext
): Promise<Record<string, number>> {
  const url =
    "https://astherus.com/bapi/futures/v1/public/future/snapshot/getNetDeposit";
  const result: Record<string, number> = {};
  for (let page = 1; ; page++) {
    const raw = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        chainId: ctx.chainId.toString(),
        blockNumber: ctx.blockNumber.toString(),
        asset: "stone",
        page,
        rows: 1000,
      }),
    });
    const res = (await raw.json()) as Response;
    console.log(res);
    if (!res.success) {
      throw new Error(
        `failed to fetch data, block: ${ctx.blockNumber}, page: ${page}`
      );
    }
    for (const data of res.data) {
      result[data.address] = data.netDepositAmount;
    }
    if (Object.keys(result).length >= res.total) {
      break;
    }
  }
  return result;
}
