import { Counter, Gauge, scaleDown } from '@sentio/sdk'
import { ERC20Processor } from '@sentio/sdk/eth/builtin'
import { FountainProcessor, WithdrawEarlyEvent, ClaimVaultPenaltyEvent, FountainContext, UpgradeEvent, UpgradeCallTrace, TransferEvent } from './types/eth/fountain.js'
import { ReservoirContext, ReservoirProcessor } from './types/eth/reservoir.js'
import { StakeNftCallTrace, StakeNftEvent, UnstakeEvent, UnstakeNftCallTrace, UnstakeNftEvent, VenostormContext, VenostormProcessor } from './types/eth/venostorm.js'
import { LiquidCroProcessor, StakeEvent, RequestUnbondEvent, UnbondEvent, AccrueRewardEvent, LiquidCroContext } from './types/eth/liquidcro.js'
import { EthChainId } from "@sentio/sdk/eth";
import './liquidatom.js'
import { VenoFoundationContext, VenoFoundationProcessor } from './types/eth/venofoundation.js'
import { ReserveFoundationProcessor } from './types/eth/reservefoundation.js'
import { ClaimRewardsCallTrace, FeeDistributorContext, FeeDistributorProcessor } from './types/eth/feedistributor.js'
import { ethers } from 'ethers'
import { ERC20Context, getERC20ContractOnContext } from '@sentio/sdk/eth/builtin/erc20'
import { getOrCreateERC721 } from './helper/nft-helper.js'

const DepositEventHandler = async (event: any, ctx: any) => {
  const pid = Number(event.args.pid)
  const amount = event.args.amount
  const decimals = pid == 3 ? 8 : 18

  //venostorm
  if (ctx.address.toLowerCase() == "0x579206e4e49581ca8ada619e9e42641f61a84ac3") {
    ctx.meter.Counter(`deposit_counter`).add(scaleDown(amount, decimals), {
      pid: pid.toString()
    })

    ctx.eventLogger.emit("Deposit", {
      distinctId: event.args.user,
      pid,
      amount: scaleDown(amount, decimals)
    })
  }
  else {
    ctx.meter.Counter(`deposit_counter`).add(scaleDown(amount, 18), {
      pid: pid.toString()
    })
    ctx.eventLogger.emit("Deposit", {
      distinctId: event.args.user,
      pid,
      amount: scaleDown(amount, 18),
      stakeId: Number(event.args.stakeId),
      weightedAmount: Number(event.args.weightedAmount),
      unlockTimestamp: event.args.unlockTimestamp
    })
  }
}


const WithdrawEventHandler = async (event: any, ctx: any) => {
  const hash = event.transactionHash
  const user = event.args.user
  const amount = event.args.amount

  //venostorm
  if (ctx.address.toLowerCase() == "0x579206e4e49581ca8ada619e9e42641f61a84ac3") {
    const pid = Number(event.args.pid)
    const decimals = pid == 3 ? 8 : 18

    ctx.meter.Counter(`withdraw_counter`).add(scaleDown(amount, decimals), {
      pid: pid.toString()
    })

    ctx.eventLogger.emit("Withdraw", {
      distinctId: user,
      pid: pid,
      amount: scaleDown(amount, decimals)
    })
  }
  else {
    const stakeId = Number(event.args.stakeId)
    const weightedAmount = Number(event.args.weightedAmount)
    let pid = -1
    try {
      const stake = await ctx.contract.getUserStake(user, stakeId)
      pid = Number(stake[1])
      // console.log("get pid from view function ", pid)
    }
    catch (e) {
      console.log(e.message, "Get pid failure at withdraw event, tx ", hash)
    }

    ctx.meter.Counter(`withdraw_counter`).add(scaleDown(amount, 18), {
      pid: pid.toString()
    })

    ctx.eventLogger.emit("Withdraw", {
      distinctId: user,
      pid: pid,
      amount: scaleDown(amount, 18),
      stakeId
    })
  }
}

