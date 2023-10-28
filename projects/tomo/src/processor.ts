import { EthChainId } from "@sentio/sdk/eth";
import { BindSubjectEvent, RewardClaimedEvent, SubjectRewardSetEvent, TomoContext, TomoProcessor, TradeEvent } from "./types/eth/tomo.js";
import { ethers } from "ethers"
import * as dotenv from 'dotenv'
import { TWITTER_ENDPOINT } from "./twitterEndpoint.js";
import { scaleDown } from "@sentio/sdk";
// import { DepositedEvent, EntryPointContext, EntryPointProcessor } from "./types/eth/entrypoint.js";
import { Client } from "twitter-api-sdk";
// import { LRUCache } from 'lru-cache'

const TOMO_CONTRACT = "0x9E813d7661D7B56CBCd3F73E958039B208925Ef8"
// const ENTRY_POINT_CONTRACT = "0x5ff137d4b0fdcd49dca30c7cf57e578a026d2789"

// let profileInfoMapCache = new LRUCache<string, Promise<profileInfo>>({
//   max: 500
// })

interface profileInfo {
  username: string,
  name: string,
  followers_count: number,
  friends_count: number,
  profile_image_url_https: string,
  description: string
}


const tradeEventHandler = async (event: TradeEvent, ctx: TomoContext) => {
  const subject = ethers.decodeBytes32String(ethers.zeroPadBytes(ethers.stripZerosLeft(event.args.tradeEvent.subject), 32))
  ctx.eventLogger.emit("tradeEvent", {
    distinctId: event.args.tradeEvent.trader,
    eventIndex: event.args.tradeEvent.eventIndex,
    ts: event.args.tradeEvent.ts,
    trader: event.args.tradeEvent.trader,
    subject,
    subjectBytes32: event.args.tradeEvent.subject,
    isBuy: event.args.tradeEvent.isBuy.toString(),
    buyAmount: event.args.tradeEvent.buyAmount,
    ethAmount: scaleDown(event.args.tradeEvent.ethAmount, 18),
    traderBalance: event.args.tradeEvent.traderBalance,
    supply: event.args.tradeEvent.supply,
    totalReward: event.args.tradeEvent.totalReward,
    coin_symbol: "eth"
  })
}

const bindSubjectEventHandler = async (event: BindSubjectEvent, ctx: TomoContext) => {
  const subject = ethers.decodeBytes32String(ethers.zeroPadBytes(ethers.stripZerosLeft(event.args.subject), 32))
  console.log()
  let [name, followers_count, following_count, tweet_count, listed_count, like_count, profile_image_url] = ["unk", -1, -1, -1, -1, -1, "unk"]

  let profileInfo: profileInfo = {
    username: "unk",
    name: "unk",
    followers_count: -1,
    friends_count: -1,
    profile_image_url_https: "unk",
    description: "unk"
  }

  if (subject.slice(0, 2) == "x@") {
    // profileInfo = await getOrCreateProfileInfo(ctx, subject)
    profileInfo = await fetchX(ctx, subject)

    console.log("profileInfo: ", JSON.stringify(profileInfo))

    ctx.eventLogger.emit("bindSubject", {
      eventIndex: event.args.eventIndex,
      ts: event.args.ts,
      subject: ethers.decodeBytes32String(ethers.zeroPadBytes(ethers.stripZerosLeft(event.args.subject), 32)),
      subjectBytes32: event.args.subject,
      owner: event.args.owner,
      name: profileInfo.name,
      followers_count: profileInfo.followers_count,
      friends_count: profileInfo.friends_count,
      profile_image_url_https: profileInfo.profile_image_url_https,
      description: profileInfo.description
    })
  }
  else {
    ctx.eventLogger.emit("bindSubject", {
      eventIndex: event.args.eventIndex,
      ts: event.args.ts,
      subject: ethers.decodeBytes32String(ethers.zeroPadBytes(ethers.stripZerosLeft(event.args.subject), 32)),
      subjectBytes32: event.args.subject,
      owner: event.args.owner
    })
  }
}

