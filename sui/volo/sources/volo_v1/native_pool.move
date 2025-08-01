// SPDX-License-Identifier: MIT

/// Pool allows exchange SUI for CERT and request to exchange it back at a possibly better rate.
/// 
/// Glossary:
/// * instant unstake - unstake when user can burn tokens and receive SUI in the same epoch
/// * active stake - StakedSui staked during previous epochs
#[allow(duplicate_alias, unused, lint(coin_field))]
module liquid_staking::native_pool {
    use std::vector;
    use sui::transfer;
    use sui::tx_context::{Self, TxContext};
    use sui::object::{Self, UID};
    use sui::sui::{SUI};
    use sui::balance::{Self};
    use sui::coin::{Self, Coin};
    use sui::event;
    use sui::table::{Self, Table};
    use sui::clock::{Self, Clock};
    use sui::dynamic_field::{Self};
    use sui_system::sui_system::{Self, SuiSystemState};
    use liquid_staking::ownership::{OwnerCap, OperatorCap};
    use liquid_staking::cert::{Self, CERT, Metadata};
    use liquid_staking::validator_set::{Self, ValidatorSet};
    use liquid_staking::unstake_ticket::{Self, UnstakeTicket};
    use liquid_staking::math;

    // Track the current version of the module, iterate each upgrade
    const VERSION: u64 = 2;
    const ONE_SUI: u64 = 1_000_000_000;
    const MAX_PERCENT: u64 = 100_00; // represent 100.00%, used in threshold and percent calculation
    const REWARD_UPDATE_DELAY: u64 = 43_200_000; // 12h * 60m * 60s * 1000ms
    const MAX_UINT_64: u64 = 18_446_744_073_709_551_615;

    /* Errors definition, namespace=100 */

    // Calling functions from the wrong package version
    const E_INCOMPATIBLE_VERSION: u64 = 1;

    const E_MIN_LIMIT: u64 = 100;
    // Calling functions while pool is paused
    const E_PAUSED: u64 = 101;
    const E_LIMIT_TOO_LOW: u64 = 102;
    const E_NOTHING_TO_UNSTAKE: u64 = 103;
    const E_TICKET_LOCKED: u64 = 104;
    const E_LESS_REWARDS: u64 = 105;
    const E_DELAY_NOT_REACHED: u64 = 106;
    const E_REWARD_NOT_IN_THRESHOLD: u64 = 107;
    const E_BAD_SHARES: u64 = 108;
    const E_TOO_BIG_PERCENT: u64 = 109;
    const E_NOT_ENOUGH_BALANCE: u64 = 110;

    const E_DEPRECATED: u64 = 999;

    /* Events */
    public struct StakedEvent has copy, drop {
        staker: address,
        sui_amount: u64,
        cert_amount: u64,
    }

    public struct UnstakedEvent has copy, drop {
        staker: address,
        cert_amount: u64,
        sui_amount: u64
    }

    public struct MinStakeChangedEvent has copy, drop {
        prev_value: u64,
        new_value: u64
    }

    public struct UnstakeFeeThresholdChangedEvent has copy, drop {
        prev_value: u64,
        new_value: u64,
    }

    public struct BaseUnstakeFeeChangedEvent has copy, drop {
        prev_value: u64,
        new_value: u64,
    }

    public struct BaseRewardFeeChangedEvent has copy, drop {
        prev_value: u64,
        new_value: u64,
    }

    public struct RewardsThresholdChangedEvent has copy, drop {
        prev_value: u64,
        new_value: u64,
    }

    public struct RewardsUpdated has copy, drop {
        value: u64,
    }

    public struct StakedUpdated has copy, drop {
        total_staked: u64,
        epoch: u64,
    }

    public struct FeeCollectedEvent has copy, drop {
        to: address,
        value: u64
    }

    public struct PausedEvent has copy, drop {
        paused: bool
    }

    public struct MigratedEvent has copy, drop {
        prev_version: u64,
        new_version: u64,
    }

    public struct RatioUpdatedEvent has copy, drop {
        ratio: u256,

    }

    /* Objects */
    
    // Liquid staking pool object
    public struct NativePool has key {
        id: UID,

        pending: Coin<SUI>, // pending SUI that should be staked
        collectable_fee: Coin<SUI>, // owner fee
        validator_set: ValidatorSet, // pool validator set
        ticket_metadata: unstake_ticket::Metadata,

