/// Module: stake_pool
/// The stake_pool module provides entry functions for staking and unstaking for the LST.
/// It also provides a set of functions for managing the stake pool.
module liquid_staking::stake_pool {
    use sui::{
        balance::{Self, Balance},
        coin::{Self, Coin},
        sui::SUI,
        event::{emit},
        bag::{Self, Bag},
        package,
        vec_map::{VecMap}
    };

    use liquid_staking::{
        fee_config::{Self, FeeConfig},
        validator_pool::{Self, ValidatorPool},
        manage::{Self, Manage},
        cert::{Metadata, CERT},
        native_pool::{emit_staked, emit_unstaked, emit_ratio}
    };

    use sui_system::{
        sui_system::{SuiSystemState},
    };

    use std::ascii::{Self, String};

    /* Constants */
    const SUI_MIST: u64 = 1_000_000_000;
    const MIN_STAKE_AMOUNT: u64 = 1_00_000_000; // 0.1 SUI
    const BPS_MULTIPLIER: u128 = 10_000; // 100%

    /* Errors */
    const EZeroMintAmount: u64 = 30000;
    const ERatio: u64 = 30001;
    const EZeroSupply: u64 = 30002;
    const EUnderMinAmount: u64 = 30003;

    public struct STAKE_POOL has drop {}

    /* Stake Pool */
    public struct StakePool has key, store {
        id: UID,
        fee_config: FeeConfig,
        fees: Balance<SUI>,
        boosted_balance: Balance<SUI>,
        boosted_reward_amount: u64,
        accrued_reward_fees: u64,
        validator_pool: ValidatorPool,
        manage: Manage,
        extra_fields: Bag
    }

    /* Administrator Caps */
    public struct AdminCap has key, store { 
        id: UID
    }

    public struct OperatorCap has key, store {
        id: UID
    }

    /* Events */
    public struct StakeEventExt has copy, drop {
        sui_amount_in: u64,
        lst_amount_out: u64,
        fee_amount: u64
    }

    public struct UnstakeEventExt has copy, drop {
        lst_amount_in: u64,
        sui_amount_out: u64,
        fee_amount: u64,
        redistribution_amount: u64
    }

    public struct EpochChangedEvent has copy, drop {
        old_sui_supply: u64,
        new_sui_supply: u64,
        boosted_reward_amount: u64,
        lst_supply: u64,
        reward_fee: u64
    }

    public struct DelegateStakeEvent has copy, drop {
        v_address: address,
        sui_amount_in: u64,
        lst_amount_out: u64
    }

    public struct MintOperatorCapEvent has copy, drop {
        recipient: address
    }

    public struct CollectFeesEvent has copy, drop {
        amount: u64
    }

    public struct DepositBoostedBalanceEvent has copy, drop {
        before_balance: u64,
        after_balance: u64
    }

    public struct RebalanceEvent has copy, drop {
        is_epoch_rolled_over: bool,
        sender: address
    }

    public struct BoostedRewardAmountUpdateEvent has copy, drop {
        old_value: u64,
        new_value: u64
    }

    public struct FeeUpdateEvent has copy, drop {
        field: String,
        old_value: u64,
        new_value: u64
    }

    public struct ValidatorWeightsUpdateEvent has copy, drop {
        validator_weights: VecMap<address, u64>
    }

    public struct SetPausedEvent has copy, drop {
        paused: bool
    }

    fun init(otw: STAKE_POOL, ctx: &mut TxContext) {
        package::claim_and_keep(otw, ctx);
    }

    #[allow(lint(self_transfer, share_owned))]
    public(package) fun create_stake_pool(ctx: &mut TxContext) {
        // assert!(metadata.get_total_supply_value() == 0, 0);
        let validator_pool = validator_pool::new(ctx);
        let (admin_cap, stake_pool) = create_lst_with_validator_pool(
            validator_pool,
            ctx
        );

        transfer::public_share_object(stake_pool);
        
        // mint 2 operator caps and 1 admin cap
        transfer::public_transfer(OperatorCap { id: object::new(ctx) }, ctx.sender());
        transfer::public_transfer(OperatorCap { id: object::new(ctx) }, ctx.sender());
        transfer::public_transfer(admin_cap, ctx.sender());
    }

