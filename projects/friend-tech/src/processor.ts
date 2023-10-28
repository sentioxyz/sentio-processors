import { EthChainId } from "@sentio/sdk/eth"
import { FriendtechSharesV1Context, FriendtechSharesV1Processor, TradeEvent } from "./types/eth/friendtechsharesv1.js";
import { scaleDown } from "@sentio/sdk";
const FRIEND_TECH_SHARES_ADDR = "0xCF205808Ed36593aa40a44F10c7f7C2F67d4A4d4"
import { LRUCache } from 'lru-cache'
import { throttledQueue } from "./throttled-queue.js";


const accountInfoMapCache = new LRUCache<string, Promise<accountInfo>>({
  max: 300
})

const throttle = throttledQueue(5, 1000);

const tradeEventHandler = async (event: TradeEvent, ctx: FriendtechSharesV1Context) => {
  ctx.meter.Counter("trade_counter").add(1)
  const traderAccountInfo = await getOrCreateAccountInfo(ctx, event.args.trader.toLowerCase())
  const traderTwitterUsername = traderAccountInfo.twitterUsername
  const subjectAccountInfo = await getOrCreateAccountInfo(ctx, event.args.subject.toLowerCase())
  const subjectTwitterUsername = subjectAccountInfo.twitterUsername
  const lastPrice = (Number(event.args.supply) - 1) ** 2 / 16000
  const shareAmount = Number(event.args.shareAmount)
  const supply = Number(event.args.supply)
  const bot = (supply - shareAmount == 1 && shareAmount >= 10) ? "true" : "false"

  ctx.eventLogger.emit("TradeEvent", {
    distinctId: event.args.trader,
    trader: event.args.trader,
    subject: event.args.subject,
    isBuy: event.args.isBuy.toString(),
    shareAmount,
    ethAmount: scaleDown(event.args.ethAmount, 18),
    protocolEthAmount: scaleDown(event.args.protocolEthAmount, 18),
    subjectEthAmount: scaleDown(event.args.subjectEthAmount, 18),
    supply,
    traderTwitterUsername,
    subjectTwitterUsername,
    lastPrice,
    bot,
    message: `${(event.args.isBuy) ? "Buy" : "Sell"} ${event.args.subject} ${shareAmount} shares at ${lastPrice}ETH by ${event.args.trader}`
  })

}

FriendtechSharesV1Processor.bind({
  address: FRIEND_TECH_SHARES_ADDR,
  network: EthChainId.BASE,
  // startBlock: 4039357
})
  .onEventTrade(tradeEventHandler)

interface accountInfo {
  id: string,
  address: string,
  twitterUsername: string,
  twitterName: string,
  twitterPfpUrl: string,
  twitterUserId: string
}

async function buildAccountInfo(ctx: FriendtechSharesV1Context, traderAddress: string): Promise<accountInfo> {
  let [id, address, twitterUsername, twitterName, twitterPfpUrl, twitterUserId] = ["unk", "unk", "unk", "unk", "unk", "unk"]



  let fetchUrl = "https://prod-api.kosetto.com/users/" + traderAddress
  const data = await fetch(fetchUrl, {
    headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/104.0.5112.79 Safari/537.36' }
  })
    .then(res => {
      if (!res.ok) { return res.text().then(text => { throw new Error(text) }) }
      else { return res.json() }
    })
    .catch(err => {
      console.log(`fetch api error ${err} for ${traderAddress}`)
      return {
        id,
        address,
        twitterUsername,
        twitterName,
        twitterPfpUrl,
        twitterUserId
      }
    })
  if (data) {
    console.log("Data fetched from api ", JSON.stringify(data))

    id = data.id.toString()
    address = data.address
    twitterUsername = data.twitterUsername
    twitterName = data.twitterName
    twitterPfpUrl = data.twitterPfpUrl
    twitterUserId = data.twitterUserId

    ctx.eventLogger.emit("AccountInfo", {
      distinctId: traderAddress,
      friend_tech_id: id,
      twitterUsername,
      twitterName,
      twitterPfpUrl,
      twitterUserId,
      buy__share: `https://www.friend.tech/rooms/${traderAddress}`,
      twitter_link: `https://twitter.com/${twitterUsername}`,
      message: `${twitterUsername}, buy share at https://www.friend.tech/rooms/${traderAddress}`
    })
  }

  return {
    id,
    address,
    twitterUsername,
    twitterName,
    twitterPfpUrl,
    twitterUserId
  }


}

async function getOrCreateAccountInfo(ctx: FriendtechSharesV1Context, traderAddress: string): Promise<accountInfo> {
  if (accountInfoMapCache.has(traderAddress)) {
    const accountInfo = accountInfoMapCache.get(traderAddress)
    //@ts-ignore
    console.log(`found account for ${(await accountInfo).twitterUsername} ${traderAddress}`)
    //@ts-ignore
    return accountInfo
  }

  //check if in sql table first
  const result = await getSqlResult(traderAddress)
  if (result) {
    console.log(`Find match in sql ${traderAddress}`)
    return await getFields(result)
  }

  //otherwise calling api, and write to sql table
  let accountInfo
  await throttle(async () => { accountInfo = await buildAccountInfo(ctx, traderAddress) })
  if (accountInfo) {
    const accountInfoPromise = Promise.resolve(accountInfo)
    accountInfoMapCache.set(traderAddress, accountInfoPromise)
    let i = 0
    //@ts-ignore
    let msg = `set account for ${(accountInfo).twitterUsername} ${traderAddress}`
    accountInfoMapCache.forEach((value, key) => {
      msg += `\n ${i}:${key.slice(0, 5)}`
      i++
    })
    console.log(msg)
    // await sleep(60 * 1000)
    return accountInfoPromise
  }


}

async function sleep(milliseconds: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });
}



export async function fetchResults(traderAddress: string) {
  const url = new URL(
    "/api/v1/analytics/sentio/friend-tech/sql/execute",
    "https://app.sentio.xyz"
  );
  return fetch(url.href, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "api-key": "i7xfbgHqXSYTKoMrQeIzgaYOTBAMuPoGQ",
    },
    body: `{
      "sqlQuery": {
        "sql": "SELECT * FROM AccountInfo WHERE distinct_id = '${traderAddress}'"
      }
    }`,
  })
}


async function getSqlResult(traderAddress: string) {
  let sqlResult = null
  try {
    const res = await fetchResults(traderAddress);
    if (!res.ok) {
      console.log(res.status)
      console.log("error=", await res.text())
    }
    else {
      const data = await res.json()
      sqlResult = data.result
    }
  } catch (e) {
    console.log("error=", e);
  }
  //non empty query return
  if (sqlResult && sqlResult.rows.length != 0) {
    const fields = sqlResult.rows[0]
    return fields
  }
  //get failed or empty return
  else {
    console.log(`fetch sql for ${traderAddress} failed`)
  }
  return null
}


async function getFields(sqlResult: any) {
  let [id, address, twitterUsername, twitterName, twitterPfpUrl, twitterUserId] = ["unk", "unk", "unk", "unk", "unk", "unk"]

  id = sqlResult.id
  address = sqlResult.address
  twitterUsername = sqlResult.twitterUsername
  twitterName = sqlResult.twitterName
  twitterPfpUrl = sqlResult.twitterPfpUrl
  twitterUserId = sqlResult.twitterUserId

  return {
    id,
    address,
    twitterUsername,
    twitterName,
    twitterPfpUrl,
    twitterUserId
  }
}
