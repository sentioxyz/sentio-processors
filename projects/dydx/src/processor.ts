import { DYDX_PERPETUAL_ADDR, DYDX_V2_STARTBLOCK, USDC_ADDR} from './constant'
import { LogDepositEvent, LogWithdrawalPerformedEvent, LogMintWithdrawalPerformedEvent } from './types/dydxperpetual'
import { DydxPerpetualContext, DydxPerpetualProcessor } from './types/dydxperpetual'
import { ERC20Context, ERC20Processor, getERC20Contract } from '@sentio/sdk/lib/builtin/erc20'
import {BigNumber} from 'ethers'
import { hexDataSlice, solidityKeccak256 } from "ethers/lib/utils";

const USDC_DECIMAL = 6

const TOKEN_ADDRESS_MAP = new Map<BigNumber, string>()
// another flexible processing example:
// https://github.com/NethermindEth/Forta-Agents/blob/main/DYDX-Bots/Perpetual-Large-Deposits-Withdrawals/src/agent.ts#L48
const logDepositEventHandler = async (event:LogDepositEvent, ctx: DydxPerpetualContext) => {
  // deducted 10^6 from this tx and log amount
  //https://etherscan.io/tx/0xae3f3d6aaf8a63c5dab6780a811f1e6b514e193381ea6d2c1b2f245821358d5a
  const amount = Number(event.args.quantizedAmount.toBigInt()) / 10 ** USDC_DECIMAL
  ctx.meter.Gauge('deposit').record(amount)
  const lastBalance = Number(await getERC20Contract(USDC_ADDR).balanceOf(DYDX_PERPETUAL_ADDR, {blockTag: Number(ctx.blockNumber) - 1})) / 10**USDC_DECIMAL
  ctx.meter.Gauge('deposit_ratio').record(amount / lastBalance )
}

// feature request:
// get data directly from contract storage
// https://github.com/NethermindEth/Forta-Agents/blob/main/DYDX-Bots/Perpetual-Large-Deposits-Withdrawals/src/token.address.fetcher.ts#L30
// related info: https://docs.starkware.co/starkex-v4/starkex-deep-dive/starkex-specific-concepts#assetinfo-assettype-and-assetid
const logWithdrawalPerformedEventHandler =async (event:LogWithdrawalPerformedEvent, ctx: DydxPerpetualContext) => {
  const amount = Number(event.args.quantizedAmount.toBigInt())  / 10 ** USDC_DECIMAL

  ctx.meter.Gauge('withdrawl').record(amount)

  const lastBalance = Number(await getERC20Contract(USDC_ADDR).balanceOf(DYDX_PERPETUAL_ADDR, {blockTag: Number(ctx.blockNumber) - 1})) / 10**USDC_DECIMAL
  ctx.meter.Gauge('withdraw_ratio').record(amount / lastBalance )
}

const logWithdrawalPerformedEventHandler2 =async (event:LogWithdrawalPerformedEvent, ctx: DydxPerpetualContext) => {
  const amount = Number(event.args.quantizedAmount.toBigInt())  / 10 ** USDC_DECIMAL
  const assetType = event.args.assetType
  const asset_address = await extractTokenAddress(assetType, ctx, Number(ctx.blockNumber))
  ctx.meter.Gauge('withdrawl').record(amount, {"token": asset_address})

  const lastBalance = Number(await getERC20Contract(asset_address).balanceOf(DYDX_PERPETUAL_ADDR, {blockTag: Number(ctx.blockNumber) - 1})) / 10**USDC_DECIMAL
  ctx.meter.Gauge('withdraw_ratio').record(amount / lastBalance, {"token": asset_address})
}