    fun create_lst_with_validator_pool(
        validator_pool: ValidatorPool,
        ctx: &mut TxContext
    ): (AdminCap, StakePool) {
        let uid = object::new(ctx);

        let fee_config = fee_config::new(ctx);

        (
            AdminCap { id: object::new(ctx) },

            StakePool {
                id: uid,
                fee_config: fee_config,
                fees: balance::zero(),
                boosted_balance: balance::zero(),
                boosted_reward_amount: 0,
                accrued_reward_fees: 0,
                validator_pool,
                manage: manage::new(),
                extra_fields: bag::new(ctx)
            }
        )
    }

    /* User Operations */
    #[allow(lint(self_transfer))]
    public entry fun stake_entry(
        self: &mut StakePool, 
        metadata: &mut Metadata<CERT>,
        system_state: &mut SuiSystemState, 
        sui: Coin<SUI>, 
        ctx: &mut TxContext
    ) {
        self.manage.check_version();
        let cert = self.stake(metadata, system_state, sui, ctx);
        transfer::public_transfer(cert, ctx.sender());
    }

    #[allow(lint(self_transfer))]
    public entry fun delegate_stake_entry(
        self: &mut StakePool, 
        metadata: &mut Metadata<CERT>,
        system_state: &mut SuiSystemState, 
        sui: Coin<SUI>, 
        v_address: address,
        ctx: &mut TxContext
    ) {
        let cert = self.delegate_stake(metadata, system_state, sui, v_address, ctx);
        transfer::public_transfer(cert, ctx.sender());
    }

    public fun delegate_stake(
        self: &mut StakePool, 
        metadata: &mut Metadata<CERT>,
        system_state: &mut SuiSystemState, 
        sui: Coin<SUI>, 
        v_address: address,
        ctx: &mut TxContext
    ): Coin<CERT> {
        let amount_in = sui.value();
        let cert = stake(self, metadata, system_state, sui, ctx);
        emit(DelegateStakeEvent {
            v_address,
            sui_amount_in: amount_in,
            lst_amount_out: cert.value(),
        });
        cert
    }

    public fun stake(
        self: &mut StakePool, 
        metadata: &mut Metadata<CERT>,
        system_state: &mut SuiSystemState, 
        sui: Coin<SUI>, 
        ctx: &mut TxContext
    ): Coin<CERT> {
        self.manage.check_version();
        self.manage.check_not_paused();

        self.refresh(metadata,system_state, ctx);
        assert!(sui.value() >= MIN_STAKE_AMOUNT, EUnderMinAmount);

        let old_sui_supply = (self.total_sui_supply() as u128);
        let old_lst_supply = (total_lst_supply(metadata) as u128);

        let mut sui_balance = sui.into_balance();
        let sui_amount_in = sui_balance.value();

        // deduct fees
        let mint_fee_amount = self.fee_config.calculate_stake_fee(sui_balance.value());
        self.fees.join(sui_balance.split(mint_fee_amount));
        
        let lst_mint_amount = self.sui_amount_to_lst_amount(metadata, sui_balance.value());
        assert!(lst_mint_amount > 0, EZeroMintAmount);

        emit(StakeEventExt {
            sui_amount_in,
            lst_amount_out: lst_mint_amount,
            fee_amount: mint_fee_amount
        });

        emit_staked(ctx.sender(), sui_amount_in, lst_mint_amount);

        let lst = metadata.mint(lst_mint_amount, ctx);

        // invariant: lst_out / sui_in <= old_lst_supply / old_sui_supply
        // -> lst_out * old_sui_supply <= sui_in * old_lst_supply
        assert!(
            ((lst.value() as u128) * old_sui_supply <= (sui_balance.value() as u128) * old_lst_supply)
            || (old_sui_supply > 0 && old_lst_supply == 0), // special case
            ERatio
        );

        self.join_to_sui_pool(sui_balance);
        lst
    }

    #[allow(lint(self_transfer))]
    public entry fun unstake_entry(
        self: &mut StakePool,
        metadata: &mut Metadata<CERT>,
        system_state: &mut SuiSystemState, 
        cert: Coin<CERT>,
        ctx: &mut TxContext
    ) {
        self.manage.check_version();
        let sui = self.unstake(metadata, system_state, cert, ctx);
        transfer::public_transfer(sui, ctx.sender());
    }

