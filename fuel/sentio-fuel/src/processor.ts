import { LogLevel } from '@sentio/sdk'
import { FuelGlobalProcessor, FuelNetwork } from '@sentio/sdk/fuel'

FuelGlobalProcessor.bind({ chainId: FuelNetwork.MAIN_NET }).onTransaction(async (tx, ctx) => {
  ctx.eventLogger.emit('transactions', {
    block_id: tx.blockId,
    block_height: tx.blockNumber,
    block_time_ms: ctx.timestamp.valueOf(),
    block_time: ctx.timestamp.toISOString(),
    block_header_json: JSON.stringify(ctx.block?.header),
    transaction_id: tx.id,
    transaction_index: '',
    call_contracts: '',
    call_functions: '',
    created_contracts: '',
    assets: '',
    asset_input_owners: '',
    asset_output_owners: '',
    log_ra_set: '',
    log_rb_set: '',
    log_rc_set: '',
    log_rd_set: '',
    is_script: tx.isTypeScript,
    is_create: tx.isTypeCreate,
    is_mint: tx.isTypeMint,
    is_upgrade: tx.isTypeUpgrade,
    is_upload: tx.isTypeUpload,
    status: tx.status,
    transaction_json: JSON.stringify(tx),
    partition: ''
  })
})
