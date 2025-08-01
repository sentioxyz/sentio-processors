module liquid_staking::fee_config {
    use sui::bag::{Self, Bag};

    const EInvalidFee: u64 = 20001;

    const MAX_BPS: u64 = 10_000; // 100%
    const BPS_MULTIPLIER: u128 = 10_000; // 100%
    const MAX_UNSTAKE_FEE_BPS: u64 = 500; // 5%
    const MAX_STAKE_FEE_BPS: u64 = 500; // 5%

    // Fee config for liquid staking pool
    // Fees are in basis points (bps)
    public struct FeeConfig has store {
        stake_fee_bps: u64, // fee for stake operation
        unstake_fee_bps: u64, // fee for unstake operation
        reward_fee_bps: u64, // fee for staking reward 
        unstake_fee_redistribution_bps: u64, // fee for unstake fee redistribution
        extra_fields: Bag // reserved for future use
    }

    public fun new(ctx: &mut TxContext): FeeConfig {
        FeeConfig {
            stake_fee_bps: 0,
            unstake_fee_bps: 0,
            reward_fee_bps: 0,
            unstake_fee_redistribution_bps: 0,
            extra_fields: bag::new(ctx),
        }
    }

    public fun stake_fee_bps(fees: &FeeConfig): u64 {
        fees.stake_fee_bps
    }

    public fun unstake_fee_bps(fees: &FeeConfig): u64 {
        fees.unstake_fee_bps
    }

    public fun reward_fee_bps(fees: &FeeConfig): u64 {
        fees.reward_fee_bps
    }

    public fun unstake_fee_redistribution_bps(fees: &FeeConfig): u64 {
        fees.unstake_fee_redistribution_bps
    }

    public(package) fun set_stake_fee_bps(self: &mut FeeConfig, fee: u64) {
        self.stake_fee_bps = fee;
        self.validate_fees();
    }

    public(package) fun set_unstake_fee_bps(self: &mut FeeConfig, fee: u64) {
        self.unstake_fee_bps = fee;
        self.validate_fees();
    }

    public(package) fun set_reward_fee_bps(self: &mut FeeConfig, fee: u64) {
        self.reward_fee_bps = fee;
        self.validate_fees();
    }

    public(package) fun set_unstake_fee_redistribution_bps(self: &mut FeeConfig, fee: u64) {
        self.unstake_fee_redistribution_bps = fee;
        self.validate_fees();
    }
    
    public fun validate_fees(fees: &FeeConfig) {
        assert!(fees.stake_fee_bps <= MAX_STAKE_FEE_BPS, EInvalidFee);
        assert!(fees.unstake_fee_bps <= MAX_UNSTAKE_FEE_BPS, EInvalidFee);
        assert!(fees.reward_fee_bps <= MAX_BPS, EInvalidFee);
        assert!(fees.unstake_fee_redistribution_bps <= MAX_BPS, EInvalidFee);
    }

    public(package) fun calculate_stake_fee(self: &FeeConfig, sui_amount: u64): u64 {
        if (self.stake_fee_bps == 0) {
            return 0
        };

        // ceil(sui_amount * sui_stake_fee_bps / 10_000)
        (((self.stake_fee_bps as u128) * (sui_amount as u128) + 9999) / BPS_MULTIPLIER) as u64
    }

    public(package) fun calculate_unstake_fee(self: &FeeConfig, sui_amount: u64): u64 {
        if (self.unstake_fee_bps == 0) {
            return 0
        };

        // ceil(sui_amount * unstake_fee_bps / 10_000)
        (((sui_amount as u128) * (self.unstake_fee_bps as u128) + 9999) / BPS_MULTIPLIER) as u64
    }

    public(package) fun calculate_reward_fee(self: &FeeConfig, before_balance: u64, after_balance: u64): u64 {
        let reward_fee = if (after_balance > before_balance) {
                ((after_balance - before_balance) as u128) 
                * (self.reward_fee_bps() as u128)
                / BPS_MULTIPLIER
            } else {
                0
            };
        reward_fee as u64
    }

    public(package) fun calculate_unstake_fee_redistribution(self: &FeeConfig, sui_amount: u64): u64 {
        if (self.unstake_fee_redistribution_bps == 0) {
            return 0
        };

        // ceil(unstake_fee_amount * unstake_fee_redistribution_bps / 10_000)
        (((sui_amount as u128) * (self.unstake_fee_redistribution_bps as u128) + 9999) / BPS_MULTIPLIER) as u64
    }
}
