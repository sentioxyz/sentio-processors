// SPDX-License-Identifier: MIT

module liquid_staking::math {

    const E_DIVIDE_BY_ZERO: u64 = 500;
    const E_U64_OVERFLOW: u64 = 501;
    const E_RATIO_OVERFLOW: u64 = 502;

    const U64_MAX: u128 = 18_446_744_073_709_551_615; // 2 ^ 64 - 1
    const RATIO_MAX: u256 = 1_000_000_000_000_000_000; // 1e18


    // x * y / z
    public fun mul_div(x: u64, y: u64, z: u64): u64 {
        assert!(z != 0, E_DIVIDE_BY_ZERO);
        let r = (x as u128) * (y as u128) / (z as u128);
        assert!(r <= U64_MAX, E_U64_OVERFLOW);
        (r as u64)
    }

    // ratio = supply / tvl
    public fun ratio(supply: u64, tvl: u64): u256 {
        if (tvl == 0) {
            // if we don't have tvl ratio is max
            return RATIO_MAX
        };

        let ratio = (supply as u256) * RATIO_MAX / (tvl as u256);
        assert!(ratio <= RATIO_MAX, E_RATIO_OVERFLOW);
        ratio
    }

    // converts SUI to CERT
    public fun to_shares(ratio: u256, amount: u64): u64 {
        let mut shares = (amount as u256) * ratio / RATIO_MAX;
        assert!(shares <= (U64_MAX as u256), E_U64_OVERFLOW);
        if (amount > 0 && shares == 0) {
            shares = 1;
        };
        (shares as u64)
    }

    // converts CERT to SUI
    public fun from_shares(ratio: u256, shares: u64): u64 {
        assert!(ratio != 0, E_DIVIDE_BY_ZERO);
        let amount = (shares as u256) * RATIO_MAX / ratio;
        assert!(amount <= (U64_MAX as u256), E_U64_OVERFLOW);
        (amount as u64)
    }
}