        /* Store active stake of each epoch */
        total_staked: Table<u64, u64>,
        staked_update_epoch: u64,

        /* Fees */
        base_unstake_fee: u64, // percent of fee per 1 SUI
        unstake_fee_threshold: u64, // percent of active stake
        base_reward_fee: u64, // percent of rewards

        /* Access */
        version: u64,
        paused: bool,

        /* Limits */
        min_stake: u64, // all stakes should be greater than

        /* General stats */
        total_rewards: u64, // current rewards of pool, we can't calculate them, because it's impossible to do on current step
        collected_rewards: u64, // rewards that stashed as protocol fee

        /* Thresholds */
        rewards_threshold: u64, // percent of rewards that possible to increase
        rewards_update_ts: u64, // timestamp when we updated rewards last time
    }

    fun init(ctx: &mut TxContext) {
        let mut total_staked = table::new<u64, u64>(ctx);
        // initialize with zeros
        table::add(&mut total_staked, 0, 0);

        transfer::share_object(NativePool {
            id: object::new(ctx),
            version: VERSION,
            paused: false,
            pending: coin::zero<SUI>(ctx),
            collectable_fee: coin::zero<SUI>(ctx),
            total_staked,
            staked_update_epoch: 0,
            base_reward_fee: 10_00, // 10.00%
            min_stake: ONE_SUI,
            validator_set: validator_set::create(ctx),
            ticket_metadata: unstake_ticket::create_metadata(ctx),
            base_unstake_fee: 5, // 0.05%
            rewards_threshold: 1_00, // 1.00%
            total_rewards: 0,
            collected_rewards: 0,
            rewards_update_ts: 0,
            unstake_fee_threshold: 10_00, // 10.00%
        });
    }

    /* Pool read methods */

    public fun get_pending(self: &NativePool): u64 {
        coin::value(&self.pending)
    }

    /// returns last known total staked amount
    public fun get_total_staked(self: &NativePool): u64 {
        let pending = get_pending(self);
        // field at staked_update_epoch must exist
        *table::borrow(&self.total_staked, self.staked_update_epoch) + pending
    }

    /// returns total staked for active epoch
    /// active stake can be unstaked
    public fun get_total_active_stake(self: &NativePool, ctx: &mut TxContext): u64 {
        let mut last_active_epoch = self.staked_update_epoch;
        let current_epoch = tx_context::epoch(ctx);

        if (last_active_epoch > current_epoch) {
            last_active_epoch = current_epoch;
        };
        
        let pending = get_pending(self);
        *table::borrow(&self.total_staked, last_active_epoch) + pending
    }

    public fun get_total_rewards(self: &NativePool): u64 {
        self.total_rewards - self.collected_rewards
    }

    fun calculate_reward_fee(self: &NativePool, value: u64): u64 {
        math::mul_div(value, self.base_reward_fee, MAX_PERCENT)
    }

    public fun get_min_stake(self: &NativePool): u64 {
        self.min_stake
    }

    public fun get_unstake_fee_threshold(self: &NativePool): u64 {
        self.unstake_fee_threshold
    }

    public fun calculate_unstake_fee(self: &NativePool, value: u64): u64 {
        math::mul_div(value, self.base_unstake_fee, MAX_PERCENT)
    }

    #[test_only]
    public fun get_total_stake_of(self: &NativePool, validator: address): u64 {
        validator_set::get_total_stake(&self.validator_set, validator)
    }

    #[test_only]
    public fun get_ticket_supply(self: &NativePool): u64 {
        unstake_ticket::get_total_supply(&self.ticket_metadata)
    }

    /* Pool update methods */

    // we can allow to stake less than 1 SUI
    public entry fun change_min_stake(self: &mut NativePool, _owner_cap: &OwnerCap, value: u64) {
        abort E_DEPRECATED
    }

    public entry fun change_unstake_fee_threshold(self: &mut NativePool, _owner_cap: &OwnerCap, value: u64) {
        abort E_DEPRECATED
    }

    public entry fun change_base_unstake_fee(self: &mut NativePool, _owner_cap: &OwnerCap, value: u64) {
        abort E_DEPRECATED
    }

