import { VaultsProcessor } from './types/solana/vaults_processor.js'

VaultsProcessor.bind({ address: 'jupr81YtYssSyPt8jbnGuiWon5f6x9TcDEFxYe3Bdzi', processInnerInstruction: true })
  .onInit_vault_config((args, accounts, ctx) => {
    const { vault_config, supply_token, borrow_token } = accounts
    console.log('new vault config', args.vault_id, vault_config, supply_token, borrow_token)
    ctx.eventLogger.emit('vault-config', {
      vault_id: args.vault_id,
      vault_config,
      supply_token,
      borrow_token,
    })
    // TODO save [vault_id, vault_config, supply_token, borrow_token]
  })
  .onInit_vault_state((args, accounts, ctx) => {
    const { vault_config, vault_state } = accounts
    console.log('new vault state', args.vault_id, vault_state)
    ctx.eventLogger.emit('vault-state', {
      vault_id: args.vault_id,
      vault_state,
    })
    // TODO use vault_state to get total_supply and total_borrow
  })
