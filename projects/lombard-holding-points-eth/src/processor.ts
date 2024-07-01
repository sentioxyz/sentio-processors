import { GLOBAL_CONFIG } from "@sentio/runtime"
import { BigDecimal } from "@sentio/sdk"
import { isNullAddress } from "@sentio/sdk/eth"
import { AccountSnapshot } from "./schema/schema.js"
import { NETWORK, LBTC_ADDRESS, PROTOCOL_ADDRESSES } from "./config.js"
import { ERC20Processor } from "@sentio/sdk/eth/builtin"
import { ERC20Context } from "@sentio/sdk/eth/builtin/erc20"

const MILLISECOND_PER_DAY = 60 * 60 * 1000 * 24
const DAILY_POINTS = 2100
const TOKEN_DECIMALS = 8

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
          return process(ctx, account, -value, event.name)
        } else if (account == to) {
          return process(ctx, account, value, event.name)
        }
        return process(ctx, account, 0n, event.name)
      })
    )
  })
  .onTimeInterval(
    async (_, ctx) => {
      const positionSnapshots = ctx.store.listIterator(AccountSnapshot)
      // console.log("on time interval get ", JSON.stringify(positionSnapshots))

      try {
        const promises = []
        for await (const snapshot of positionSnapshots) {
          promises.push(process(ctx, snapshot.id, 0n, "TimeInterval")
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
  balanceDelta: bigint,
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
  const newLbtcBalance = snapshotLbtcBalance.plus(new BigDecimal(balanceDelta.toString()))
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
    .div(10 ** TOKEN_DECIMALS)
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