    public entry fun change_base_reward_fee(self: &mut NativePool, _owner_cap: &OwnerCap, value: u64) {
        abort E_DEPRECATED
    }

    // update validators and their priorities in validator set
    public entry fun update_validators(self: &mut NativePool, validators: vector<address>, priorities: vector<u64>, _operator_cap: &OperatorCap) {
        abort E_DEPRECATED
    }

    public entry fun update_rewards_threshold(self: &mut NativePool, _owner_cap: &OwnerCap, value: u64) {
        abort E_DEPRECATED
    }

    /// operator cap gives capability to upgrade ratio of token with requirements
    public entry fun update_rewards(self: &mut NativePool, clock: &Clock, value: u64, _operator_cap: &OperatorCap) {
        abort E_DEPRECATED
    }

    public entry fun publish_ratio(self: &NativePool, metadata: &Metadata<CERT>) {
        abort E_DEPRECATED
    }

    fun set_rewards_unsafe(self: &mut NativePool, value: u64) {
        self.total_rewards = value;
        event::emit(RewardsUpdated {
            value: self.total_rewards,
        });
    }

    fun sub_rewards_unsafe(self: &mut NativePool, value: u64) {
        if (value > self.total_rewards) {
            self.total_rewards = 0;
        } else {
            self.total_rewards = self.total_rewards - value;
        };
        event::emit(RewardsUpdated {
            value: self.total_rewards,
        });
    }

    // add value to next epoch
    fun add_total_staked_unsafe(self: &mut NativePool, value: u64, ctx: &mut TxContext) {
        let cur_epoch = tx_context::epoch(ctx);
        let next_epoch = cur_epoch + 1;

        let new_total_staked;

        // if we don't have field for current epoch just create it
        // because in case if we want to get_total_active_stake we can't determine where was staked_update_epoch cursor
        // in case if staked_update_epoch > cur_epoch we must have the field at cur_epoch 
        if (!table::contains(&self.total_staked, cur_epoch)) {
            let last_total_staked = *table::borrow(&self.total_staked, self.staked_update_epoch);
            self.staked_update_epoch = cur_epoch;

            table::add(&mut self.total_staked, cur_epoch, last_total_staked);
            event::emit(StakedUpdated {
                total_staked: last_total_staked,
                epoch: cur_epoch,
            });
        };

        if (table::contains(&self.total_staked, next_epoch)) {
            let total_staked = table::borrow_mut(&mut self.total_staked, next_epoch);
            *total_staked = *total_staked + value;
            new_total_staked = *total_staked;
        } else {
            let last_total_staked = *table::borrow(&self.total_staked, self.staked_update_epoch);
            self.staked_update_epoch = next_epoch;

            new_total_staked = last_total_staked + value;
            table::add(&mut self.total_staked, next_epoch, new_total_staked);
        };
        
        event::emit(StakedUpdated {
            total_staked: new_total_staked,
            epoch: next_epoch,
        });
    }

    #[test_only]
    public fun add_total_staked_for_testing(self: &mut NativePool, value: u64, ctx: &mut TxContext): u64 {
        add_total_staked_unsafe(self, value, ctx);
        get_total_staked(self)
    }

    // sub value from next and current epochs
    fun sub_total_staked_unsafe(self: &mut NativePool, value: u64, ctx: &mut TxContext) {
        let cur_epoch = tx_context::epoch(ctx);
        let next_epoch = cur_epoch + 1;

        let mut new_total_staked;

        // update or create current
        if (table::contains(&self.total_staked, cur_epoch)) {
            let total_staked = table::borrow_mut(&mut self.total_staked, cur_epoch);
            *total_staked = *total_staked - value;
            new_total_staked = *total_staked;
        } else {
            let last_total_staked = *table::borrow(&self.total_staked, self.staked_update_epoch);
            self.staked_update_epoch = cur_epoch;

            new_total_staked = last_total_staked - value;
            table::add(&mut self.total_staked, cur_epoch, new_total_staked);
        };

        event::emit(StakedUpdated {
            total_staked: new_total_staked,
            epoch: cur_epoch,
        });

        // update or create next
        if (table::contains(&self.total_staked, next_epoch)) {
            let total_staked = table::borrow_mut(&mut self.total_staked, next_epoch);
            *total_staked = *total_staked - value;
            new_total_staked = *total_staked;
        } else {
            // value already deducted, we need only to copy total_staked
            new_total_staked = *table::borrow(&self.total_staked, self.staked_update_epoch);
            self.staked_update_epoch = next_epoch;
            table::add(&mut self.total_staked, next_epoch, new_total_staked);
        };

        event::emit(StakedUpdated {
            total_staked: new_total_staked,
            epoch: next_epoch,
        });
    }