const rewardClaimedEventHandler = async (event: RewardClaimedEvent, ctx: TomoContext) => {
  ctx.eventLogger.emit("rewardClaimedEvent", {
    distinctId: event.args.claimEvent.sender,
    eventIndex: event.args.claimEvent.eventIndex,
    ts: event.args.claimEvent.ts,
    sender: event.args.claimEvent.sender,
    subject: ethers.decodeBytes32String(ethers.zeroPadBytes(ethers.stripZerosLeft(event.args.claimEvent.subject), 32)),
    subjectBytes32: event.args.claimEvent.subject,
    claimedIndex: event.args.claimEvent.claimedIndex,
    reward: scaleDown(event.args.claimEvent.reward, 18)
  })
}

const subjectRewardSetEventHandler = async (event: SubjectRewardSetEvent, ctx: TomoContext) => {
  ctx.eventLogger.emit("subjectRewardSetEvent", {
    distinctId: event.args.rewardEvent.owner,
    eventIndex: event.args.rewardEvent.eventIndex,
    ts: event.args.rewardEvent.ts,
    subject: ethers.decodeBytes32String(ethers.zeroPadBytes(ethers.stripZerosLeft(event.args.rewardEvent.subject), 32)),
    subjectBytes32: event.args.rewardEvent.subject,
    owner: event.args.rewardEvent.owner,
    snapshotReward: event.args.rewardEvent.snapshotReward,
    rewardPercent: event.args.rewardEvent.rewardPercent,
    totalReward: event.args.rewardEvent.totalReward
  })
}

const tomoOnTimeIntervalHandler = async (_: any, ctx: TomoContext) => {
  try {
    const amount = scaleDown(await ctx.contract.provider!.getBalance(ctx.address, ctx.blockNumber), 18)
    ctx.meter.Gauge("tvl").record(amount)
  } catch (e) {
    console.log(`Get tvl error ${e.message} at ${ctx.blockNumber}`)
  }
}


TomoProcessor.bind({
  address: TOMO_CONTRACT,
  network: EthChainId.LINEA
})
  .onEventTrade(tradeEventHandler)
  .onEventBindSubject(bindSubjectEventHandler)
  .onEventRewardClaimed(rewardClaimedEventHandler)
  .onEventSubjectRewardSet(subjectRewardSetEventHandler)
  .onTimeInterval(tomoOnTimeIntervalHandler, 10)




// async function buildProfileInfo(ctx: TomoContext, subject: string): Promise<profileInfo | null> {
//   let [username, name, followers_count, friends_count, profile_image_url_https, description] = ["unknown", "unknown", -1, -1, "unknown", "unknown"]
//   //check if in sql table first
//   // const result = await getSqlResult(subject)
//   // if (result) {
//   //   return await getFields(result)
//   // }
//   // //otherwise calling api, and write to sql table
//   // else {
//   //to do, nothing checked here, only draft 
//   let fetchUrl = "https://tomotrade.xyz/profile/api/" + subject
//   await fetch(fetchUrl)
//     .then(response => response.json())
//     .then(data => {
//       username = subject
//       name = data.user.result.legacy.name
//       followers_count = data.user.result.legacy.followers_count
//       friends_count = data.user.result.legacy.friends_count
//       profile_image_url_https = data.user.result.legacy.profile_image_url_https
//       description = data.user.result.legacy.description

//       console.log("name", name)
//       console.log("followers_count", followers_count)
//       console.log("friends_count", friends_count)
//       console.log("profile_image_url_https", profile_image_url_https)
//       console.log("description", description)

//       ctx.eventLogger.emit("profileInfo", {
//         distinctId: subject,
//         username,
//         name,
//         followers_count,
//         friends_count,
//         profile_image_url_https,
//         description
//       })
//       console.log("built profile built: ", subject)

//       return Promise.resolve({
//         username,
//         name,
//         followers_count,
//         friends_count,
//         profile_image_url_https,
//         description
//       })
//     })
//     .catch(err => {
//       console.log(`fetch error ${subject} ${err}`);
//     })
//   // }
//   return null
// }