    public fun unstake(
        self: &mut StakePool,
        metadata: &mut Metadata<CERT>,
        system_state: &mut SuiSystemState, 
        lst: Coin<CERT>,
        ctx: &mut TxContext
    ): Coin<SUI> {
        self.manage.check_version();
        self.manage.check_not_paused();
        self.refresh(metadata, system_state, ctx);
        assert!(lst.value() >= MIN_STAKE_AMOUNT, EUnderMinAmount);

        let old_sui_supply = (self.total_sui_supply() as u128);
        let old_lst_supply = (total_lst_supply(metadata) as u128);

        let sui_amount_out = self.lst_amount_to_sui_amount(metadata, lst.value());
        let mut sui = self.validator_pool.split_n_sui(system_state, sui_amount_out, ctx);

        // deduct fee
        let redeem_fee_amount = self.fee_config.calculate_unstake_fee(sui.value());
        let redistribution_amount = 
            if(total_lst_supply(metadata) == lst.value()) {
                0
            } else {
                self.fee_config.calculate_unstake_fee_redistribution(redeem_fee_amount)
            };

        let mut fee = sui.split(redeem_fee_amount as u64);
        let redistribution_fee = fee.split(redistribution_amount);

        self.fees.join(fee);
        self.join_to_sui_pool(redistribution_fee);

        emit(UnstakeEventExt {
            lst_amount_in: lst.value(),
            sui_amount_out: sui.value(),
            fee_amount: redeem_fee_amount - redistribution_amount,
            redistribution_amount: redistribution_amount
        });

        emit_unstaked(ctx.sender(), lst.value(), sui.value());

        // invariant: sui_out / lst_in <= old_sui_supply / old_lst_supply
        // -> sui_out * old_lst_supply <= lst_in * old_sui_supply
        assert!(
            (sui.value() as u128) * old_lst_supply <= (lst.value() as u128) * old_sui_supply,
            ERatio
        );

        metadata.burn_coin(lst);

        coin::from_balance(sui, ctx)
    }

    /* Admin Functions */
    public fun set_paused(self: &mut StakePool, _: &AdminCap, paused: bool) {
        self.manage.check_version();
        self.manage.set_paused(paused);
        emit(SetPausedEvent {paused});
    }

    public fun migrate_version(self: &mut StakePool, _: &AdminCap) {
        self.manage.migrate_version();
    }

    public fun mint_operator_cap(
        self: &mut StakePool,
        _: &AdminCap,
        recipient: address,
        ctx: &mut TxContext
    ) {
        self.manage.check_version();
        transfer::public_transfer(OperatorCap { id: object::new(ctx) }, recipient);
        emit(MintOperatorCapEvent {
            recipient
        });
    }

    public fun collect_fees(
        self: &mut StakePool,
        metadata: &mut Metadata<CERT>,
        system_state: &mut SuiSystemState,
        _: &AdminCap,
        ctx: &mut TxContext
    ): Coin<SUI> {
        self.manage.check_version();
        self.refresh(metadata, system_state, ctx);

        let reward_fees = self.validator_pool.split_n_sui(system_state, self.accrued_reward_fees, ctx);
        self.accrued_reward_fees = self.accrued_reward_fees - reward_fees.value();

        let mut fees = self.fees.withdraw_all();
        fees.join(reward_fees);

        emit(CollectFeesEvent {
            amount: fees.value()
        });

        coin::from_balance(fees, ctx)
    }

    public fun update_stake_fee(
        self: &mut StakePool,
        _: &AdminCap,
        fee: u64,
    ) {
        self.manage.check_version();
        emit(FeeUpdateEvent {
            field: ascii::string(b"stake_fee_bps"),
            old_value: self.fee_config.stake_fee_bps(),
            new_value: fee
        });
        self.fee_config.set_stake_fee_bps(fee);
    }

    public fun update_unstake_fee(
        self: &mut StakePool,
        _: &AdminCap,
        fee: u64,
    ) {
        self.manage.check_version();
        emit(FeeUpdateEvent {
            field: ascii::string(b"unstake_fee_bps"),
            old_value: self.fee_config.unstake_fee_bps(),
            new_value: fee
        });
        self.fee_config.set_unstake_fee_bps(fee);
    }

