/// Module: Migration
/// migrate from volo v1 to volo v2
/// migration will be only executed once
/// flow:
/// 1. create stake pool
/// 2. export stakes
/// 3. take unclaimed fees
/// 4. import stakes
/// 5. destroy migration cap
/// 6. unpause the pool (after migration)
module liquid_staking::migration {
    use sui::{
        balance::{Self, Balance},
        coin::{Coin},
        sui::SUI,
        event,
    };

    use sui_system::sui_system::{SuiSystemState};

    use liquid_staking::{
        validator_set::{
            export_stakes_from_v1,
        },
        native_pool::{NativePool},
        ownership::{OwnerCap},
        stake_pool::{Self, StakePool, AdminCap},
        cert::{Metadata, CERT},
    };

    // migration 
    public struct ExportedEvent has copy, drop {
        total_sui_balance: u64,
        exported_count: u64,
        sui_amount: u64,
        pending_sui_amount: u64,
        epoch: u64
    }

    public struct ImportedEvent has copy, drop {
        imported_amount: u64,
        ratio: u64,
    }

    public struct UnclaimedFeesEvent has copy, drop {
        amount: u64,
    }

    public struct SuiChangedEvent has copy, drop {
        amount: u64,
    }

    public struct MigrationStorage has key, store {
        id: UID,
        sui_balance: Balance<SUI>,
        exported_count: u64,
    }

    public struct MigrationCap has key, store {
        id: UID,
        pool_created: bool,
        fees_taken: bool,
    }

    // 0. init migration storage and cap
    #[allow(lint(self_transfer))]
    public fun init_objects(owner_cap: &OwnerCap, native_pool: &mut NativePool, ctx: &mut TxContext) {

        // ensure this function is only called once
        native_pool.mark_cap_created();

        // sanity check to avoid double migration
        // collected_rewards will be set to 0 in the first migration
        assert!(native_pool.mut_collected_rewards() != 0, 0);
        native_pool.set_pause(owner_cap, true);

        let migration_storage = MigrationStorage {
            id: object::new(ctx),
            sui_balance: balance::zero<SUI>(),
            exported_count: 0,
        };

        let migration_cap = MigrationCap {  
            id: object::new(ctx),
            pool_created: false,
            fees_taken: false,
        };

        transfer::public_share_object(migration_storage);
        transfer::public_transfer(migration_cap, ctx.sender());
    }

    // 1. create stake pool
    public fun create_stake_pool(
        migration_cap: &mut MigrationCap,
        ctx: &mut TxContext
    ) {
        assert!(!migration_cap.pool_created, 0);
        migration_cap.pool_created = true;
        stake_pool::create_stake_pool(ctx);
    }

    // 2. export stakes
    public fun export_stakes(
        migration_storage: &mut MigrationStorage,
        _: &MigrationCap,
        native_pool: &mut NativePool,
        system_state: &mut SuiSystemState,
        max_iterations: u64,
        ctx: &mut TxContext
    ) {
        let validator_set = native_pool.mut_validator_set();
        let (exported_sui, exported_count, exported_sui_amount)
        = export_stakes_from_v1(validator_set, system_state, max_iterations, ctx);

        migration_storage.sui_balance.join(exported_sui);
        migration_storage.exported_count = migration_storage.exported_count + exported_count;

        // take pending
        let pending = native_pool.mut_pending();
        let pending_sui = pending.balance_mut().withdraw_all();
        let pending_sui_amount = pending_sui.value();
        migration_storage.sui_balance.join(pending_sui);

        event::emit(
            ExportedEvent {
                total_sui_balance: migration_storage.sui_balance.value(),
                exported_count,
                sui_amount: exported_sui_amount,
                pending_sui_amount: pending_sui_amount,
                epoch: ctx.epoch(),
            }
        );
    }

    // 3. take unclaimed fees
    public fun take_unclaimed_fees(
        migration_storage: &mut MigrationStorage,
        migration_cap: &mut MigrationCap,
        recipient: address,
        native_pool: &mut NativePool,
        ctx: &mut TxContext
    ) {
        let unclaimed_fees = native_pool.mut_collected_rewards();
        let fee_amount = *unclaimed_fees;
        let fees = migration_storage.sui_balance.split(fee_amount);
        transfer::public_transfer(fees.into_coin(ctx), recipient);
        *unclaimed_fees = 0;
        migration_cap.fees_taken = true;
        event::emit(
            UnclaimedFeesEvent {
                amount: fee_amount,
            }
        );
    }

    // 4. import stakes
    public fun import_stakes(
        migration_storage: &mut MigrationStorage,
        _: &MigrationCap,
        admin_cap: &AdminCap,
        stake_pool: &mut StakePool,
        metadata: &mut Metadata<CERT>,
        system_state: &mut SuiSystemState,
        import_amount: u64,
        min_ratio: u64,
        ctx: &mut TxContext
    ) {
        let amount = import_amount.min(migration_storage.sui_balance.value());

        // temporarily unpause the pool to allow import
        stake_pool.set_paused(admin_cap, false);
        stake_pool.join_to_sui_pool(migration_storage.sui_balance.split(amount));
        stake_pool.rebalance(metadata, system_state, ctx);
        stake_pool.set_paused(admin_cap, true);

        // sanity check
        let ratio = stake_pool.get_ratio(metadata);
        assert!(ratio <= min_ratio, 0);

        event::emit(ImportedEvent {
            imported_amount: amount,
            ratio
        });
    }

    // 5. destroy migration cap
    public fun destroy_migration_cap(
        migration_cap: MigrationCap,
        migration_storage: &MigrationStorage,
        target_exported_count: u64,
    ) {
        assert!(migration_storage.exported_count == target_exported_count, 1);
        assert!(migration_storage.sui_balance.value() == 0, 3);

        let MigrationCap{ id, pool_created, fees_taken } = migration_cap;
        assert!(pool_created, 0);
        assert!(fees_taken, 2);
        id.delete();
    }

    // for unexpeced situtations
    public fun deposit_sui(
        migration_storage: &mut MigrationStorage,
        _: &mut MigrationCap,
        sui_balance: &mut Coin<SUI>,
        amount: u64,
        ctx: &mut TxContext
    ) {
        migration_storage.sui_balance.join(
            sui_balance.split(amount, ctx).into_balance()
        );
        event::emit(
            SuiChangedEvent {
                amount: migration_storage.sui_balance.value(),
            }
        );
    }

    #[test_only]
    public fun test_init(ctx: &mut TxContext) {
        let migration_storage = MigrationStorage {
            id: object::new(ctx),
            sui_balance: balance::zero<SUI>(),
            exported_count: 0,
        };

        let migration_cap = MigrationCap {  
            id: object::new(ctx),
            pool_created: false,
            fees_taken: false,
        };

        transfer::public_share_object(migration_storage);
        transfer::public_transfer(migration_cap, ctx.sender());    
    }

    #[test_only]
    public fun get_sui_balance_for_testing(migration_storage: &MigrationStorage): u64 {
        migration_storage.sui_balance.value()
    }

    #[test_only]
    public fun get_exported_count_for_testing(migration_storage: &MigrationStorage): u64 {
        migration_storage.exported_count
    }
}