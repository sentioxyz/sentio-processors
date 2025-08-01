// SPDX-License-Identifier: MIT
/// Module manage StakedSui and validator list
#[allow(duplicate_alias, unused_mut_ref)]
module liquid_staking::validator_set {
    use std::vector;
    use sui::object::{Self, UID};
    use sui::vec_map::{Self, VecMap};
    use sui::tx_context::{Self, TxContext};
    use sui::object_table::{Self, ObjectTable};
    use sui::table::{Self, Table};
    use sui::sui::{SUI};
    use sui_system::sui_system::{Self, SuiSystemState};
    use sui::event;
    use sui::balance::{Self, Balance};
    use sui_system::staking_pool::{Self, StakedSui};

    #[test_only]
    use sui::transfer;

    /* friend liquid_staking::native_pool; */
    
    const MIST_PER_SUI: u64 = 1_000_000_000;
    const MAX_VLDRS_UPDATE: u64 = 16;

    /* Errors definition */

    const E_NO_ACTIVE_VLDRS: u64 = 300;
    const E_BAD_ARGS: u64 = 301;
    const E_BAD_CONDITION: u64 = 302;
    const E_NOT_FOUND: u64 = 303;
    const E_TOO_MANY_VLDRS: u64 = 304;

    /* Events */
    public struct ValidatorsSorted has copy, drop {
        validators: vector<address>
    }

    public struct ValidatorPriorUpdated has copy, drop {
        validator: address,
        priority: u64
    }

    /* Objects */
    public struct Vault has store {
        stakes: ObjectTable<u64, StakedSui>,
        gap: u64,
        length: u64,
        total_staked: u64,
    }
    
    // ValidatorSet object
    public struct ValidatorSet has key, store {
        id: UID,
        vaults: Table<address, Vault>, // validator => Vault
        validators: VecMap<address, u64>,
        sorted_validators: vector<address>,
        is_sorted: bool,
    }

    // called only once while native_pool init
    public(package) fun create(ctx: &mut TxContext): ValidatorSet {
        ValidatorSet {
            id: object::new(ctx),
            vaults: table::new<address, Vault>(ctx),
            validators: vec_map::empty<address, u64>(),
            sorted_validators: vector::empty<address>(),
            is_sorted: false,
        }
    }

    /* Pool read methods */

    public fun get_validators(self: &ValidatorSet): vector<address> {
        self.sorted_validators
    }

    public fun get_top_validator(self: &ValidatorSet): address {
        assert!(vector::length(&self.sorted_validators) != 0, E_NO_ACTIVE_VLDRS);
        *vector::borrow(&self.sorted_validators, 0)
    }

    public fun get_bad_validators(self: &ValidatorSet): vector<address> {
        let len = vector::length(&self.sorted_validators);
        assert!(vector::length(&self.sorted_validators) != 0, E_NO_ACTIVE_VLDRS);
        let mut res = vector::empty<address>();

        let mut i = 0;

        // loop over validators to find zero priorities
        while (i < len) {
            let vldr_address_ref = vector::borrow(&self.sorted_validators, i);
            let vldr_prior = vec_map::get(&self.validators, vldr_address_ref);

            if (*vldr_prior == 0) {
                vector::push_back(&mut res, *vldr_address_ref);
            };
            
            i = i + 1;
        };

        res
    }

    public fun get_total_stake(self: &ValidatorSet, validator: address): u64 {
        if (!table::contains(&self.vaults, validator)) {
            return 0
        } else {
            let vault = table::borrow<address, Vault>(&self.vaults, validator);
            vault.total_staked
        }
    }

    /* Set update methods */

    public(package) fun sort_validators(self: &mut ValidatorSet) {
        let mut i = 0;
        let len = vec_map::size<address, u64>(&self.validators);
        let mut sorted = vector::empty<address>();
        while (i < len) {
            let (vldr_address_ref, vldr_prior_ref) = vec_map::get_entry_by_idx(&self.validators, i);
            let vldr_prior = *vldr_prior_ref;
            let sorted_len = vector::length(&sorted);

            if (vldr_prior == 0 || sorted_len == 0) {
                vector::push_back(&mut sorted, *vldr_address_ref);
            } else {
                let mut j = 0;

                while (j < sorted_len) {
                    let j_vldr_address_ref = vector::borrow(&sorted, j);
                    let j_vldr_prior = vec_map::get(&self.validators, j_vldr_address_ref);

                    if (*j_vldr_prior < vldr_prior) {
                        break
                    };

                    j = j + 1;
                };
                vector::insert(&mut sorted, *vldr_address_ref, j);
            };

            i = i + 1;
        };
        event::emit(ValidatorsSorted{
            validators: sorted,
        });
        self.is_sorted = true;
        self.sorted_validators = sorted;
    }

