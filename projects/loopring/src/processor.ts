import {LOOPRING_WALLET_MODULE,
  LOOPRING_WALLET_FACTORY1,
  LOOPRING_WALLET_FACTORY2,
  LOOPRING_WALLET_FACTORY3,
  LOOPRING_WALLET_FACTORY4,
  LOOPRING_WALLET_FACTORY5,
  EVENT1,
  EVENT,
  EVENT2
} from "./constant"
import { GenericProcessor } from "@sentio/sdk"
import type {Context, ContractView} from "@sentio/sdk"
import type {BaseContract} from 'ethers'
import { BoundContractView } from "@sentio/sdk"

const walletCounter = async function(event: any, ctx: Context<BaseContract, BoundContractView<BaseContract, ContractView<BaseContract>>>) {
  ctx.meter.Counter("wallet_count").add(1)
}

GenericProcessor.bind(EVENT1, {address: LOOPRING_WALLET_MODULE}).onAllEvents(walletCounter)
GenericProcessor.bind(EVENT, {address: LOOPRING_WALLET_FACTORY1}).onAllEvents(walletCounter)
GenericProcessor.bind(EVENT, {address: LOOPRING_WALLET_FACTORY2}).onAllEvents(walletCounter)
GenericProcessor.bind(EVENT, {address: LOOPRING_WALLET_FACTORY3}).onAllEvents(walletCounter)
GenericProcessor.bind(EVENT, {address: LOOPRING_WALLET_FACTORY4}).onAllEvents(walletCounter)
GenericProcessor.bind(EVENT2, {address: LOOPRING_WALLET_FACTORY5}).onAllEvents(walletCounter)