    public fun update_reward_fee(
        self: &mut StakePool,
        _: &AdminCap,
        fee: u64,
    ) {
        self.manage.check_version();
        emit(FeeUpdateEvent {
            field: ascii::string(b"reward_fee_bps"),
            old_value: self.fee_config.reward_fee_bps(),
            new_value: fee
        });
        self.fee_config.set_reward_fee_bps(fee);
    }

    public fun update_unstake_fee_redistribution(
        self: &mut StakePool,
        _admin_cap: &AdminCap,
        fee: u64,
    ) {
        self.manage.check_version();
        emit(FeeUpdateEvent {
            field: ascii::string(b"unstake_fee_redistribution_bps"),
            old_value: self.fee_config.unstake_fee_redistribution_bps(),
            new_value: fee
        });
        self.fee_config.set_unstake_fee_redistribution_bps(fee);
    }

    public fun update_boosted_reward_amount(
        self: &mut StakePool,
        _: &AdminCap,
        amount: u64,
    ) {
        self.manage.check_version();
        emit(BoostedRewardAmountUpdateEvent {
            old_value: self.boosted_reward_amount,
            new_value: amount
        });
        self.boosted_reward_amount = amount;
    }

    /* Operator Functions */
    public fun set_validator_weights(
        self: &mut StakePool,
        metadata: &mut Metadata<CERT>,
        system_state: &mut SuiSystemState,
        _: &OperatorCap,
        validator_weights: VecMap<address, u64>,
        ctx: &mut TxContext
    ) {
        self.manage.check_version();
        self.refresh(metadata, system_state, ctx);
        self.validator_pool.set_validator_weights(
            validator_weights,
            system_state,
            ctx
        );

        emit(ValidatorWeightsUpdateEvent {
            validator_weights
        });
    }

    public fun deposit_boosted_balance(
        self: &mut StakePool,
        _: &OperatorCap,
        coin: &mut Coin<SUI>,
        amount: u64,
        ctx: &mut TxContext
    ) {
        self.manage.check_version();
        emit(DepositBoostedBalanceEvent {
            before_balance: self.boosted_balance.value(),
            after_balance: self.boosted_balance.value()
        });
        self.boosted_balance.join(coin::into_balance(coin.split(amount, ctx)));
    }

    public fun rebalance(
        self: &mut StakePool,
        metadata: &mut Metadata<CERT>,
        system_state: &mut SuiSystemState,
        ctx: &mut TxContext
    ) {
        self.manage.check_version();
        self.manage.check_not_paused();
        let is_epoch_rolled_over = self.refresh(metadata, system_state, ctx);
        self.validator_pool.rebalance(option::none(), system_state, ctx);
        emit(RebalanceEvent {is_epoch_rolled_over, sender: ctx.sender()});
    }

    // returns true if the object was refreshed
    public fun refresh(
        self: &mut StakePool, 
        metadata: &Metadata<CERT>,
        system_state: &mut SuiSystemState, 
        ctx: &mut TxContext
    ): bool {
        self.manage.check_version();
        self.manage.check_not_paused();

        let old_total_supply = self.total_sui_supply();

        if (self.validator_pool.refresh(system_state, ctx)) { // epoch rolled over
            let new_total_supply = self.total_sui_supply();

            let reward_fee = if (new_total_supply > old_total_supply) {
                (((new_total_supply - old_total_supply) as u128) 
                * (self.fee_config.reward_fee_bps() as u128) 
                / (BPS_MULTIPLIER as u128)) as u64
            } else {
                0
            };

            self.accrued_reward_fees = self.accrued_reward_fees + reward_fee;

            let mut boosted_reward_amount = self.boosted_reward_amount;

            if (new_total_supply > old_total_supply) {
                // boosted_reward_amount = min(new_reward, boosted_balance, set_reward_amount)
                boosted_reward_amount = boosted_reward_amount.min(new_total_supply - old_total_supply).min(self.boosted_balance.value());
                let boosted_reward = self.boosted_balance.split(boosted_reward_amount);
                self.join_to_sui_pool(boosted_reward);
            } else {
                boosted_reward_amount = 0;
            };

            emit(EpochChangedEvent {
                old_sui_supply: old_total_supply,
                new_sui_supply: new_total_supply,
                boosted_reward_amount: boosted_reward_amount,
                lst_supply: total_lst_supply(metadata),
                reward_fee
            });

            return true
        };

        false
    }

