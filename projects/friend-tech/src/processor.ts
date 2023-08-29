import { EthChainId } from "@sentio/sdk/eth"
import { FriendtechSharesV1Context, FriendtechSharesV1Processor, TradeEvent } from "./types/eth/friendtechsharesv1.js";
const FRIEND_TECH_SHARES_ADDR = "0xCF205808Ed36593aa40a44F10c7f7C2F67d4A4d4"
import { LRUCache } from 'lru-cache'

const accountInfoMapCache = new LRUCache<string, Promise<accountInfo>>({
  max: 1000
})

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
    ethAmount: Number(event.args.ethAmount) / 10 ** 18,
    protocolEthAmount: Number(event.args.protocolEthAmount) / 10 ** 18,
    subjectEthAmount: Number(event.args.subjectEthAmount) / 10 ** 18,
    supply,
    traderTwitterUsername,
    subjectTwitterUsername,
    lastPrice,
    bot,
    message: `${(event.args.isBuy) ? "Buy" : "Sell"} ${subjectTwitterUsername} ${shareAmount} shares at ${lastPrice}ETH by ${traderTwitterUsername}`
  })

}

FriendtechSharesV1Processor.bind({
  address: FRIEND_TECH_SHARES_ADDR,
  network: EthChainId.BASE,
  // startBlock: 2878738
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

// let accountInfoMap = new Map<string, Promise<accountInfo>>()

async function buildAccountInfo(ctx: FriendtechSharesV1Context, traderAddress: string): Promise<accountInfo> {
  // async function buildAccountInfo(traderAddress: string): Promise<accountInfo> {
  let [id, address, twitterUsername, twitterName, twitterPfpUrl, twitterUserId] = ["unk", "unk", "unk", "unk", "unk", "unk"]

  try {
    let fetchUrl = "https://prod-api.kosetto.com/users/" + traderAddress
    const response = await fetch(fetchUrl)
    const accountInfo = await response.json()

    if (accountInfo.id)
      id = accountInfo.id.toString()
    else
      id = `unk${traderAddress}`

    if (accountInfo.address)
      address = accountInfo.address
    else
      address = `unk${traderAddress}`

    if (accountInfo.twitterUsername)
      twitterUsername = accountInfo.twitterUsername
    else
      twitterUsername = `unk${traderAddress}`

    if (accountInfo.twitterName)
      twitterName = accountInfo.twitterName
    else
      twitterName = `unk${traderAddress}`

    if (accountInfo.twitterPfpUrl)
      twitterPfpUrl = accountInfo.twitterPfpUrl
    else
      twitterPfpUrl = `unk${traderAddress}`

    if (accountInfo.twitterUserId)
      twitterUserId = accountInfo.twitterUserId
    else
      twitterUserId = `unk${traderAddress}`

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
  catch (e) {
    console.log(`fetch error ${traderAddress} ${e.message}`)
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
  else {
    let accountInfo = await buildAccountInfo(ctx, traderAddress)
    //@ts-ignore
    const accountInfoPromise = Promise.resolve(accountInfo)
    accountInfoMapCache.set(traderAddress, accountInfoPromise)

    let i = 0
    //@ts-ignore
    let msg = `set account for ${(accountInfo).twitterUsername} ${traderAddress}`
    accountInfoMapCache.forEach((value, key) => {
      msg += `\n ${i}:${key.slice(0, 5)}`
      i++
    })
    // await sleep(30 * 1000)
    console.log(msg)
    //@ts-ignore
    return accountInfoPromise
  }
}

async function sleep(milliseconds: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });
}