const WithdrawEarlyEventHandler = async (event: WithdrawEarlyEvent, ctx: FountainContext) => {
  const user = event.args.user
  const amount = Number(event.args.amount) / Math.pow(10, 18)
  const stakeId = Number(event.args.stakeId)
  let stakeInfo
  let pid = -1
  try {
    stakeInfo = await ctx.contract.getUserStake(user, stakeId, { blockTag: ctx.blockNumber - 1 })
    pid = Number(stakeInfo[1])
  }
  catch (e) {
    console.log(`get stakeInfo failed for withdrawEarly. ${user}, ${event.transactionHash}`)
  }

  ctx.meter.Counter(`withdraw_early_counter`).add(amount, { pid: pid.toString() })

  ctx.eventLogger.emit("WithdrawEarly", {
    distinctId: user,
    stakeId,
    amount,
    pid
  })
}

const ClaimVaultPenaltyEventHandler = async (event: ClaimVaultPenaltyEvent, ctx: FountainContext) => {
  const user = event.args.user
  const pendingVaultPenaltyReward = Number(event.args.pendingVaultPenaltyReward) / Math.pow(10, 18)

  ctx.meter.Counter(`penalty_claimed_counter`).add(pendingVaultPenaltyReward)

  ctx.eventLogger.emit("ClaimVaultPenalty", {
    distinctId: user,
    pendingVaultPenaltyReward
  })
}

const StakeEventHandler = async (event: StakeEvent, ctx: LiquidCroContext) => {
  const receiver = event.args.receiver
  const croAmount = Number(event.args.croAmount) / Math.pow(10, 18)
  const shareAmount = Number(event.args.shareAmount) / Math.pow(10, 18)
  ctx.meter.Counter(`lcro_staked_counter`).add(croAmount)

  ctx.eventLogger.emit("StakeLcro", {
    distinctId: receiver,
    croAmount,
    shareAmount
  })
}

const RequestUnbondEventHandler = async (event: RequestUnbondEvent, ctx: LiquidCroContext) => {
  const receiver = event.args.receiver
  const tokenId = Number(event.args.tokenId)
  const shareAmount = event.args.shareAmount
  const liquidCro2CroExchangeRate = event.args.liquidCro2CroExchangeRate
  const batchNo = Number(event.args.batchNo)
  try {
    const EXCHANGE_RATE_PRECISION = await ctx.contract.EXCHANGE_RATE_PRECISION()
    const lcro_unstaked = scaleDown(shareAmount * liquidCro2CroExchangeRate / EXCHANGE_RATE_PRECISION, 18)

    ctx.meter.Counter(`lcro_unstaked_counter`).add(lcro_unstaked)

    ctx.eventLogger.emit("RequestUnbond", {
      distinctId: receiver,
      tokenId,
      shareAmount,
      liquidCro2CroExchangeRate,
      batchNo,
      EXCHANGE_RATE_PRECISION,
      lcro_unstaked
    })
  }
  catch (e) {
    console.log(e.message, "get EXCHANGE_RATE_PRECISION issue at ", ctx.transactionHash)
  }
}

const UnbondEventHandler = async (event: UnbondEvent, ctx: LiquidCroContext) => {
  const receiver = event.args.receiver
  const tokenId = Number(event.args.tokenId)
  const croAmount = Number(event.args.croAmount) / Math.pow(10, 18)
  const croFeeAmount = Number(event.args.croFeeAmount) / Math.pow(10, 18)
  ctx.meter.Counter(`lcro_claimed`).add(croAmount)
  ctx.meter.Counter(`lcro_withdrawal_fees`).add(croFeeAmount)


  ctx.eventLogger.emit("Unbond", {
    distinctId: receiver,
    tokenId,
    croAmount,
    croFeeAmount
  })
}
const AccrueRewardEventHandler = async (event: AccrueRewardEvent, ctx: LiquidCroContext) => {
  const amount = Number(event.args.amount) / Math.pow(10, 18)
  const txnHash = event.args.txnHash
  ctx.meter.Counter(`accrueReward_counter`).add(amount)
  ctx.eventLogger.emit("AccrueReward", {
    amount,
    txnHash
  })
}

