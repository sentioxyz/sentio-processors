import { clob_v2, custodian_v2 } from "./types/sui/deepbook.js"
import { SuiContext } from "@sentio/sdk/sui"
import { SuiTransactionBlockResponse } from '@mysten/sui.js/client'
import { getCoinAddressFromType, getOrCreateCoin } from './helper/getCoinOrPool.js'

const orderFilledHandler = async (event: clob_v2.OrderFilledInstance, ctx: SuiContext) => {

  const sender = event.sender
  const type = event.type

  const pool_id = event.data_decoded.pool_id
  const order_id = event.data_decoded.order_id
  const taker_address = event.data_decoded.taker_address
  const maker_address = event.data_decoded.maker_address

  const is_bid = event.data_decoded.is_bid //true for buying base with quote, false for selling base to quote

  const base_asset_quantity_filled = Number(event.data_decoded.base_asset_quantity_filled)
  const base_asset_quantity_remaining = Number(event.data_decoded.base_asset_quantity_remaining)
  const price = Number(event.data_decoded.price)
  const taker_commission = Number(event.data_decoded.taker_commission)
  const maker_rebates = Number(event.data_decoded.maker_rebates)

  const base_asset_quantity_filled_usd = base_asset_quantity_filled * price
  const base_asset_quantity_remaining_usd = base_asset_quantity_remaining * price

  ctx.eventLogger.emit("OrderFilled", {
    distinctId: sender,
    type,
    pool_id,
    order_id,
    taker_address,
    maker_address,
    is_bid,
    base_asset_quantity_filled_usd,
    base_asset_quantity_remaining_usd,
    base_asset_quantity_filled,
    base_asset_quantity_remaining,
    price,
    taker_commission,
    maker_rebates
  })
}


const DepositAssetHandler = async (event: clob_v2.DepositAssetInstance, ctx: SuiContext) => {
  const time = event.timestampMs
  const sender = event.sender
  const type = event.type

  const pool_id = event.data_decoded.pool_id

  const quantity = Number(event.data_decoded.quantity)

  const owner = event.data_decoded.owner


  ctx.eventLogger.emit("Deposit", {
    time,
    distinctId: sender,
    type,
    pool_id,
    quantity,
    owner
  })
}

const WithdrawAssetHandler = async (event: clob_v2.WithdrawAssetInstance, ctx: SuiContext) => {
  const time = event.timestampMs
  const sender = event.sender
  const type = event.type

  const pool_id = event.data_decoded.pool_id

  const quantity = Number(event.data_decoded.quantity)

  const owner = event.data_decoded.owner

  ctx.eventLogger.emit("Withdraw", {
    time,
    distinctId: sender,
    type,
    pool_id,
    quantity,
    owner
  })
}


clob_v2.bind()
  .onEventOrderFilled(orderFilledHandler)
  .onEventWithdrawAsset(WithdrawAssetHandler)
  .onEventDepositAsset(DepositAssetHandler)
