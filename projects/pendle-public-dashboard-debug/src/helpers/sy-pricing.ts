import { BaseContext, BigDecimal, CHAIN_IDS, LogLevel } from '@sentio/sdk';
import { getStandardizedYieldContract } from '../types/eth/standardizedyield.js';
import { getERC20Contract } from '@sentio/sdk/eth/builtin/erc20';
import {
    arbitrumTokens,
    ethereumTokens,
    sentioTokens,
    syPricingStrategies,
} from './tokens.js';
import { getPriceByType } from '@sentio/sdk/utils';
import { ZERO_ADDRESS } from './consts.js';

interface EthContext extends BaseContext {
    timestamp: Date;
    blockNumber: bigint | number;
}

type SYPricingData = {
    pToken: string;
    pTokenIndex: number;
    pTokenAddress: string;
};

/**
 * This function returns the pricing strategy for a given sy token
 * @notice The addresses should be in lowercase
 * @param sy sy address
 * @returns pricing strategy for sy token
 */
function getPriceStrategy(sy: string): SYPricingData | null {
    switch (sy) {
        case '0xcbc72d92b2dc8187414f6734718563898740c0bc':
            return syPricingStrategies.stETH;
        case '0x47ba20283be4d72d4afb1862994f4203551539c5':
            return syPricingStrategies.APE;
        case '0xc0ca1e345be44ea2c83202222e5084ae3a01e9dc':
            return syPricingStrategies.BALANCER_ANKRETH;
        case '0xdf7083f2a0f8a191ab5eeafebe92ed21cd3dd915':
            return syPricingStrategies.BALANCER_RETH;
        case '0x8267fdabd1b8c8645138f2de5b0fe24988dc9820':
            return syPricingStrategies.BALANCER_WSTETH;
        case '0xd393d1ddd6b8811a86d925f5e14014282581bc04':
            return syPricingStrategies.FRAX_USDC;
        case '0x35c16314d6ee4753289e5cc15a5c5e1dd4ead345':
            return syPricingStrategies.LOOKS;
        case '0x3025680925349c9c01c0f01cf300ec963832ec64':
            return syPricingStrategies.STG_USDT_ETH;
        case '0xaf699fb0d9f12bf7b14474ae5c9bea688888df73':
            return syPricingStrategies.GDAI;
        case '0x068def65b9dbaff02b4ee54572a9fa7dfb188ea3':
            return syPricingStrategies.STG_USDT_ARB;
        case '0x2066a650af4b6895f72e618587aad5e8120b7790':
            return syPricingStrategies.GLP;
        case '0xeb83006b0aaddd15ad8afbebe2f4e0937f210673':
            return syPricingStrategies.SFRX_ETH;
        case '0x7f531a70a240fba0e40169e56eede1c6b7ef8463':
            return syPricingStrategies.BALANCER_ANKRETH;
        case '0xc0dd85720e3bc7959890127b5d3af2d29f6c74f4':
            return syPricingStrategies.BALANCER_RETH;
        case '0x677885afde857b70f40741ff8b60f9afba95dd49':
            return syPricingStrategies.STAFI_ETH;
        default:
            return null;
    }
}

/**
 * This function returns the price of a sy token
 * @param ctx context object
 * @param sy sy token address
 * @returns price of sy token
 */
export async function getSYTokenPrice(ctx: EthContext, sy: string): Promise<BigDecimal> {
    sy = sy.toLowerCase();
    const syPricing = getPriceStrategy(sy);

    if (!syPricing) {
        ctx.eventLogger.emit('pricing', {
            distinctId: 'sy pricing',
            level: LogLevel.INFO,
            message: `No pricing strategy for sy token ${sy}`,
        });
        return new BigDecimal(0);
    }

    // @notice Chain ID is set to Ethereum by default
    const pTokenPrice = await getPriceByType(
        CHAIN_IDS.ETHEREUM,
        syPricing.pToken,
        ctx.timestamp
    );

    const syContract = getStandardizedYieldContract(ctx, sy);
    let pDecimal = 18n;
    if (syPricing.pTokenAddress !== ZERO_ADDRESS) {
        const pToken = getERC20Contract(ctx, syPricing.pTokenAddress);
        pDecimal = await pToken.decimals();
    }

    const syDecimal = await syContract.decimals();
    try {
        const tokenOut = (
            await syContract.previewRedeem(syPricing.pTokenAddress, 10n ** syDecimal, {
                blockTag: ctx.blockNumber,
            })
        ).scaleDown(pDecimal);
        return tokenOut.multipliedBy(pTokenPrice!);
    } catch (e) {
        const syOut = (
            await syContract.previewDeposit(syPricing.pTokenAddress, 10n ** pDecimal, {
                blockTag: ctx.blockNumber,
            })
        ).scaleDown(syDecimal);
        const price = new BigDecimal(pTokenPrice!);

        return price.dividedBy(syOut);
    }
}
