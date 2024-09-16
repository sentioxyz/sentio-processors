import { EthChainId } from '@sentio/sdk/eth'
import { ERC20Processor } from '@sentio/sdk/eth/builtin'
import { DERIVE_VAULTS, MAINNET_VAULT_PRICE_START_BLOCK, OP_SEPOLIA_VAULT_PRICE_START_BLOCK, VaultName } from '../src/config.js'
import { DeriveVaultUserSnapshot } from '../src/schema/store.js'
import { updateUserSnapshotAndEmitPointUpdate } from './utils/userSnapshotsAndPoints.js'
import { saveCurrentVaultTokenPrice } from './utils/vaultTokenPrice.js'
import { GlobalProcessor } from '@sentio/sdk/eth'

/////////////////
// Methodology //
/////////////////

// DBs Snapshots
// - At every transfer event or time interval, we save the latest `DeriveVaultUserSnapshot` of a user in `sentio.ctx.store`
// - For each token, once per day store `DeriveVaultTokenPrice` price

// Events
// 3. At every transfer event or time interval, we emit a `point_update` event which saves the points earned by user for the last hour
// 4. At every time interval, save `token_price_update`


/////////////////////////////////
// Mainnet or OP Sepolia Binds //
/////////////////////////////////

for (const params of [
  DERIVE_VAULTS.LBTCPS,
  // DERIVE_VAULTS.LBTCPS_TESTNET,
]) {
  ERC20Processor.bind(
    { address: params.mainnet_or_opsep, network: params.destinationChainId }
  )
    .onEventTransfer(async (event, ctx) => {
      for (const user of [event.args.from, event.args.to]) {
        await updateUserSnapshotAndEmitPointUpdate(ctx, params.vaultName, ctx.address, user)
      }
    })
    // this time interval handles all three vaults (weETHC, weETHCS, weETHBULL)
    .onTimeInterval(async (_, ctx) => {
      const userSnapshots: DeriveVaultUserSnapshot[] = await ctx.store.list(DeriveVaultUserSnapshot, []);

      try {
        const promises = [];
        for (const snapshot of userSnapshots) {
          promises.push(
            await updateUserSnapshotAndEmitPointUpdate(ctx, snapshot.vaultName as VaultName, snapshot.vaultAddress, snapshot.owner)
          );
        }
        await Promise.all(promises);
      } catch (e) {
        console.log("onTimeInterval error", e.message, ctx.timestamp);
      }
    },
      60 * 1,
      60 * 1 // backfill at 1 hour
    )
}


for (const params of [
  DERIVE_VAULTS.LBTCCS,
  // DERIVE_VAULTS.LBTCCS_TESTNET,
]) {
  ERC20Processor.bind({ address: params.mainnet_or_opsep, network: params.destinationChainId })
    .onEventTransfer(async (event, ctx) => {
      for (const user of [event.args.from, event.args.to]) {
        await updateUserSnapshotAndEmitPointUpdate(ctx, params.vaultName, ctx.address, user)
      }
    })
}

////////////////////////////////////////
// Lyra Chain Vault Token Price Binds //
////////////////////////////////////////
for (const params of [
  { network: EthChainId.ETHEREUM, startBlock: MAINNET_VAULT_PRICE_START_BLOCK },
  // { network: EthChainId.BOB, startBlock: OP_SEPOLIA_VAULT_PRICE_START_BLOCK },
]) {

  GlobalProcessor.bind(
    params
  ).onTimeInterval(async (_, ctx) => {
    if (params.network === EthChainId.ETHEREUM) {
      await saveCurrentVaultTokenPrice(ctx, DERIVE_VAULTS.LBTCPS)
      await saveCurrentVaultTokenPrice(ctx, DERIVE_VAULTS.LBTCCS)
    } else {
      // await saveCurrentVaultTokenPrice(ctx, DERIVE_VAULTS.LBTCPS_TESTNET)
      // await saveCurrentVaultTokenPrice(ctx, DERIVE_VAULTS.LBTCCS_TESTNET)
    }
  },
    60 * 1,
    60 * 1
  )
}