    /* Staking logic */

    public entry fun stake(self: &mut NativePool, metadata: &mut Metadata<CERT>, wrapper: &mut SuiSystemState, coin: Coin<SUI>, ctx: &mut TxContext) {
        abort E_DEPRECATED
    }

    // exchange SUI to CERT, add SUI to pending and try to stake pool
    public fun stake_non_entry(self: &mut NativePool, metadata: &mut Metadata<CERT>, wrapper: &mut SuiSystemState, coin: Coin<SUI>, ctx: &mut TxContext): Coin<CERT> {
        abort E_DEPRECATED
    }

    // stake pending
    fun stake_pool(self: &mut NativePool, wrapper: &mut SuiSystemState, ctx: &mut TxContext) {
        abort E_DEPRECATED
    }

    /// merge ticket with it burning to make instant unstake
    public entry fun unstake(self: &mut NativePool, metadata: &mut Metadata<CERT>, wrapper: &mut SuiSystemState, cert: Coin<CERT>, ctx: &mut TxContext) {
        abort E_DEPRECATED
    }

    public entry fun mint_ticket(self: &mut NativePool, metadata: &mut Metadata<CERT>, cert: Coin<CERT>, ctx: &mut TxContext) {
        abort E_DEPRECATED
    }

    /// burns CERT and put output amount of SUI to it
    /// In case if issued ticket supply greater than active stake ticket should be locked until next epoch
    public fun mint_ticket_non_entry(self: &mut NativePool, metadata: &mut Metadata<CERT>, cert: Coin<CERT>, ctx: &mut TxContext): UnstakeTicket {
        abort E_DEPRECATED
    }

    // burn ticket to release unstake
    public entry fun burn_ticket(self: &mut NativePool, wrapper: &mut SuiSystemState, ticket: UnstakeTicket, ctx: &mut TxContext) {
        abort E_DEPRECATED
    }

    public fun burn_ticket_non_entry(self: &mut NativePool, wrapper: &mut SuiSystemState, ticket: UnstakeTicket, ctx: &mut TxContext): Coin<SUI> {
        abort E_DEPRECATED
    }

    /// Unstake an amount from validators based on UnstakeTicket params
    /// amount_to_unstake includes fee
    fun unstake_amount_from_validators(
        self: &mut NativePool,
        wrapper: &mut SuiSystemState,
        amount_to_unstake: u64,
        fee: u64,
        validators: vector<address>,
        ctx: &mut TxContext
    ): Coin<SUI> {

        assert!(vector::length(&validators) > 0, E_NOTHING_TO_UNSTAKE);
        let mut i = vector::length(&validators) - 1;

        let mut total_removed_value = coin::value(&self.pending);
        let mut total_removed_balance = coin::into_balance(coin::split(&mut self.pending, total_removed_value, ctx));

        let mut collectable_reward = 0;

        while (total_removed_value < amount_to_unstake) {
            let vldr_address = *vector::borrow(&validators, i);

            let (removed_from_validator, principals, rewards) = validator_set::remove_stakes(
                &mut self.validator_set,
                wrapper,
                vldr_address,
                amount_to_unstake - total_removed_value,
                ctx,
            );

            sub_total_staked_unsafe(self, principals, ctx);
            let reward_fee = calculate_reward_fee(self, rewards);
            collectable_reward = collectable_reward + reward_fee;
            sub_rewards_unsafe(self, rewards);

            balance::join(&mut total_removed_balance, removed_from_validator);

            // sub collectable reward from total removed
            total_removed_value = balance::value(&total_removed_balance) - collectable_reward;

            if (i == 0) {
                break
            };
            i = i - 1;
        };

        // check that we don't plan to charge more fee than needed
        if (collectable_reward > self.collected_rewards) {
            // all rewards was collected
            collectable_reward = self.collected_rewards;
            self.collected_rewards = 0;
        } else {
            self.collected_rewards = self.collected_rewards - collectable_reward;
        };

        // extract our fees
        assert!(balance::value(&total_removed_balance) >= fee + collectable_reward, E_NOT_ENOUGH_BALANCE);
        let fee_balance = balance::split(&mut total_removed_balance, fee + collectable_reward);
        coin::join(&mut self.collectable_fee, coin::from_balance(fee_balance, ctx));

        // restake excess amount
        if (total_removed_value > amount_to_unstake) {
            let stake_value = total_removed_value - amount_to_unstake;
            let balance_to_stake = balance::split(&mut total_removed_balance, stake_value);
            let coin_to_stake = coin::from_balance(balance_to_stake, ctx);
            coin::join(&mut self.pending, coin_to_stake);

            // restake is possible
            stake_pool(self, wrapper, ctx);
        };

        coin::from_balance(total_removed_balance, ctx)
    }