    // @dev add or update validator and priority
    public(package) fun update_validators(self: &mut ValidatorSet, validators: vector<address>, priorities: vector<u64>) {
        let length = vector::length(&validators);
        assert!(length < MAX_VLDRS_UPDATE, E_TOO_MANY_VLDRS);
        assert!(length == vector::length(&priorities), E_BAD_ARGS);

        let mut i = 0;
        while (i < length) {
            let vldr_address = *vector::borrow(&validators, i);
            let vldr_prior = *vector::borrow(&priorities, i);

            update_validator(self, vldr_address, vldr_prior);

            i = i + 1;
        };

        if (length > 0) {
            self.is_sorted = false;
        };

        assert!(vec_map::size(&self.validators) < MAX_VLDRS_UPDATE, E_TOO_MANY_VLDRS);
    }

    fun update_validator(self: &mut ValidatorSet, validator: address, priority: u64) {
        if (vec_map::contains<address, u64>(&self.validators, &validator)) {
            *vec_map::get_mut<address, u64>(&mut self.validators, &validator) = priority;
        } else {
            vec_map::insert(&mut self.validators, validator, priority);
        };
        event::emit(ValidatorPriorUpdated{
            validator,
            priority
        });
    }

    public(package) fun add_stake(self: &mut ValidatorSet, validator: address, staked_sui: StakedSui, ctx: &mut TxContext) {
        let value = staking_pool::staked_sui_amount(&staked_sui);

        if (table::contains(&mut self.vaults, validator)) {
            let vault = table::borrow_mut(&mut self.vaults, validator);
            object_table::add(&mut vault.stakes, vault.length, staked_sui);

            // save new length and total
            vault.total_staked = vault.total_staked + value;
            vault.length = vault.length + 1;
        } else {
            let mut vault = Vault {
                total_staked: value,
                gap: 0,
                length: 1,
                stakes: object_table::new(ctx),
            };
            object_table::add(&mut vault.stakes, 0, staked_sui);
            table::add(&mut self.vaults, validator, vault);
        };
    }

    #[test_only]
    public fun add_stake_for_testing(self: &mut ValidatorSet, validator: address, staked_sui: StakedSui, ctx: &mut TxContext) {
        add_stake(self, validator, staked_sui, ctx)
    }

    /// Removes the oldest StakedSui in the table vault.stakes table and returns the value.
    /// Aborts with `sui::dynamic_field::EFieldDoesNotExist` if the validator does not have a StakedSui
    public(package) fun remove_stakes(self: &mut ValidatorSet, wrapper: &mut SuiSystemState, validator: address, requested_amount: u64, ctx: &mut TxContext): (Balance<SUI>, u64, u64) {
    
        let mut total_withdrawn = balance::zero<SUI>();
        let mut total_withdrawn_principal_value = 0;

        if (!table::contains(&self.vaults, validator)) {
            return (total_withdrawn, 0, 0)
        };
        let vault_mut_ref = table::borrow_mut(&mut self.vaults, validator);
        let current_epoch = tx_context::epoch(ctx);

        while (vault_mut_ref.gap < vault_mut_ref.length && balance::value(&total_withdrawn) < requested_amount) {
            let staked_sui_mut_ref = object_table::borrow_mut(&mut vault_mut_ref.stakes, vault_mut_ref.gap);

            // check that StakedSui not pending
            if (staking_pool::stake_activation_epoch(staked_sui_mut_ref) > current_epoch) {
                break
            };

            let mut principal_value = ::sui_system::staking_pool::staked_sui_amount(staked_sui_mut_ref);

            let mut staked_sui_to_withdraw;
            let mut rest_requested_amount = requested_amount - balance::value(&total_withdrawn);
            if (rest_requested_amount < MIST_PER_SUI) {
                rest_requested_amount = MIST_PER_SUI
            };
            if (principal_value > rest_requested_amount && principal_value - rest_requested_amount >= MIST_PER_SUI) {
                // it's possible to split StakedSui
                staked_sui_to_withdraw = staking_pool::split(staked_sui_mut_ref, rest_requested_amount, ctx);
                principal_value = rest_requested_amount;
            } else {
                staked_sui_to_withdraw = object_table::remove(&mut vault_mut_ref.stakes, vault_mut_ref.gap);
                vault_mut_ref.gap = vault_mut_ref.gap + 1; // increase table gap
            };

            let withdrawn = sui_system::request_withdraw_stake_non_entry(wrapper, staked_sui_to_withdraw, ctx);

            total_withdrawn_principal_value = total_withdrawn_principal_value + principal_value;
            balance::join(&mut total_withdrawn, withdrawn);
        };

        let withdrawn_reward = balance::value(&total_withdrawn) - total_withdrawn_principal_value;
        vault_mut_ref.total_staked = vault_mut_ref.total_staked - total_withdrawn_principal_value;

        // prune validator if possbile
        if (vault_mut_ref.gap == vault_mut_ref.length) {
            // when gap == length we don't have stakes on validator
            assert!(vault_mut_ref.total_staked == 0, E_BAD_CONDITION);
        
            let prior = *vec_map::get(&self.validators, &validator);
            if (prior == 0) {
                // priority is zero, it means that validator can be removed
                let v = table::remove(&mut self.vaults, validator);
                destroy_vault(v);

                vec_map::remove<address, u64>(&mut self.validators, &validator);
                let (exist, index) = vector::index_of(&self.sorted_validators, &validator);
                assert!(exist, E_NOT_FOUND);
                // we can do swap_revert, because it can be swapped only with inactive validator
                vector::swap_remove(&mut self.sorted_validators, index);
            } else {
                // table is empty, but validator still active => we can reset vault
                vault_mut_ref.gap = 0;
                vault_mut_ref.length = 0;
            };
        };

        (total_withdrawn, total_withdrawn_principal_value, withdrawn_reward)
    }

