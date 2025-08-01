module liquid_staking::validator_pool {
    use sui_system::staking_pool::{StakedSui, FungibleStakedSui, PoolTokenExchangeRate};
    use sui::sui::SUI;
    use sui::coin;
    use sui::balance::{Self, Balance};
    use sui_system::sui_system::{SuiSystemState};
    use std::u64::{min, max};
    use sui::bag::{Self, Bag};
    use sui::vec_map::{Self, VecMap};
    use liquid_staking::manage::{Self, Manage};

    #[test_only]
    use std::ascii::{Self};

    /* Errors */
    const ENotEnoughSuiInSuiPool: u64 = 40000;
    const ENotActiveValidator: u64 = 40001;
    const ETooManyValidators: u64 = 40002;
    const EValidatorAlreadyExists: u64 = 40003;
    const EValidatorNotFound: u64 = 40004;
    const EInvalidValidatorWeight: u64 = 40005;
    const EInvalidValidatorWeightSum: u64 = 40006;
    const EInvalidValidatorSize: u64 = 40007;
    const EMaxTotalWeight: u64 = 40008;
    const ETotalSuiSupplyChanged: u64 = 40009;

    /* Constants */
    const MIN_STAKE_THRESHOLD: u64 = 1_000_000_000;
    const MAX_SUI_SUPPLY: u64 = 10_000_000_000 * 1_000_000_000;
    const MAX_VALIDATORS: u64 = 50;
    const MAX_TOTAL_WEIGHT: u64 = 10_000;
    const ACCEPTABLE_MIST_ERROR: u64 = 10;
    const DEFAULT_WEIGHT: u64 = 100;
    const ACTIVE_STAKE_REDEEM_OFFSET: u64 = 100;

    /// The ValidatorPool struct holds all stake for the LST.
    public struct ValidatorPool has store {
        /// Sui Pool as a buffer for stake/unstake operations.
        sui_pool: Balance<SUI>,
        /// Validators that have stake in the LST.
        validator_infos: vector<ValidatorInfo>,
        /// Total Sui managed by the LST. This is the sum of all active 
        /// stake, inactive stake, and SUI in the sui_pool.
        total_sui_supply: u64,
        /// The epoch at which the pool was last refreshed.
        last_refresh_epoch: u64,
        /// Total weight of all the validators
        total_weight: u64,
        /// Manage of the struct
        manage: Manage,
        /// Extra fields for future-proofing.
        extra_fields: Bag
    }

    /// ValidatorInfo holds all stake for a single validator.
    public struct ValidatorInfo has store {
        /// The staking pool ID for the validator.
        staking_pool_id: ID,
        /// The validator's address.
        validator_address: address,
        /// The active stake for the validator.
        active_stake: Option<FungibleStakedSui>,
        /// The inactive stake for the validator.
        inactive_stake: Option<StakedSui>,
        /// The exchange rate for the validator.
        exchange_rate: PoolTokenExchangeRate,
        /// The total Sui staked to the validator (active stake + inactive stake).
        total_sui_amount: u64,
        /// Weight assigned to the current validator
        assigned_weight: u64,
        /// The epoch at which the exchange rate was last updated.
        last_refresh_epoch: u64,
        /// Extra fields for future-proofing.
        extra_fields: Bag
    }

    public(package) fun new(ctx: &mut TxContext): ValidatorPool {
        ValidatorPool {
            sui_pool: balance::zero(),
            validator_infos: vector::empty(),
            total_sui_supply: 0,
            last_refresh_epoch: ctx.epoch() - 1,
            total_weight: 0,
            // validator_weights: vec_map::empty(),
            manage: manage::new(),
            extra_fields: bag::new(ctx)
        }
    }

    /* Public View Functions */
    public fun sui_pool(self: &ValidatorPool): &Balance<SUI> {
        &self.sui_pool
    }

    public fun validators(self: &ValidatorPool): &vector<ValidatorInfo> {
        &self.validator_infos
    }

    public fun total_weight(self: &ValidatorPool): u64 {
        self.total_weight
    }

    public fun validator_weights(self: &ValidatorPool): VecMap<address, u64> {
        let mut validator_weights = vec_map::empty<address, u64>();
        self.validator_infos.do_ref!(|validator| {
            validator_weights.insert(validator.validator_address, validator.assigned_weight);
        });
        validator_weights
    }

    public fun validator_stake_amounts(self: &ValidatorPool): (VecMap<address, u64>, VecMap<address, u64>) {
        let mut inactive = vec_map::empty<address, u64>();
        let mut active = vec_map::empty<address, u64>();

        self.validator_infos.do_ref!(|validator| {
            let inactive_stake = if (validator.inactive_stake.is_some()) {
                validator.inactive_stake.borrow().staked_sui_amount()
            } else {
                0
            };

            let active_stake = if (validator.active_stake.is_some()) {
                get_sui_amount(
                    &validator.exchange_rate, 
                    validator.active_stake.borrow().value()
                )
            } else {
                0
            };
            inactive.insert(validator.validator_address, inactive_stake);
            active.insert(validator.validator_address, active_stake);
        });

        (inactive, active)
    }

    public fun total_sui_supply(self: &ValidatorPool): u64 {
        self.total_sui_supply
    }

    public fun last_refresh_epoch(self: &ValidatorPool): u64 {
        self.last_refresh_epoch
    }

    public fun staking_pool_id(self: &ValidatorInfo): ID {
        self.staking_pool_id
    }

    public fun validator_address(self: &ValidatorInfo): address {
        self.validator_address
    }

    public fun active_stake(self: &ValidatorInfo): &Option<FungibleStakedSui> {
        &self.active_stake
    }

    public fun inactive_stake(self: &ValidatorInfo): &Option<StakedSui> {
        &self.inactive_stake
    }

    public fun exchange_rate(self: &ValidatorInfo): &PoolTokenExchangeRate {
        &self.exchange_rate
    }

    public fun total_sui_amount(self: &ValidatorInfo): u64 {
        self.total_sui_amount
    }

    public fun find_validator_index_by_address(self: &ValidatorPool, validator_address: address): Option<u64> {
        let mut i = 0;
        while (i < self.validator_infos.length()) {
            if (self.validator_infos[i].validator_address == validator_address) {
                return option::some(i)
            };
            i = i + 1;
        };
        option::none()
    }

    fun is_empty(self: &ValidatorInfo): bool {
        self.active_stake.is_none() && self.inactive_stake.is_none() && self.total_sui_amount == 0
        && self.assigned_weight == 0
    }

    /// Updates validator pool state by:
    /// - Refreshing exchange rates across all validators
    /// - Converting eligible inactive stake to active stake
    /// - Cleaning up validators with zero stake
    /// This function is idempotent and returns true if any updates were made.
    public(package) fun refresh(
        self: &mut ValidatorPool, 
        system_state: &mut SuiSystemState, 
        ctx: &mut TxContext
    ): bool {
        self.manage.check_version();
        
        if(self.total_sui_supply() == 0) {
            return false
        };
        
        if (self.last_refresh_epoch == ctx.epoch()) {
            stake_pending_sui(self, system_state, ctx);
            return false
        };

        let active_validator_addresses = system_state.active_validator_addresses();

        let mut i = self.validator_infos.length();
        while (i > 0) {
            i = i - 1;

            // withdraw all stake if validator is inactive.
            // Time Complexity: O(n)
            if (!active_validator_addresses.contains(&self.validator_infos[i].validator_address)) {
                // unstake max amount of sui.
                self.unstake_approx_n_sui_from_validator(system_state, i, MAX_SUI_SUPPLY, ctx);
                self.total_weight = self.total_weight - self.validator_infos[i].assigned_weight;
                self.validator_infos[i].assigned_weight = 0;
            };

            if (self.validator_infos[i].is_empty()) {
                let ValidatorInfo { active_stake, inactive_stake, extra_fields, .. } = self.validator_infos.remove(i);
                active_stake.destroy_none();
                inactive_stake.destroy_none();
                extra_fields.destroy_empty();

                continue
            };
        };

        i = self.validator_infos.length();
        
        while (i > 0) {
            i = i - 1;

            // update pool token exchange rates
            let latest_exchange_rate_opt = self.get_latest_exchange_rate(
                &self.validator_infos[i].staking_pool_id,
                system_state,
                ctx
            );

            if (latest_exchange_rate_opt.is_some()) {
                self.validator_infos[i].exchange_rate = *latest_exchange_rate_opt.borrow();
                self.validator_infos[i].last_refresh_epoch = ctx.epoch();
            };
            self.refresh_validator_info(i);

            // convert inactive stake to active stake
            if (self.validator_infos[i].inactive_stake.is_some() 
                && self.validator_infos[i].inactive_stake.borrow().stake_activation_epoch() <= ctx.epoch()
            ) {
                let inactive_stake = self.take_all_inactive_stake(i);
                let fungible_staked_sui = system_state.convert_to_fungible_staked_sui(inactive_stake, ctx);
                self.join_fungible_staked_sui_to_validator(i, fungible_staked_sui);
            };
        };

        self.stake_pending_sui(system_state,ctx);
        self.last_refresh_epoch = ctx.epoch();
        true
    }

    public(package) fun stake_pending_sui(
        self: &mut ValidatorPool, 
        system_state: &mut SuiSystemState, 
        ctx: &mut TxContext
    ): bool {
        let mut i = self.validator_infos.length();
        if(self.total_weight == 0) {
            return false
        };
        let sui_per_weight = self.sui_pool.value() / self.total_weight;
        while (i > 0) {
            i = i - 1;

            let validator_address = self.validator_infos[i].validator_address;
            let assigned_weight = self.validator_infos[i].assigned_weight;
            self.increase_validator_stake(
                system_state, 
                validator_address,
                sui_per_weight * assigned_weight,
                ctx
            );
        };
        

        true
    }

    /// Returns the latest exchange rate for a given staking pool ID.
    /// Returns None if the staking pool is inactive or if sui system is currently in safe mode.
    fun get_latest_exchange_rate(
        self: &ValidatorPool,
        staking_pool_id: &ID,
        system_state: &mut SuiSystemState,
        ctx: &TxContext
    ): Option<PoolTokenExchangeRate> {
        let exchange_rates = system_state.pool_exchange_rates(staking_pool_id);

        let mut cur_epoch = ctx.epoch();
        while (cur_epoch > self.last_refresh_epoch) {
            if (exchange_rates.contains(cur_epoch)) {
                return option::some(*exchange_rates.borrow(cur_epoch))
            };

            cur_epoch = cur_epoch - 1;
        };

        option::none()
    }

    /// Update the total sui amount for the validator and modify the 
    /// pool sui supply accordingly assumes the exchange rate is up to date
    fun refresh_validator_info(self: &mut ValidatorPool, i: u64) {
        let validator_info = &mut self.validator_infos[i];

        self.total_sui_supply = self.total_sui_supply - validator_info.total_sui_amount;

        let mut total_sui_amount = 0;
        if (validator_info.active_stake.is_some()) {
            let active_stake = validator_info.active_stake.borrow();
            let active_sui_amount = get_sui_amount(
                &validator_info.exchange_rate, 
                active_stake.value()
            );

            total_sui_amount = total_sui_amount + active_sui_amount;
        };

        if (validator_info.inactive_stake.is_some()) {
            let inactive_stake = validator_info.inactive_stake.borrow();
            let inactive_sui_amount = inactive_stake.staked_sui_amount();

            total_sui_amount = total_sui_amount + inactive_sui_amount;
        };

        validator_info.total_sui_amount = total_sui_amount;
        self.total_sui_supply = self.total_sui_supply + total_sui_amount;
    }

    public (package) fun set_validator_weights(
        self: &mut ValidatorPool,
        validator_weights: VecMap<address, u64>,
        system_state: &mut SuiSystemState,
        ctx: &mut TxContext
    ) {
        self.manage.check_version();

        let v_size = validator_weights.size();
        assert!(v_size <= MAX_VALIDATORS, ETooManyValidators);

        let mut total_weight = 0;
        v_size.do!(|i| {
            let (_, weight) = validator_weights.get_entry_by_idx(i);
            total_weight = total_weight + *weight;
        });

        assert!(total_weight <= MAX_TOTAL_WEIGHT, EMaxTotalWeight);

        self.total_weight = total_weight;

        self.rebalance(option::some<VecMap<address, u64>>(validator_weights), system_state, ctx);

        // There is a chance that the validator weights are not set correctly
        // due to sui pool balance not meeting the minimum stake threshold 
        // to create a new validator.
        self.verify_validator_weights(validator_weights);
    }

    fun verify_validator_weights(
        self: &ValidatorPool,
        validator_weights: VecMap<address, u64>,
    ) {
        let mut weight_sum = 0;
        let mut match_num = 0;
        let mut non_zero_weights_count = 0;

        self.validator_infos.do_ref!(|validator| {
            weight_sum = weight_sum + validator.assigned_weight;
            if (validator_weights.contains(&validator.validator_address) && validator.assigned_weight > 0) {
                match_num = match_num + 1;
                let weight = validator_weights.get(&validator.validator_address);

                assert!(weight == validator.assigned_weight, EInvalidValidatorWeight);
            };
        });

        // Count validators with non-zero weights in the input
        let v_size = validator_weights.size();
        v_size.do!(|i| {
            let (_, weight) = validator_weights.get_entry_by_idx(i);
            if (*weight > 0) {
                non_zero_weights_count = non_zero_weights_count + 1;
            };
        });

        assert!(weight_sum == self.total_weight, EInvalidValidatorWeightSum);
        assert!(match_num == non_zero_weights_count, EInvalidValidatorSize);  
    }


    public (package) fun rebalance(
        self: &mut ValidatorPool,
        mut target_validator_weights: Option<VecMap<address, u64>>,
        system_state: &mut SuiSystemState,
        ctx: &mut TxContext
    ) {

        let previous_total_sui_supply = self.total_sui_supply();
        let is_targeted = target_validator_weights.is_some();

        if (self.total_weight == 0 || self.total_sui_supply() == 0) {
            return
        };

        let mut validator_addresses_weights = if (is_targeted) {
            target_validator_weights.extract()
        } else {
            vec_map::empty<address, u64>()
        };

        // 1. initialize the validator_weights map
        self.validators().do_ref!(|validator| {
            let validator_address = validator.validator_address();
            if (!validator_addresses_weights.contains(&validator_address)) {
                let weight = if (is_targeted) {
                    0
                } else {
                    validator.assigned_weight
                };
                validator_addresses_weights.insert(validator_address, weight);
            };
        });

        // 2. calculate current and target amounts of sui for each validator
        let (validator_addresses, validator_weights) = validator_addresses_weights.into_keys_values();

        let total_sui_supply = self.total_sui_supply(); // we want to allocate the unaccrued spread fees as well

        let validator_target_amounts  = validator_weights.map!(|weight| {
            ((total_sui_supply as u128) * (weight as u128) / (self.total_weight as u128)) as u64
        });

        let validator_current_amounts = validator_addresses.map_ref!(|validator_address| {
            let mut validator_index = self.find_validator_index_by_address(*validator_address);
            if (validator_index.is_none()) {
                return 0
            };

            let validator = self.validators().borrow(validator_index.extract());
            validator.total_sui_amount()
        });

        // 3. decrease the stake for validators that have more stake than the target amount
        validator_addresses.length().do!(|i| {
            if (validator_current_amounts[i] > validator_target_amounts[i]) {
                // the sui will be unstaked, if target amount is 0, 
                // the validator will be removed upon the next refresh
                self.decrease_validator_stake(
                    system_state,
                    validator_addresses[i],
                    validator_current_amounts[i] - validator_target_amounts[i],
                    ctx
                );
            };
        });

        // 4. increase the stake for validators that have less stake than the target amount
        validator_addresses.length().do!(|i| {
            // increase stake may not succeed due to the minimum stake threshold
            // so the validator will not be created
            if (validator_current_amounts[i] < validator_target_amounts[i]) {
                self.increase_validator_stake(
                    system_state,
                    validator_addresses[i],
                    validator_target_amounts[i] - validator_current_amounts[i],
                    ctx
                );
            };
        });

        // 5. update the validator weights
        validator_addresses.length().do!(|i| {
            let validator_address = validator_addresses[i];
            let mut validator_index = self.find_validator_index_by_address(validator_address);
            if (validator_index.is_some()) {
                self.validator_infos[validator_index.extract()].assigned_weight = validator_weights[i];
            };
        });

        // sanity check
        assert!(self.total_sui_supply() + ACCEPTABLE_MIST_ERROR >= previous_total_sui_supply, ETotalSuiSupplyChanged);
    }

    public (package) fun increase_validator_stake(
        self: &mut ValidatorPool,
        system_state: &mut SuiSystemState,
        validator_address: address,
        sui_amount: u64,
        ctx: &mut TxContext
    ): u64 {
        let sui = self.split_up_to_n_sui_from_sui_pool(sui_amount);
        if (sui.value() < MIN_STAKE_THRESHOLD) {
            self.join_to_sui_pool(sui);
            return 0
        };

        let staked_sui = system_state.request_add_stake_non_entry(
            coin::from_balance(sui, ctx),
            validator_address,
            ctx
        );
        let staked_sui_amount = staked_sui.staked_sui_amount();

        self.join_stake(system_state,staked_sui, ctx);

        staked_sui_amount
    }
    
    public (package) fun decrease_validator_stake(
        self: &mut ValidatorPool,
        system_state: &mut SuiSystemState,
        validator_address: address,
        target_unstake_sui_amount: u64,
        ctx: &mut TxContext
    ): u64 {
        let mut validator_index = self.find_validator_index_by_address(validator_address);
        assert!(validator_index.is_some(), EValidatorNotFound);

        let sui_amount = self.unstake_approx_n_sui_from_validator(
            system_state,
            validator_index.extract(),
            target_unstake_sui_amount,
            ctx
        );

        sui_amount
    }

    /* Join Functions */
    public(package) fun join_to_sui_pool(self: &mut ValidatorPool, sui: Balance<SUI>) {
        self.total_sui_supply = self.total_sui_supply + sui.value();
        self.sui_pool.join(sui);
    }

    public(package) fun join_stake(
        self: &mut ValidatorPool, 
        system_state: &mut SuiSystemState,
        stake: StakedSui, 
        ctx: &mut TxContext
    ) {
        let validator_index = self.get_or_add_validator_index_by_staking_pool_id_mut(
            system_state, 
            stake.pool_id(), 
            ctx
        );

        if (stake.stake_activation_epoch() <= ctx.epoch()) {
            let fungible_staked_sui = system_state.convert_to_fungible_staked_sui(stake, ctx);
            self.join_fungible_staked_sui_to_validator(validator_index, fungible_staked_sui);
        } else {
            self.join_inactive_stake_to_validator(validator_index, stake);
        };
    }

    fun join_inactive_stake_to_validator(
        self: &mut ValidatorPool, 
        validator_index: u64,
        stake: StakedSui,
    ) {
        let validator_info = &mut self.validator_infos[validator_index];

        if (validator_info.inactive_stake.is_some()) {
            validator_info.inactive_stake.borrow_mut().join(stake);
        } else {
            validator_info.inactive_stake.fill(stake);
        };

        self.refresh_validator_info(validator_index);
    }

    fun join_fungible_staked_sui_to_validator(
        self: &mut ValidatorPool, 
        validator_index: u64,
        fungible_staked_sui: FungibleStakedSui,
    ) {
        let validator_info = &mut self.validator_infos[validator_index];
        if (validator_info.active_stake.is_some()) {
            validator_info.active_stake.borrow_mut().join_fungible_staked_sui(fungible_staked_sui);

        } else {
            validator_info.active_stake.fill(fungible_staked_sui);
        };

        self.refresh_validator_info(validator_index);
    }

    /* Split/Take Functions */
    public(package) fun split_up_to_n_sui_from_sui_pool(
        self: &mut ValidatorPool, 
        max_sui_amount_out: u64
    ): Balance<SUI> {
        let sui_amount_out = min(self.sui_pool.value(), max_sui_amount_out);
        self.split_from_sui_pool(sui_amount_out)
    }

    fun split_from_sui_pool(self: &mut ValidatorPool, amount: u64): Balance<SUI> {
        self.total_sui_supply = self.total_sui_supply - amount;
        self.sui_pool.split(amount)
    }

    public(package) fun unstake_approx_n_sui_from_validator(
        self: &mut ValidatorPool, 
        system_state: &mut SuiSystemState,
        validator_index: u64, 
        unstake_sui_amount: u64,
        ctx: &mut TxContext
    ): u64 {
        let mut amount = self.unstake_approx_n_sui_from_inactive_stake(system_state, validator_index, unstake_sui_amount, ctx);
        if (unstake_sui_amount > amount) {
            amount = amount + self.unstake_approx_n_sui_from_active_stake(system_state, validator_index, unstake_sui_amount - amount + ACTIVE_STAKE_REDEEM_OFFSET, ctx);
        };

        amount
    }

    // This function tries to unstake approximately n SUI. 
    // the output amount should be bounded from [0, n + 1 * MIST_PER_SUI * pool_token_ratio)
    public(package) fun unstake_approx_n_sui_from_active_stake(
        self: &mut ValidatorPool, 
        system_state: &mut SuiSystemState,
        validator_index: u64, 
        target_unstake_sui_amount: u64,
        ctx: &mut TxContext
    ): u64 {
        if (target_unstake_sui_amount == 0) {
            return 0
        };

        let validator_info = &mut self.validator_infos[validator_index];
        if (validator_info.active_stake.is_none()) {
            return 0
        };

        let fungible_staked_sui_amount = validator_info.active_stake.borrow().value();
        let total_sui_amount = get_sui_amount(
            &validator_info.exchange_rate, 
            fungible_staked_sui_amount 
        );

        let target_unstake_sui_amount = max(target_unstake_sui_amount, MIN_STAKE_THRESHOLD);

        let unstaked_sui = if (total_sui_amount <= target_unstake_sui_amount + MIN_STAKE_THRESHOLD) {
            self.take_all_active_stake(system_state, validator_index, ctx)
        } else {
            // ceil(target_unstake_sui_amount * fungible_staked_sui_amount / total_sui_amount)
            let split_amount = (
                ((target_unstake_sui_amount as u128)
                    * (fungible_staked_sui_amount as u128)
                    + (total_sui_amount as u128)
                    - 1)
                / (total_sui_amount as u128)
            ) as u64;

            self.take_some_active_stake(system_state, validator_index, split_amount as u64, ctx)
        };

        let unstaked_sui_amount = unstaked_sui.value();
        self.join_to_sui_pool(unstaked_sui);

        unstaked_sui_amount
    }

    // The output should be bounded from [0, n + 1 * MIST_PER_SUI) Sui
    public(package) fun unstake_approx_n_sui_from_inactive_stake(
        self: &mut ValidatorPool, 
        system_state: &mut SuiSystemState,
        validator_index: u64, 
        target_unstake_sui_amount: u64,
        ctx: &mut TxContext
    ): u64 {
        if (target_unstake_sui_amount == 0) {
            return 0
        };

        let validator_info = &mut self.validator_infos[validator_index];
        if (validator_info.inactive_stake.is_none()) {
            return 0
        };

        let target_unstake_sui_amount = max(target_unstake_sui_amount, MIN_STAKE_THRESHOLD);

        let staked_sui_amount = validator_info.inactive_stake.borrow().staked_sui_amount();
        let staked_sui = if (staked_sui_amount <= target_unstake_sui_amount + MIN_STAKE_THRESHOLD) {
            self.take_all_inactive_stake(validator_index)
        } else {
            self.take_some_inactive_stake(validator_index, target_unstake_sui_amount, ctx)
        };

        let unstaked_sui = system_state.request_withdraw_stake_non_entry(staked_sui, ctx);
        let unstaked_sui_amount = unstaked_sui.value();
        self.join_to_sui_pool(unstaked_sui);

        unstaked_sui_amount
    }

    // This function approximately unstakes n SUI from validators, then returns up to n SUI.
    public(package) fun split_n_sui(
        self: &mut ValidatorPool,
        system_state: &mut SuiSystemState,
        max_sui_amount_out: u64,
        ctx: &mut TxContext
    ): Balance<SUI> {

        {
            let to_unstake = if(max_sui_amount_out > self.sui_pool.value()) {
                max_sui_amount_out - self.sui_pool.value()
            } else {
                0
            };
            let total_weight = self.total_weight as u128;
            let mut i = self.validators().length();
            
            while (i > 0 && self.sui_pool.value() < max_sui_amount_out) {
                i = i - 1;

                let to_unstake_i = 1 + (self.validator_infos[i].assigned_weight as u128 
                                        * ((to_unstake)as u128)
                                        / total_weight);
                                
                self.unstake_approx_n_sui_from_validator(
                    system_state,
                    i,
                    to_unstake_i as u64,
                    ctx
                );
            };

            // The initial unstaking by weight will softly rebalance the pool
            // However, in a rare case that the pool has very little liquidity,
            //   the unstaking amount will not be guaranteed to be the target amount
            //   for the case that the pool has very little liquidity
            // Example:
            // 1. weights: [validator1 100, validator2 100]
            // 2. total active stake: [validator1 90, validator2 110]
            // 3. rebalance by weight: [validator1 80, validator2 100], sui pool = 20
            //    - 10 mist of sui is not stake to validator1 due to the minimum stake threshold
            // 4. User withdraw 190, withdraw target: [95, 95]
            // 5. User actually withdraws: [80, 95] = 175 < 190
            // 6. User should get 190, but the pool has only 175

            // Make sure all the sui can be withdrawn
            i = self.validators().length();
            while (i > 0 && self.sui_pool.value() < max_sui_amount_out) {
                i = i - 1;
                let to_unstake_i = max_sui_amount_out - self.sui_pool.value();
                                
                self.unstake_approx_n_sui_from_validator(
                    system_state,
                    i,
                    to_unstake_i as u64,
                    ctx
                );}
            ;
        };

        // Allow 10 mist of rounding error
        let mut safe_max_sui_amount_out = max_sui_amount_out;
        if(max_sui_amount_out > self.sui_pool.value()) {
            if(max_sui_amount_out  <= self.sui_pool.value() + ACCEPTABLE_MIST_ERROR) {
                safe_max_sui_amount_out = self.sui_pool.value();
            };
        };

        assert!(self.sui_pool.value() >= safe_max_sui_amount_out, ENotEnoughSuiInSuiPool);
        self.split_from_sui_pool(safe_max_sui_amount_out)
    }

    /* all split/unstake/take functions are built using the following 4 functions */
    fun take_some_active_stake(
        self: &mut ValidatorPool, 
        system_state: &mut SuiSystemState,
        validator_index: u64, 
        fungible_staked_sui_amount: u64,
        ctx: &mut TxContext
    ): Balance<SUI> {
        let validator_info = &mut self.validator_infos[validator_index];

        let stake = validator_info.active_stake
            .borrow_mut()
            .split_fungible_staked_sui(fungible_staked_sui_amount, ctx);

        self.refresh_validator_info(validator_index);

        system_state.redeem_fungible_staked_sui(stake, ctx)
    }

    fun take_all_active_stake(
        self: &mut ValidatorPool, 
        system_state: &mut SuiSystemState,
        validator_index: u64, 
        ctx: &TxContext
    ): Balance<SUI> {
        let validator_info = &mut self.validator_infos[validator_index];
        let fungible_staked_sui = validator_info.active_stake.extract();

        self.refresh_validator_info(validator_index);

        system_state.redeem_fungible_staked_sui(fungible_staked_sui, ctx)
    }

    fun take_some_inactive_stake(
        self: &mut ValidatorPool, 
        validator_index: u64, 
        sui_amount_out: u64,
        ctx: &mut TxContext
    ): StakedSui {
        let validator_info = &mut self.validator_infos[validator_index];
        let stake = validator_info.inactive_stake
            .borrow_mut()
            .split(sui_amount_out, ctx);

        self.refresh_validator_info(validator_index);

        stake
    }

    fun take_all_inactive_stake(
        self: &mut ValidatorPool, 
        validator_index: u64, 
    ): StakedSui {
        let validator_info = &mut self.validator_infos[validator_index];
        let stake = validator_info.inactive_stake.extract();

        self.refresh_validator_info(validator_index);

        stake
    }

    /* Private functions */
    fun get_or_add_validator_index_by_staking_pool_id_mut(
        self: &mut ValidatorPool, 
        system_state: &mut SuiSystemState,
        staking_pool_id: ID,
        ctx: &mut TxContext
    ): u64 {
        let mut current_validator_addresses = vector[];

        let mut i = 0;
        while (i < self.validator_infos.length()) {
            if (self.validator_infos[i].staking_pool_id == staking_pool_id) {
                return i
            };

            current_validator_addresses.push_back(self.validator_infos[i].validator_address);
            i = i + 1;
        };

        let validator_address = system_state.validator_address_by_pool_id(&staking_pool_id);

        assert!(
            !current_validator_addresses.contains(&validator_address),
            EValidatorAlreadyExists
        );

        let active_validator_addresses = system_state.active_validator_addresses();
        assert!(
            active_validator_addresses.contains(&validator_address),
            ENotActiveValidator
        );

        let exchange_rates = system_state.pool_exchange_rates(&staking_pool_id);

        let latest_exchange_rate = exchange_rates.borrow(ctx.epoch());

        self.validator_infos.push_back(ValidatorInfo {
            staking_pool_id: copy staking_pool_id,
            validator_address,
            active_stake: option::none(),
            inactive_stake: option::none(),
            exchange_rate: *latest_exchange_rate,
            total_sui_amount: 0,
            assigned_weight: DEFAULT_WEIGHT,
            last_refresh_epoch: ctx.epoch(),
            extra_fields: bag::new(ctx)
        });

        i
    }

    /// copied directly from staking_pool.move
    fun get_sui_amount(exchange_rate: &PoolTokenExchangeRate, token_amount: u64): u64 {
        // When either amount is 0, that means we have no stakes with this pool.
        // The other amount might be non-zero when there's dust left in the pool.
        if (exchange_rate.sui_amount() == 0 || exchange_rate.pool_token_amount() == 0) {
            return token_amount
        };
        let res = (exchange_rate.sui_amount() as u128)
                * (token_amount as u128)
                / (exchange_rate.pool_token_amount() as u128);
        res as u64
    }

    #[test_only]
    public fun check_all_validators_rate(self: &mut ValidatorPool, system_state: &mut SuiSystemState, ctx: &mut TxContext) {
        let mut i = 0;
        let mut ret = vector::empty<u64>();
        let mut active_amount = 0;
        while (i < self.validator_infos.length()) {
            let exchange_rates = system_state.pool_exchange_rates(&self.validator_infos[i].staking_pool_id);

            let mut title = ascii::string(b"exchange_rates validator: ");
            title.append(ascii::string(*i.to_string().as_bytes()));
            std::debug::print(&title);
            let mut j = ctx.epoch() + 1;
            let mut last_ratio: u128 = 0;
            while (j > 0) {
                if (exchange_rates.contains(j - 1)) {
                    let rate = &exchange_rates[j - 1];
                    if (rate.sui_amount() != 0 && rate.pool_token_amount() != 0) {
                        let ratio = (rate.pool_token_amount() as u128) * 1_000000000 / (rate.sui_amount() as u128);
                        let ratio_reverse = (rate.sui_amount() as u128) * 1_000000000 / (rate.pool_token_amount() as u128);

                        std::debug::print(&(j - 1));
                        std::debug::print(&ratio_reverse);
                        assert!(ratio >= last_ratio, 0);
                        last_ratio = ratio;
                    };
                };
                j = j - 1;
            };

            let mut amount = 0;
            if (self.validator_infos[i].active_stake.is_some()) {
                amount = self.validator_infos[i].active_stake.borrow().value();
            };
            let rate = exchange_rates.borrow(ctx.epoch());
            let sui_amount = get_sui_amount(rate, amount);

            active_amount = active_amount + sui_amount;
            ret.push_back(sui_amount);

            // let s = self.validator_infos[i].active_stake.extract();
            // let sui = system_state.redeem_fungible_staked_sui(s, ctx);
            // assert!(sui.value() == sui_amount, 0);
            // sui.destroy_for_testing();

            i = i + 1;
        };
        std::debug::print(&ascii::string(b"check_all_validators_rate [sui amount, active amount, sui pool, total sui supply]"));
        std::debug::print(&ret);
        std::debug::print(&active_amount);
        std::debug::print(&self.sui_pool().value());
        std::debug::print(&self.total_sui_supply);
    }
}