    // sort validators by priorities
    public entry fun sort_validators(self: &mut NativePool) {
        abort E_DEPRECATED
    }

    // unstake validators with zero priority and stake to top validator
    public entry fun rebalance(self: &mut NativePool, wrapper: &mut SuiSystemState, ctx: &mut TxContext) {
        abort E_DEPRECATED
    }

    /* Ratio */

    /// Return the ratio of CERT.
    public fun get_ratio(self: &NativePool, metadata: &Metadata<CERT>): u256 {
        math::ratio(cert::get_total_supply_value(metadata), (get_total_staked(self) + get_total_rewards(self) - unstake_ticket::get_total_supply(&self.ticket_metadata)))
    }

    // converts SUI to CERT
    public fun to_shares(self: &NativePool, metadata: &Metadata<CERT>, amount: u64): u64 {
        math::to_shares(get_ratio(self, metadata), amount)
    }

    // converts CERT to SUI
    public fun from_shares(self: &NativePool, metadata: &Metadata<CERT>, shares: u64): u64 {
        math::from_shares(get_ratio(self,  metadata), shares)
    }

    /* Collectable fee */

    // collect fee to treasury address
    public entry fun collect_fee(self: &mut NativePool, to: address, _owner_cap: &OwnerCap, ctx: &mut TxContext) {
        assert_version(self);
        when_not_paused(self);

        let value = coin::value(&self.collectable_fee);
        transfer::public_transfer(coin::split(&mut self.collectable_fee, value, ctx), to);

        event::emit(FeeCollectedEvent{
            to,
            value,
        })
    }

    public(package) fun mut_validator_set(self: &mut NativePool): &mut ValidatorSet {
        &mut self.validator_set
    }

    /* Pause */

    public entry fun set_pause(self: &mut NativePool, _owner_cap: &OwnerCap, val: bool) {
        self.paused = val;
        event::emit(PausedEvent {paused: val})
    }

    fun when_not_paused(self: &NativePool) {
        assert!(!self.paused, E_PAUSED)
    }

    /* Migration stuff */

    entry fun migrate(self: &mut NativePool, _owner_cap: &OwnerCap) {
        assert!(self.version < VERSION, E_INCOMPATIBLE_VERSION);

        event::emit(MigratedEvent {
            prev_version: self.version,
            new_version: VERSION,
        });

        self.version = VERSION;
    }

    public(package) fun emit_staked(staker: address, sui_amount: u64, cert_amount: u64) {
        event::emit(StakedEvent {
            staker,
            sui_amount,
            cert_amount,
        });
    }

    public(package) fun emit_unstaked(staker: address, cert_amount: u64, sui_amount: u64) {
        event::emit(UnstakedEvent {
            staker,
            cert_amount,
            sui_amount,
        });
    }

    public(package) fun emit_ratio(ratio: u256) {
        event::emit(RatioUpdatedEvent {
            ratio,
        });
    }

    public(package) fun mut_collected_rewards(self: &mut NativePool): &mut u64 {
        &mut self.collected_rewards
    }

    public(package) fun mut_pending(self: &mut NativePool): &mut Coin<SUI> {
        &mut self.pending
    }

    const CAP_CREATED: vector<u8> = b"cap_created";
    public(package) fun mark_cap_created(self: &mut NativePool) {
        if (dynamic_field::exists_<vector<u8>>(&self.id, CAP_CREATED)) {
            abort 0;
        };
        dynamic_field::add(&mut self.id, CAP_CREATED, true);
    }

