import { Counter } from "@sentio/sdk";
import { AptosModulesProcessor } from "@sentio/sdk/aptos";

const txnCounter = Counter.register("txn_counter")

const RAZOR_SWAP = "0x65c7939df25c4986b38a6af99602bf17daa1a2d7b53e6847ed25c04f74f54607"

AptosModulesProcessor.bind({
  address: RAZOR_SWAP,
  //@ts-ignore
  network: "aptos_movement"
})
  .onTransaction((tx, ctx) => {
    txnCounter.add(ctx, 1, { kind: "swap", protocol: "razorswap" })
  })