    public(package) fun join_to_sui_pool(self: &mut StakePool, sui: Balance<SUI>) {
        self.validator_pool.join_to_sui_pool(sui);
    }

    /* Public View Functions */

    // returns total sui managed by the LST.
    public fun total_sui_supply(self: &StakePool): u64 {
        self.validator_pool.total_sui_supply() - self.accrued_reward_fees
    }

    public fun total_lst_supply(metadata: &Metadata<CERT>): u64 {
        metadata.get_total_supply_value()
    }

    public fun validator_pool(self: &StakePool): &ValidatorPool {
        &self.validator_pool
    }

    public fun total_fees(self: &StakePool): u64 {
        self.fees.value() + self.accrued_reward_fees
    }

    public fun accrued_reward_fees(self: &StakePool): u64 {
        self.accrued_reward_fees
    }

    public fun boosted_balance(self: &StakePool): u64 {
        self.boosted_balance.value()
    }

    public fun fee_config(self: &StakePool): &FeeConfig {
        &self.fee_config
    }

    // returns the ratio of sui to lst, displayed in 1e9.
    // note: the ratio may be not up to date if the epoch rolled over.
    public fun get_ratio(self: &StakePool, metadata: &Metadata<CERT>): u64 {
        let total_sui_supply = self.total_sui_supply();
        let total_lst_supply = metadata.get_total_supply_value();
        if (total_sui_supply == 0 || total_lst_supply == 0) {
            return 0
        };
        self.sui_amount_to_lst_amount(metadata, SUI_MIST)
    }

    // returns the ratio of lst to sui, displayed in 1e9.
    // note: the ratio may be not up to date if the epoch rolled over.
    public fun get_ratio_reverse(self: &StakePool, metadata: &Metadata<CERT>): u64 {
        let total_sui_supply = self.total_sui_supply();
        let total_lst_supply = metadata.get_total_supply_value();
        if (total_sui_supply == 0 || total_lst_supply == 0) {
            return 0
        };
        self.lst_amount_to_sui_amount(metadata, SUI_MIST)
    }

    // publish ratio in volo v1 format(1e18) 
    public fun publish_ratio(self: &StakePool, metadata: &Metadata<CERT>) {
        let e9 = 1_000_000_000;
        let e18_ratio = (self.get_ratio(metadata) as u256) * (e9 as u256);

        emit_ratio(e18_ratio)
    }

    // returns the amount out after deducting the fee.
    public fun get_amount_out(self: &StakePool, metadata: &Metadata<CERT>, mut amount_in: u64, sui2lst: bool): u64 {
        if (sui2lst) {
            amount_in = amount_in - self.fee_config.calculate_stake_fee(amount_in);
            self.sui_amount_to_lst_amount(metadata, amount_in)
        } else {
            amount_in = amount_in - self.fee_config.calculate_unstake_fee(amount_in);
            self.lst_amount_to_sui_amount(metadata, amount_in)
        }
    }

    public fun sui_amount_to_lst_amount(
        self: &StakePool, 
        metadata: &Metadata<CERT>,
        sui_amount: u64
    ): u64 {
        let total_sui_supply = self.total_sui_supply();
        let total_lst_supply = metadata.get_total_supply_value();

        if (total_sui_supply == 0 || total_lst_supply == 0) {
            return sui_amount
        };

        let lst_amount = (total_lst_supply as u128)
            * (sui_amount as u128)
            / (total_sui_supply as u128);

        lst_amount as u64
    }

    public fun lst_amount_to_sui_amount(
        self: &StakePool, 
        metadata: &Metadata<CERT>,
        lst_amount: u64
    ): u64 {
        let total_sui_supply = self.total_sui_supply();
        let total_lst_supply = metadata.get_total_supply_value();

        assert!(total_lst_supply > 0, EZeroSupply);

        let sui_amount = (total_sui_supply as u128)
            * (lst_amount as u128) 
            / (total_lst_supply as u128);

        sui_amount as u64
    }

    #[test_only]
    public fun init_for_testing(ctx: &mut TxContext) {
        init(STAKE_POOL {}, ctx);
        create_stake_pool(ctx);
    }

    #[test_only]
    public fun mut_validator_pool(self: &mut StakePool): &mut ValidatorPool {
        &mut self.validator_pool
    }
}
