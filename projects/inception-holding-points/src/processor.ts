import { GLOBAL_CONFIG } from "@sentio/runtime"
import { BigDecimal } from "@sentio/sdk"
import { EthChainId, isNullAddress } from "@sentio/sdk/eth"
import { AccountSnapshot } from "./schema/schema.js"
import { NETWORK, INCEPTION_TOKEN_MAP, PROTOCOL_ADDRESSES } from "./config.js"
import { ERC20Processor } from "@sentio/sdk/eth/builtin"
import { ERC20Context } from "@sentio/sdk/eth/builtin/erc20"

const MILLISECOND_PER_HOUR = 60 * 60 * 1000
const TOKEN_DECIMALS = 18

GLOBAL_CONFIG.execution = {
  sequential: true,
}

INCEPTION_TOKEN_MAP.forEach((config) =>
  ERC20Processor.bind({
    address: config.address,
    network: config.network,
    baseLabels: { token: config.token }
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
        const positionSnapshots = ctx.store.listIterator(AccountSnapshot, [])
        // console.log("on time interval get ", JSON.stringify(positionSnapshots))

        try {
          const promises = []
          for await (const snapshot of positionSnapshots) {
            //check relevant chain only
            if (snapshot.id.includes(ctx.address))
              promises.push(process(ctx, snapshot.account, 0n, "TimeInterval")
              )
          }
          await Promise.all(promises)

        }
        catch (e) {
          console.log("on time interval error", e.message, ctx.transactionHash)
        }
      },
      60,
      60 * 24 * 7
    )
)

async function process(
  ctx: ERC20Context,
  account: string,
  balanceDelta: bigint,
  triggerEvent: string
) {
  if (isProtocolAddress(account)) return
  const snapshot = await ctx.store.get(AccountSnapshot, `${account}-${ctx.address}-${ctx.chainId}`)
  const snapshotTimestampMilli = Number(snapshot?.timestampMilli ?? 0n)
  const snapshotInceptionEthBalance = snapshot?.inceptionEthBalance ?? new BigDecimal(0)
  const points = await calculatePoints(
    ctx,
    snapshotTimestampMilli,
    snapshotInceptionEthBalance
  )

  const newTimestampMilli = BigInt(ctx.timestamp.getTime())
  const newInceptionEthBalance = snapshotInceptionEthBalance.plus(new BigDecimal(balanceDelta.toString()))
  const newSnapshot = new AccountSnapshot({
    id: `${account}-${ctx.address}-${ctx.chainId}`,
    account: account,
    timestampMilli: newTimestampMilli,
    inceptionEthBalance: newInceptionEthBalance,
  })
  await ctx.store.upsert(newSnapshot)

  ctx.eventLogger.emit("point_update", {
    account,
    points,
    snapshotTimestampMilli,
    snapshotInceptionEthBalance,
    newTimestampMilli,
    newInceptionEthBalance,
    triggerEvent,
  })
}

async function calculatePoints(
  ctx: ERC20Context,
  snapshotTimestampMilli: number,
  snapshotInceptionEthBalance: BigDecimal
): Promise<BigDecimal> {
  const nowMilli = ctx.timestamp.getTime()
  const snapshotMilli = Number(snapshotTimestampMilli)
  if (nowMilli < snapshotMilli) {
    console.error(
      "unexpected account snapshot from the future",
      nowMilli,
      snapshotTimestampMilli,
      snapshotInceptionEthBalance
    )
    return new BigDecimal(0)
  } else if (nowMilli == snapshotMilli) {
    // account affected for multiple times in the block
    return new BigDecimal(0)
  }
  const deltaHour = (nowMilli - snapshotMilli) / MILLISECOND_PER_HOUR

  const points = snapshotInceptionEthBalance
    .div(10 ** TOKEN_DECIMALS)
    .multipliedBy(deltaHour)

  return points
}

function isProtocolAddress(address: string): boolean {
  for (const p_address of PROTOCOL_ADDRESSES) {
    if (address.toLowerCase() == p_address.toLowerCase()) return true
  }
  return false
}