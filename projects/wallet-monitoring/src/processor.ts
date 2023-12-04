import { GlobalProcessor } from "@sentio/sdk/eth";
import { CHAINS, ADDRESSES } from "./contant.js";
import { getProvider } from "@sentio/sdk/eth";
import { scaleDown } from "@sentio/sdk";

const startBlock = 18685034
CHAINS.forEach(chain => {
  GlobalProcessor.bind({
    network: chain,
    startBlock: startBlock
  })
    .onBlockInterval(async (b, ctx) => {
      //initialread
      if (b.number == startBlock) {
        for (const address of ADDRESSES) {
          const balance = scaleDown(await getProvider(chain).getBalance(address, b.number), 18)
          ctx.meter.Gauge("wallet_balance").record(balance, { wallet: address })
        }
      }

      const traces = b.traces
      if (!traces) return

      for (const trace of traces) {
        if (trace.action.from && ADDRESSES.includes(trace.action.from)) {
          console.log("from", trace.action.from)
          const balance = scaleDown(await getProvider(chain).getBalance(trace.action.from, b.number), 18)
          ctx.meter.Gauge("wallet_balance").record(balance, { wallet: trace.action.from })
        }

        if (trace.action.to && ADDRESSES.includes(trace.action.to)) {
          console.log("to", trace.action.to)
          const balance = scaleDown(await getProvider(chain).getBalance(trace.action.to, b.number), 18)
          ctx.meter.Gauge("wallet_balance").record(balance, { wallet: trace.action.to })
        }

      }
    },
      250,
      1000,
      {
        block: true,
        transaction: true,
        transactionReceipt: true,
        trace: true,
      })
})