    #[test_only]
    public fun remove_stakes_for_testing(self: &mut ValidatorSet, wrapper: &mut SuiSystemState, validator: address, requested_amount: u64, ctx: &mut TxContext): (Balance<SUI>, u64, u64) {
        remove_stakes(self, wrapper, validator, requested_amount, ctx)
    }

    fun destroy_vault(vault: Vault) {
        let Vault { stakes, total_staked: _, gap: _, length: _, } = vault;
        object_table::destroy_empty(stakes);
    }

    #[test_only]
    public fun test_create(ctx: &mut TxContext) {
        transfer::share_object(create(ctx));
    }

    #[test_only]
    public fun test_update_and_sort(self: &mut ValidatorSet, validators: vector<address>, priorities: vector<u64>) {
        update_validators(self, validators, priorities);
        sort_validators(self);
    }

    public(package) fun export_stakes_from_v1(
        validator_set: &mut ValidatorSet,
        system_state: &mut SuiSystemState,
        max_iterations: u64,
        ctx: &mut TxContext
    ):(Balance<SUI>, u64, u64) {
        let mut i = 0;
        let mut iterations = max_iterations;
        let mut exported_count = 0;
        let mut exported_sui_amount = 0;
        let mut total_exported_sui = balance::zero<SUI>();

        let validators = validator_set.get_validators();

        while (i < validators.length() && iterations > 0) {
            let validator = *validators.borrow(i);

            if (!validator_set.vaults.contains(validator)) {
                i = i + 1;
                continue
            };

            let exported_sui = export_stakes(
                validator_set.vaults.borrow_mut(validators[i]),
                &mut iterations,
                &mut exported_count,
                &mut exported_sui_amount,
                system_state,
                ctx
            );

            total_exported_sui.join(exported_sui);
            i = i + 1;
        };

        (total_exported_sui, exported_count, exported_sui_amount)
    }

    fun export_stakes(
        vault: &mut Vault,
        iterations: &mut u64,
        exported_count: &mut u64,
        exported_sui_amount: &mut u64,
        system_state: &mut SuiSystemState,
        ctx: &mut TxContext
    ):(Balance<SUI>) {
        let mut exported_sui = balance::zero<SUI>();
        
        while (*iterations > 0 && vault.gap < vault.length) {
            let staked_sui_to_withdraw = object_table::remove(&mut vault.stakes, vault.gap);
            vault.gap = vault.gap + 1; // increase table gap
            let withdrawn = sui_system::request_withdraw_stake_non_entry(system_state, staked_sui_to_withdraw, ctx);

            *exported_sui_amount = *exported_sui_amount + withdrawn.value();
            *exported_count = *exported_count + 1;
            *iterations = *iterations - 1;

            exported_sui.join(withdrawn);
        };
        exported_sui
    }
}