const UpgradeEventHandler = async (event: UpgradeEvent, ctx: FountainContext | ReservoirContext) => {
  const user = event.args.user
  const stakeId = event.args.stakeId
  let oldStakeInfo
  let oldPid = -1
  //retrieve old stake info
  try {
    oldStakeInfo = await ctx.contract.getUserStake(user, stakeId, { blockTag: ctx.blockNumber - 1 })
    oldPid = Number(oldStakeInfo[1])
  }
  catch (e) {
    console.log(`get old stakeInfo failed. ${user}, ${event.transactionHash}`)
  }

  //retrieve new stake info
  let newStakeInfo
  let amount = -1
  try {
    newStakeInfo = await ctx.contract.getUserStake(user, stakeId, { blockTag: ctx.blockNumber })
    amount = Number(newStakeInfo[0]) / 10 ** 18
  }
  catch (e) {
    console.log(`get old stakeInfo failed. ${user}, ${event.transactionHash}`)
  }
  // let contractName = "Reservoir"
  // if (ctx.address.toLowerCase() == "0xb4be51216f4926ab09ddf4e64bc20f499fd6ca95") contractName = "Fountain"

  ctx.meter.Counter(`upgrade_from_counter`).add(amount, { pid: oldPid.toString() })
  ctx.meter.Counter(`upgrade_to_counter`).add(amount, { pid: event.args.newPid.toString() })

  ctx.eventLogger.emit("Upgrade", {
    distinctId: user,
    stakeId,
    newPid: event.args.newPid,
    newWeightedAmount: event.args.newWeightedAmount,
    newUnlockTimestamp: event.args.newUnlockTimestamp,
    amount,
    oldPid
  })
}

const ClaimRewardsCallHandler = async (call: ClaimRewardsCallTrace, ctx: FeeDistributorContext) => {
  if (call.error) {
    return
  }
  const rewardTokens = await ctx.contract.getRewardTokens()
  const block = ctx.blockNumber
  for (const rewardToken of rewardTokens) {
    //get the reward distributed at the same block
    const getLogFilter = {
      fromBlock: block,
      toBlock: block,
      address: rewardToken,
      topics: [
        '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef'
      ]
    }

    const decimal = Number(await getERC20ContractOnContext(ctx, rewardToken).decimals())
    const symbol = await getERC20ContractOnContext(ctx, rewardToken).symbol()

    const logs = await ctx.contract.provider.getLogs(getLogFilter)

    //parse log and match conditions
    for (let i = 0; i < logs.length; i++) {
      const parsedLog = await processLog(logs[i])
      //from fee distributor to fountain/reservoir
      if (parsedLog?.args.src.toLowerCase() == ctx.address.toLowerCase()) {
        ctx.eventLogger.emit("ReservoirHarvest", {
          distinctId: call.action.from,
          amount: Number(parsedLog?.args.wad) / 10 ** decimal,
          coin_symbol: (symbol == "WCRO") ? "CRO" : symbol
        })
      }
    }
  }
}

interface nftMetadata {
  name: string,
  symbol: string
}

const StakeNftCallHandler = async (call: StakeNftCallTrace, ctx: VenostormContext) => {
  if (call.error) {
    return
  }
  const pid = call.args._pid
  const nfts = call.args._nfts
  for (let i = 0; i < nfts.length; i++) {
    let [nftName, nftSymbol] = ["unk", "unk"]
    try {
      const metadata = await getOrCreateERC721(ctx, nfts[i][0])
      nftName = metadata.name
      nftSymbol = metadata.symbol
    }
    catch (e) {
      console.log(`get erc721 failed at ${ctx.transactionHash}`)
    }
    ctx.eventLogger.emit("StakeNftCall", {
      distinctId: call.action.from,
      pid,
      tokenContract: nfts[i][0],
      tokenId: nfts[i][1],
      nftName,
      nftSymbol,
      amount: 1
    })
  }
}

