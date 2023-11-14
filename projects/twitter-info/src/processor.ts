import { EthChainId } from "@sentio/sdk/eth";
import { BindSubjectEvent, TomoContext, TomoProcessor, TradeEvent } from "./types/eth/tomo.js";
import { ethers } from "ethers"
import { TWITTER_ENDPOINT } from "./twitterEndpoint.js";


const TOMO_CONTRACT = "0x9E813d7661D7B56CBCd3F73E958039B208925Ef8"

interface profileInfo {
  id: string,
  username: string,
  nickname: string,
  walletAddress: string,
  avatar: string,
  userType: string,
  fromHoobe: boolean
}


const tradeEventHandler = async (event: TradeEvent, ctx: TomoContext) => {
  const subject = ethers.decodeBytes32String(ethers.zeroPadBytes(ethers.stripZerosLeft(event.args.tradeEvent.subject), 32))
  if (subject.slice(0, 2) == "x@") {
    const profileInfo = await getProfileFromTable(subject)
    if (profileInfo) {
      console.log(`found ${subject} in sql,  wallet address: ${profileInfo.walletAddress} `)
    }
    else {
      //if not, retrieve from twitter api
      const profileInfo = await fetchX(ctx, subject)
      console.log("profileInfo", profileInfo)
      if (profileInfo) {
        if (profileInfo?.walletAddress) {
          ctx.eventLogger.emit("twitterProfileInfo", {
            id: profileInfo.id,
            username: profileInfo.username,
            nickname: profileInfo.nickname,
            walletAddress: profileInfo.walletAddress,
            avatar: profileInfo.avatar,
            userType: profileInfo.userType,
            fromHoobe: profileInfo.fromHoobe
          })
        }
      }
    }
  }
}

const bindSubjectEventHandler = async (event: BindSubjectEvent, ctx: TomoContext) => {
  const subject = ethers.decodeBytes32String(ethers.zeroPadBytes(ethers.stripZerosLeft(event.args.subject), 32))
  if (subject.slice(0, 2) == "x@") {
    const profileInfo = await getProfileFromTable(subject)
    if (profileInfo) {
      console.log(`found ${subject} in sql, wallet address: ${profileInfo.walletAddress} `)
    }
    else {
      //if not, retrieve from twitter api
      const profileInfo = await fetchX(ctx, subject)
      if (profileInfo) {
        if (profileInfo?.walletAddress) {
          ctx.eventLogger.emit("twitterProfileInfo", {
            id: profileInfo.id,
            username: profileInfo.username,
            nickname: profileInfo.nickname,
            walletAddress: profileInfo.walletAddress,
            avatar: profileInfo.avatar,
            userType: profileInfo.userType,
            fromHoobe: profileInfo.fromHoobe
          })
        }
      }
    }
  }
}


TomoProcessor.bind({
  address: TOMO_CONTRACT,
  network: EthChainId.LINEA
})
  .onEventTrade(tradeEventHandler)
  .onEventBindSubject(bindSubjectEventHandler)



async function sleep(milliseconds: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });
}


export async function fetchResults(subject: string) {
  const url = new URL(
    "/api/v1/analytics/sentio/twitter-info/sql/execute",
    "https://app.sentio.xyz"
  )

  return await fetch(url.href, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "api-key": "i7xfbgHqXSYTKoMrQeIzgaYOTBAMuPoGQ",
    },
    body: `{
      "sqlQuery": {
        "sql": "SELECT id, username, nickname, walletAddress, avatar, userType, fromHoobe FROM twitterProfileInfo WHERE username = '${subject}' ORDER BY timestamp DESC"
      }
    }`,
  })
}


async function getSqlResult(_subject: string) {
  let sqlResult = null
  try {
    const res = await fetchResults(_subject);
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
    console.log(`fields inside getSqlResult function ${JSON.stringify(fields)}`)
    return fields
  }
  //get failed or empty return
  else {
    console.log(`fetch sql for ${_subject} failed`)
  }
  return null
}


async function fetchX(ctx: TomoContext, subject: string): Promise<profileInfo | null> {
  let fetchUrl = TWITTER_ENDPOINT + subject
  const res = await fetch(fetchUrl)
  if (!res.ok) {
    console.log(res.status)
    console.log("error=", await res.text())
  }
  else {
    const data = await res.json()
    const {
      id,
      username,
      nickname,
      walletAddress,
      avatar,
      userType,
      onLine,
      fromHoobe
    } = data.basic
    console.log(`id ${id} username ${username} walletAddress ${walletAddress}`)

    return Promise.resolve({
      id,
      username,
      nickname,
      walletAddress,
      avatar,
      userType,
      fromHoobe
    })
  }
  return Promise.resolve(null)
}




async function getProfileFromTable(subject: string): Promise<profileInfo | null> {
  //check whether in sql table
  const sqlResult = await getSqlResult(subject)
  console.log(`sqlResult in final ${JSON.stringify(sqlResult)}`)
  if (sqlResult) {
    console.log(`found in sql ${subject} sqlResult ${JSON.stringify(sqlResult)}`)
    //check fields of the value 
    if (sqlResult.walletAddress) {
      return Promise.resolve(sqlResult)
    }
  }
  return Promise.resolve(null)
}
