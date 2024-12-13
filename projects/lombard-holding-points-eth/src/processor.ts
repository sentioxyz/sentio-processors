import { GLOBAL_CONFIG } from "@sentio/runtime"
import { BigDecimal, scaleDown } from "@sentio/sdk"
import { isNullAddress } from "@sentio/sdk/eth"
import { AccountSnapshot } from "./schema/schema.js"
import { NETWORK, LBTC_ADDRESS, PROTOCOL_ADDRESSES } from "./config.js"
import { ERC20Processor } from "@sentio/sdk/eth/builtin"
import { ERC20Context } from "@sentio/sdk/eth/builtin/erc20"

const MILLISECOND_PER_DAY = 60 * 60 * 1000 * 24
const DAILY_POINTS = 1000
const TOKEN_DECIMALS = 8
const MULTIPLIER = 1

GLOBAL_CONFIG.execution = {
  sequential: true,
}

ERC20Processor.bind({
  address: LBTC_ADDRESS,
  network: NETWORK,
})
  .onEventTransfer(async (event, ctx) => {
    const { from, to, value } = event.args
    const accounts = [from, to].filter((account) => !isNullAddress(account))
    await Promise.all(
      accounts.map((account) => {
        if (account == from) {
          return process(ctx, account, scaleDown(-value, TOKEN_DECIMALS), event.name)
        } else if (account == to) {
          return process(ctx, account, scaleDown(value, TOKEN_DECIMALS), event.name)
        }
        return process(ctx, account, new BigDecimal(0), event.name)
      })
    )
  })
  .onTimeInterval(
    async (_, ctx) => {
      const positionSnapshots = await ctx.store.list(AccountSnapshot, [])
      // console.log("on time interval get ", JSON.stringify(positionSnapshots))

      try {
        const promises = []
        for (const snapshot of positionSnapshots) {
          promises.push(process(ctx, snapshot.id, new BigDecimal(0), "TimeInterval")
          )
        }
        await Promise.all(promises)

      }
      catch (e) {
        console.log("on time interval error", e.message, ctx.transactionHash)
      }
    },
    60,
    60
  )


async function process(
  ctx: ERC20Context,
  account: string,
  balanceDelta: BigDecimal,
  triggerEvent: string
) {
  if (isProtocolAddress(account)) return

  const snapshot = await ctx.store.get(AccountSnapshot, account)
  const snapshotTimestampMilli = Number(snapshot?.timestampMilli ?? 0n)
  const snapshotLbtcBalance = snapshot?.lbtcBalance ?? new BigDecimal(0)
  const [bPoints, lPoints] = calculatePoints(
    ctx,
    snapshotTimestampMilli,
    snapshotLbtcBalance
  )

  const newTimestampMilli = BigInt(ctx.timestamp.getTime())
  const newLbtcBalance = snapshotLbtcBalance.plus(balanceDelta)
  const newSnapshot = new AccountSnapshot({
    id: account,
    timestampMilli: newTimestampMilli,
    lbtcBalance: newLbtcBalance,
  })
  await ctx.store.upsert(newSnapshot)

  ctx.eventLogger.emit("point_update", {
    account,
    bPoints,
    lPoints,
    snapshotTimestampMilli,
    snapshotLbtcBalance,
    newTimestampMilli,
    newLbtcBalance,
    multiplier: MULTIPLIER,
    triggerEvent,
  })
}

function calculatePoints(
  ctx: ERC20Context,
  snapshotTimestampMilli: number,
  snapshotLbtcBalance: BigDecimal
): [BigDecimal, BigDecimal] {
  const nowMilli = ctx.timestamp.getTime()
  const snapshotMilli = Number(snapshotTimestampMilli)
  if (nowMilli < snapshotMilli) {
    console.error(
      "unexpected account snapshot from the future",
      nowMilli,
      snapshotTimestampMilli,
      snapshotLbtcBalance
    )
    return [new BigDecimal(0), new BigDecimal(0)]
  } else if (nowMilli == snapshotMilli) {
    // account affected for multiple times in the block
    return [new BigDecimal(0), new BigDecimal(0)]
  }
  const deltaDay = (nowMilli - snapshotMilli) / MILLISECOND_PER_DAY

  const lPoints = snapshotLbtcBalance
    .multipliedBy(deltaDay).multipliedBy(DAILY_POINTS)

  const bPoints = new BigDecimal(0)
  return [bPoints, lPoints]
}


function isProtocolAddress(address: string): boolean {
  for (const p_address of PROTOCOL_ADDRESSES) {
    if (address.toLowerCase() == p_address.toLowerCase()) return true
  }
  return false
}