const UnstakeNftCallHandler = async (call: UnstakeNftCallTrace, ctx: VenostormContext) => {
  if (call.error) {
    return
  }
  const pid = call.args._pid
  const nfts = call.args._nfts
  for (let i = 0; i < nfts.length; i++) {
    let [nftName, nftSymbol] = ["unk", "unk"]
    try {
      const metadata = await getOrCreateERC721(ctx, nfts[i][0])
      nftName = metadata.name
      nftSymbol = metadata.symbol
    }
    catch (e) {
      console.log(`get erc721 failed at ${ctx.transactionHash}`)
    }

    ctx.eventLogger.emit("UnstakeNftCall", {
      distinctId: call.action.from,
      pid,
      tokenContract: nfts[i][0],
      tokenId: nfts[i][1],
      nftName,
      nftSymbol,
      amount: 1
    })
  }
}
const nftStakeEventHandler = async (event: any, ctx: VenostormContext) => {
  ctx.eventLogger.emit("nftStakeEvent", {
    //@ts-ignore
    distinctId: event.args.staker,
    //@ts-ignore
    tokenId: event.args.tokenId,
    //@ts-ignore
    tokenContract: event.args.tokenContract
  })
}

const nftUnstakeEventHandler = async (event: UnstakeEvent, ctx: VenostormContext) => {
  ctx.eventLogger.emit("nftUnstakeEvent", {
    //@ts-ignore
    distinctId: event.args.staker,
    //@ts-ignore
    tokenId: event.args.tokenId,
    //@ts-ignore
    tokenContract: event.args.tokenContract
  })
}

async function processLog(log: any) {
  const Erc20Abi = [
    "event Transfer(address indexed src, address indexed dst, uint wad)"
  ]
  const interfce = new ethers.Interface(Erc20Abi);
  return interfce.parseLog(log)
}


FountainProcessor.bind({ address: '0xb4be51216f4926ab09ddf4e64bc20f499fd6ca95', network: EthChainId.CRONOS })
  .onEventDeposit(DepositEventHandler)
  .onEventWithdraw(WithdrawEventHandler)
  .onEventWithdrawEarly(WithdrawEarlyEventHandler)
  .onEventClaimVaultPenalty(ClaimVaultPenaltyEventHandler)
  .onEventUpgrade(UpgradeEventHandler)

ReservoirProcessor.bind({ address: '0x21179329c1dcfd36ffe0862cca2c7e85538cca07', network: EthChainId.CRONOS })
  .onEventDeposit(DepositEventHandler)
  .onEventWithdraw(WithdrawEventHandler)
  .onEventUpgrade(UpgradeEventHandler)


VenostormProcessor.bind({ address: '0x579206e4e49581ca8ada619e9e42641f61a84ac3', network: EthChainId.CRONOS })
  .onEventDeposit(DepositEventHandler)
  .onEventWithdraw(WithdrawEventHandler)
  .onCallStakeNft(StakeNftCallHandler)
  .onCallUnstakeNft(UnstakeNftCallHandler)
  .onEventStake(nftStakeEventHandler)
  .onEventUnstake(nftUnstakeEventHandler)


LiquidCroProcessor.bind({ address: '0x9fae23a2700feecd5b93e43fdbc03c76aa7c08a6', network: EthChainId.CRONOS })
  .onEventStake(StakeEventHandler)
  .onEventRequestUnbond(RequestUnbondEventHandler)
  .onEventUnbond(UnbondEventHandler)
  .onEventAccrueReward(AccrueRewardEventHandler)

FeeDistributorProcessor.bind({ address: '0x4758de8640cf7fef229c20299ad853c86c0c1e39', network: EthChainId.CRONOS })
  .onCallClaimRewards(ClaimRewardsCallHandler)