// async function getOrCreateProfileInfo(ctx: TomoContext, subject: string): Promise<profileInfo | null> {
//   if (profileInfoMapCache.has(subject)) {
//     const profileInfo = profileInfoMapCache.get(subject)
//     console.log(`found profile for  ${subject}`)
//     //@ts-ignore
//     return profileInfo
//   }
//   else {
//     let profileInfo = await buildProfileInfo(ctx, subject)
//     console.log("get profile built: ", profileInfo?.username)
//     //@ts-ignore
//     if (profileInfo) {
//       const profileInfoPromise = Promise.resolve(profileInfo)
//       profileInfoMapCache.set(subject, profileInfoPromise)

//       let i = 0
//       let msg = `set profile for ${subject}`
//       profileInfoMapCache.forEach((value, key) => {
//         msg += `\n ${i}:${key}`
//         i++
//       })
//       // await sleep(30 * 1000)
//       console.log(msg)
//       return profileInfoPromise
//     }

//   }
//   return null
// }

async function sleep(milliseconds: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });
}


// export async function fetchResults(subject: string) {
//   const url = new URL(
//     "/api/v1/analytics/sentio/tomo/sql/execute",
//     "https://app.sentio.xyz"
//   );
//   return fetch(url.href, {
//     method: "POST",
//     headers: {
//       "Content-Type": "application/json",
//       "api-key": "i7xfbgHqXSYTKoMrQeIzgaYOTBAMuPoGQ",
//     },
//     body: `{
//       "sqlQuery": {
//         "sql": "SELECT username, name, followers_count, friends_count, profile_image_url_https, description FROM PortfolioInfo WHERE distinctId = '${subject}'"
//       }
//     }`,
//   })
// }


// async function getSqlResult(_subject: string) {
//   let sqlResult = null
//   try {
//     const res = await fetchResults(_subject);
//     if (!res.ok) {
//       console.log(res.status)
//       console.log("error=", await res.text())
//     }
//     else {
//       const data = await res.json()
//       sqlResult = data.result
//     }
//   } catch (e) {
//     console.log("error=", e);
//   }
//   //non empty query return
//   if (sqlResult && sqlResult.rows.length != 0) {
//     const fields = sqlResult.rows[0]
//     return fields
//   }
//   //get failed or empty return
//   else {
//     console.log(`fetch sql for ${_subject} failed`)
//   }
//   return null
// }


// async function getFields(sqlResult: any) {
//   let [username, name, followers_count, friends_count, profile_image_url_https, description] = ["unknown", "unknown", -1, -1, "unknown", "unknown"]

//   username = sqlResult.username
//   name = sqlResult.name
//   followers_count = sqlResult.followers_count
//   friends_count = sqlResult.friends_count
//   profile_image_url_https = sqlResult.profile_image_url
//   description = sqlResult.description

//   return {
//     username,
//     name,
//     followers_count,
//     friends_count,
//     profile_image_url_https,
//     description
//   }
// }


async function fetchX(ctx: TomoContext, subject: string): Promise<profileInfo> {
  let [username, name, followers_count, friends_count, profile_image_url_https, description] = ["unknown", "unknown", -1, -1, "unknown", "unknown"]
  let fetchUrl = TWITTER_ENDPOINT + subject
  await fetch(fetchUrl)
    .then(response => response.json())
    .then(data => {
      username = subject
      name = data.user.result.legacy.name
      followers_count = data.user.result.legacy.followers_count
      friends_count = data.user.result.legacy.friends_count
      profile_image_url_https = data.user.result.legacy.profile_image_url_https
      description = data.user.result.legacy.description
      // console.log("name", name)
      // console.log("followers_count", followers_count)
      // console.log("friends_count", friends_count)
      // console.log("profile_image_url_https", profile_image_url_https)
      // console.log("description", description)

    })
    .catch(err => {
      console.log(`fetch error ${subject} ${err}`);
    })

  // ctx.eventLogger.emit("profileInfo", {
  //   distinctId: subject,
  //   username,
  //   name,
  //   followers_count,
  //   friends_count,
  //   profile_image_url_https,
  //   description
  // })

  console.log("built profile built: ", subject, name, followers_count, friends_count)

  return Promise.resolve({
    username,
    name,
    followers_count,
    friends_count,
    profile_image_url_https,
    description
  })
}