const logMintWithdrawalPerformedEventHandler =async (event:LogMintWithdrawalPerformedEvent, ctx: DydxPerpetualContext) => {
  const amount = Number(event.args.quantizedAmount.toBigInt() )/ 10 ** USDC_DECIMAL
  ctx.meter.Gauge('mintWithdrawl').record(amount)
  const lastBalance = Number(await getERC20Contract(USDC_ADDR).balanceOf(DYDX_PERPETUAL_ADDR, {blockTag: Number(ctx.blockNumber) - 1})) / 10**USDC_DECIMAL
  ctx.meter.Gauge('mintWithdrawl_ratio').record(amount / lastBalance )
}

// experimenting with getStorageAt
// TODO: decimal is not correctly handled
const logMintWithdrawalPerformedEventHandler2 =async (event:LogMintWithdrawalPerformedEvent, ctx: DydxPerpetualContext) => {
  const amount = Number(event.args.quantizedAmount.toBigInt() )/ 10 ** USDC_DECIMAL
  const assetType = event.args.assetType
  const asset_address = await extractTokenAddress(assetType, ctx, Number(ctx.blockNumber))
  ctx.meter.Gauge('mintWithdrawl').record(amount, {"token": asset_address})
  const lastBalance = Number(await getERC20Contract(asset_address).balanceOf(DYDX_PERPETUAL_ADDR, {blockTag: Number(ctx.blockNumber) - 1})) / 10**USDC_DECIMAL
  ctx.meter.Gauge('mintWithdrawl_ratio').record(amount / lastBalance, {"token": asset_address})

}

const extractTokenAddress = async (assetType: BigNumber, context: DydxPerpetualContext, block: number | string): Promise<string> => {
  if (TOKEN_ADDRESS_MAP.has(assetType)) {
    return TOKEN_ADDRESS_MAP.get(assetType)!
  }
  const OFFSET = 16;
  // TODO: to generalize for different chains see:
  // https://github.com/NethermindEth/Forta-Agents/blob/main/DYDX-Bots/Perpetual-Large-Deposits-Withdrawals/src/network.ts#L1
  // hard code this for mainnet for now
  const mappingSlot = 20;
  const perpetualProxy = "0xD54f502e184B6B739d7D27a6410a67dc462D69c8";


  // extract AssetInfo.
  // sizeSlot stores the (data length * 2 + 1) since it is >= 32bytes.
  const sizeSlot = solidityKeccak256(
    ["uint", "uint"],
    [assetType.toHexString(), mappingSlot]
  );

  // dataSlot is the slot where data begins.
  const dataSlot = solidityKeccak256(["uint"], [sizeSlot]);

  // assetInfo is 36bytes long, therefore stored on two slots.
  const [data1, data2] = await Promise.all([
    context.contract.provider.getStorageAt(perpetualProxy, dataSlot, block),
    context.contract.provider.getStorageAt(
      perpetualProxy,
      BigNumber.from(dataSlot).add(1).toHexString(),
      block
    ),
  ]);

  // we extract the assetInfo from the two slots.
  const assetInfo = data1 + data2.slice(2, 10);

  // extract token address
  const tokenAddress = hexDataSlice(assetInfo, OFFSET);
  TOKEN_ADDRESS_MAP.set(assetType, tokenAddress)
  return tokenAddress;
};

// USDC uses 6 for decimal
const balanceProcessor = async function (block: any, ctx: ERC20Context) {
  const balance = Number((await ctx.contract.balanceOf(DYDX_PERPETUAL_ADDR)).toBigInt() ) / 10 ** 6
  ctx.meter.Gauge('usdc_balance').record(balance)
}

ERC20Processor.bind({address: USDC_ADDR, startBlock: DYDX_V2_STARTBLOCK})
.onBlock(balanceProcessor)

//TODO: change starting block
DydxPerpetualProcessor.bind({address: DYDX_PERPETUAL_ADDR, startBlock: 13424545})
.onEventLogDeposit(logDepositEventHandler)
.onEventLogMintWithdrawalPerformed(logMintWithdrawalPerformedEventHandler2)
.onEventLogWithdrawalPerformed(logWithdrawalPerformedEventHandler2)