    #[test_only]
    public fun test_migrate(self: &mut NativePool, owner_cap: &OwnerCap) {
        migrate(self, owner_cap);
    }

    #[test_only]
    public fun test_update_version(self: &mut NativePool, version: u64) {
        self.version = version;
    }

    /// check version before interaction with pool
    /// to interact with package version of pool must be less than package version
    fun assert_version(self: &NativePool) {
        assert!(self.version == VERSION - 1 || self.version == VERSION, E_INCOMPATIBLE_VERSION);
    }

    #[test_only]
    public fun test_assert_version(self: &NativePool) {
        assert_version(self);
    }

    #[test_only]
    public fun test_init(ctx: &mut TxContext) {
        init(ctx)
    }

    #[test_only]
    public fun test_update_and_sort(self: &mut NativePool, validators: vector<address>, priorities: vector<u64>) {
        validator_set::test_update_and_sort(&mut self.validator_set, validators, priorities);
    }

    // deployed for qa contract
    #[test_only]
    public entry fun change_staked_value(self: &mut NativePool, epoch: u64, value: u64) {
        if (table::contains(&self.total_staked, epoch)) {
            let total_staked = table::borrow_mut(&mut self.total_staked, epoch);
            *total_staked = value;
        } else {
            table::add(&mut self.total_staked, epoch, value);
        };

        event::emit(StakedUpdated {
            total_staked: value,
            epoch,
        });
    }

    #[test_only]
    public entry fun stake_for_testing(self: &mut NativePool, metadata: &mut Metadata<CERT>, wrapper: &mut SuiSystemState, coin: Coin<SUI>, ctx: &mut TxContext) {
        let cert = stake_non_entry(self, metadata, wrapper, coin, ctx);
        transfer::public_transfer(cert, tx_context::sender(ctx));
    }

    #[test_only]
    public fun stake_non_entry_for_testing(self: &mut NativePool, metadata: &mut Metadata<CERT>, wrapper: &mut SuiSystemState, coin: Coin<SUI>, ctx: &mut TxContext): Coin<CERT> {
        assert_version(self);
        when_not_paused(self);

        let coin_value = coin::value(&coin);
        assert!(coin_value >= self.min_stake, E_MIN_LIMIT);

        let shares = to_shares(self, metadata, coin_value);
        let minted = cert::mint(metadata, shares, ctx);

        coin::join(&mut self.pending, coin);

        event::emit(StakedEvent {
            staker: tx_context::sender(ctx),
            sui_amount: coin_value,
            cert_amount: shares,
        });

        // stake pool
        stake_pool_for_testing(self, wrapper, ctx);

        minted
    }

    #[test_only]
    fun stake_pool_for_testing(self: &mut NativePool, wrapper: &mut SuiSystemState, ctx: &mut TxContext) {
        let mut pending_value = coin::value(&self.pending);

        let tickets_supply = unstake_ticket::get_total_supply(&self.ticket_metadata);
        if (pending_value < tickets_supply) {
            return
        };
        pending_value = pending_value - tickets_supply;
        if (pending_value < ONE_SUI) {
            return
        };

        let pending_stake = coin::split(&mut self.pending, pending_value, ctx);
        let validator = validator_set::get_top_validator(&mut self.validator_set);
        let staked_sui = sui_system::request_add_stake_non_entry(wrapper, pending_stake, validator, ctx);
        validator_set::add_stake(&mut self.validator_set, validator, staked_sui, ctx);
        add_total_staked_unsafe(self, pending_value, ctx);
    }

    #[test_only]
    public entry fun unstake_for_testing(self: &mut NativePool, metadata: &mut Metadata<CERT>, wrapper: &mut SuiSystemState, cert: Coin<CERT>, ctx: &mut TxContext) {
        let sender = tx_context::sender(ctx);
        let ticket = mint_ticket_non_entry(self, metadata, cert, ctx);
        if (unstake_ticket::is_unlocked(&ticket, ctx)) {
            // instant unstake
            let coin = burn_ticket_non_entry(self, wrapper, ticket, ctx);
            transfer::public_transfer(coin, sender);
        } else {
            unstake_ticket::transfer(ticket, sender);
        }
    }
}