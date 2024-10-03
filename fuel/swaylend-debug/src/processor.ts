import { GLOBAL_CONFIG } from '@sentio/runtime';
import { FuelNetwork } from '@sentio/sdk/fuel';
import { getPriceBySymbol } from '@sentio/sdk/utils';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc.js';
import { DateTime } from 'fuels';
import { ASSET_ID_TO_SYMBOL } from './constants.js';
import {
    BasePoolSnapshot,
    BasePositionSnapshot,
    CollateralConfiguration,
    CollateralPool,
    CollateralPoolSnapshot,
    CollateralPosition,
    CollateralPositionSnapshot,
    MarketBasic,
    MarketConfiguration,
    Pool,
    UserBasic,
} from './schema/store.js';
import { MarketProcessor } from './types/fuel/MarketProcessor.js';
import { BigDecimal } from '@sentio/sdk';

dayjs.extend(utc);

const FACTOR_SCALE_15 = 10n ** 15n;
const FACTOR_SCALE_18 = 10n ** 18n;
const SECONDS_PER_YEAR = 365n * 24n * 60n * 60n;
const I256_INDENT = 2n ** 255n;

const getBorrowRate = (
    marketConfig: MarketConfiguration,
    utilization: bigint
): bigint => {
    if (utilization <= marketConfig.borrowKink) {
        return (
            marketConfig.borrowPerSecondInterestRateBase +
            (marketConfig.borrowPerSecondInterestRateSlopeLow * utilization) /
            FACTOR_SCALE_18
        );
    }

    return (
        marketConfig.borrowPerSecondInterestRateBase +
        (marketConfig.borrowPerSecondInterestRateSlopeLow *
            marketConfig.borrowKink) /
        FACTOR_SCALE_18 +
        (marketConfig.borrowPerSecondInterestRateSlopeHigh *
            (utilization - marketConfig.borrowKink)) /
        FACTOR_SCALE_18
    );
};

const getSupplyRate = (
    marketConfig: MarketConfiguration,
    utilization: bigint
): bigint => {
    if (utilization <= marketConfig.supplyKink) {
        return (
            marketConfig.supplyPerSecondInterestRateBase +
            (marketConfig.supplyPerSecondInterestRateSlopeLow * utilization) /
            FACTOR_SCALE_18
        );
    }

    return (
        marketConfig.supplyPerSecondInterestRateBase +
        (marketConfig.supplyPerSecondInterestRateSlopeLow *
            marketConfig.supplyKink) /
        FACTOR_SCALE_18 +
        (marketConfig.supplyPerSecondInterestRateSlopeHigh *
            (utilization - marketConfig.supplyKink)) /
        FACTOR_SCALE_18
    );
};

const getApr = (rate: bigint) => {
    return (rate * SECONDS_PER_YEAR * 100n) / FACTOR_SCALE_18;
};

const getPresentValue = (principal: bigint, index: bigint): bigint => {
    return (principal * index) / FACTOR_SCALE_15;
};

// Get the utilization of the market
const getUtilization = (
    totalSupplyBase: bigint,
    totalBorrowBase: bigint,
    baseSupplyIndex: bigint,
    baseBorrowIndex: bigint
) => {
    const presentValueSupply = getPresentValue(baseSupplyIndex, totalSupplyBase);
    const presentValueBorrow = getPresentValue(baseBorrowIndex, totalBorrowBase);

    if (presentValueSupply === 0n) {
        return 0n;
    }

    return (presentValueBorrow * FACTOR_SCALE_18) / presentValueSupply;
};

const CHAIN_ID_MAP = {
    fuel_testnet: 0,
    fuel_mainnet: 0,
};

const DEPLOYED_MARKETS: Record<
    string,
    { marketAddress: string; startBlock: bigint }
> = {
    USDC: {
        marketAddress:
            '0x6ab51f60634e1414e83467482d802594bee7315b62999321ac20cb401af018b6',
        startBlock: BigInt(11380000),
    },
    USDT: {
        marketAddress:
            '0xe1e6fb5fc0d08ebd559d00c0b059438e4ff71d956bff0aebfebe883ea3cfaa1d',
        startBlock: BigInt(11380000),
    },
};

GLOBAL_CONFIG.execution = {
    sequential: true,
};

Object.values(DEPLOYED_MARKETS).forEach(({ marketAddress, startBlock }) => {
    MarketProcessor.bind({
        chainId: FuelNetwork.TEST_NET,
        address: marketAddress,
        startBlock: startBlock,
    })
        .onLogMarketConfigurationEvent(async (event, ctx) => {
            const {
                data: {
                    market_config: {
                        base_token: { bits: base_token },
                        base_token_decimals,
                        borrow_kink,
                        supply_kink,
                        supply_per_second_interest_rate_base,
                        supply_per_second_interest_rate_slope_low,
                        supply_per_second_interest_rate_slope_high,
                        borrow_per_second_interest_rate_base,
                        borrow_per_second_interest_rate_slope_low,
                        borrow_per_second_interest_rate_slope_high,
                    },
                },
            } = event;

            // Chain ID, contract address
            const chainId = CHAIN_ID_MAP[ctx.chainId as keyof typeof CHAIN_ID_MAP];
            const id = `${chainId}_${ctx.contractAddress}`;

            let marketConfiguration = await ctx.store.get(MarketConfiguration, id);

            if (!marketConfiguration) {
                marketConfiguration = new MarketConfiguration({
                    id,
                    chainId: chainId,
                    contractAddress: ctx.contractAddress,
                    baseTokenAddress: base_token,
                    baseTokenDecimals: base_token_decimals,
                    supplyKink: BigInt(supply_kink.toString()),
                    borrowKink: BigInt(borrow_kink.toString()),
                    supplyPerSecondInterestRateBase: BigInt(
                        supply_per_second_interest_rate_base.toString()
                    ),
                    supplyPerSecondInterestRateSlopeLow: BigInt(
                        supply_per_second_interest_rate_slope_low.toString()
                    ),
                    supplyPerSecondInterestRateSlopeHigh: BigInt(
                        supply_per_second_interest_rate_slope_high.toString()
                    ),
                    borrowPerSecondInterestRateBase: BigInt(
                        borrow_per_second_interest_rate_base.toString()
                    ),
                    borrowPerSecondInterestRateSlopeLow: BigInt(
                        borrow_per_second_interest_rate_slope_low.toString()
                    ),
                    borrowPerSecondInterestRateSlopeHigh: BigInt(
                        borrow_per_second_interest_rate_slope_high.toString()
                    ),
                });
            } else {
                marketConfiguration.baseTokenAddress = base_token;
                marketConfiguration.baseTokenDecimals = base_token_decimals;
                marketConfiguration.chainId = chainId;
                marketConfiguration.contractAddress = ctx.contractAddress;
                marketConfiguration.supplyKink = BigInt(supply_kink.toString());
                marketConfiguration.borrowKink = BigInt(borrow_kink.toString());
                marketConfiguration.supplyPerSecondInterestRateBase = BigInt(
                    supply_per_second_interest_rate_base.toString()
                );
                marketConfiguration.supplyPerSecondInterestRateSlopeLow = BigInt(
                    supply_per_second_interest_rate_slope_low.toString()
                );
                marketConfiguration.supplyPerSecondInterestRateSlopeHigh = BigInt(
                    supply_per_second_interest_rate_slope_high.toString()
                );
                marketConfiguration.borrowPerSecondInterestRateBase = BigInt(
                    borrow_per_second_interest_rate_base.toString()
                );
                marketConfiguration.borrowPerSecondInterestRateSlopeLow = BigInt(
                    borrow_per_second_interest_rate_slope_low.toString()
                );
                marketConfiguration.borrowPerSecondInterestRateSlopeHigh = BigInt(
                    borrow_per_second_interest_rate_slope_high.toString()
                );
            }

            await ctx.store.upsert(marketConfiguration);

            // Create pool if it doesn't exist
            const poolId = `${chainId}_${ctx.contractAddress}_${base_token}`;
            const pool = await ctx.store.get(Pool, poolId);

            if (!pool) {
                if (!ctx.transaction) throw new Error('No transaction found');
                if (!ctx.transaction.blockNumber) {
                    throw new Error('Transaction block number missing');
                }
                if (!ctx.transaction.time) throw new Error('Transaction time missing');

                const pool = new Pool({
                    id: poolId,
                    chainId: chainId,
                    creationBlockNumber: Number(ctx.transaction?.blockNumber),
                    creationTimestamp: DateTime.fromTai64(
                        ctx.transaction.time
                    ).toUnixSeconds(),
                    underlyingTokenAddress: base_token,
                    underlyingTokenSymbol: ASSET_ID_TO_SYMBOL[base_token],
                    receiptTokenAddress: '',
                    receiptTokenSymbol: '',
                    poolAddress: ctx.contractAddress,
                    poolType: 'supply_only',
                });

                await ctx.store.upsert(pool);
            }
        })
        .onLogCollateralAssetAdded(async (event, ctx) => {
            const {
                data: {
                    asset_id: { bits: asset_id },
                    configuration: { decimals, borrow_collateral_factor },
                },
            } = event;

            const chainId = CHAIN_ID_MAP[ctx.chainId as keyof typeof CHAIN_ID_MAP];
            const id = `${chainId}_${ctx.contractAddress}_${asset_id}`;

            let collateralConfiguration = await ctx.store.get(
                CollateralConfiguration,
                id
            );

            if (!collateralConfiguration) {
                collateralConfiguration = new CollateralConfiguration({
                    id,
                    chainId: chainId,
                    contractAddress: ctx.contractAddress,
                    assetAddress: asset_id,
                    decimals: decimals,
                });
            } else {
                throw new Error(
                    `Collateral configuration already exists for asset ${asset_id} on chain ${chainId}`
                );
            }

            await ctx.store.upsert(collateralConfiguration);

            // Create pool if it doesn't exist
            const poolId = `${chainId}_${ctx.contractAddress}_${asset_id}`;
            const pool = await ctx.store.get(Pool, poolId);

            if (!pool) {
                if (!ctx.transaction) throw new Error('No transaction found');
                if (!ctx.transaction.blockNumber) {
                    throw new Error('Transaction block number missing');
                }
                if (!ctx.transaction.time) throw new Error('Transaction time missing');

                const pool = new Pool({
                    id: poolId,
                    chainId: chainId,
                    creationBlockNumber: Number(ctx.transaction?.blockNumber),
                    creationTimestamp: DateTime.fromTai64(
                        ctx.transaction.time
                    ).toUnixSeconds(),
                    underlyingTokenAddress: asset_id,
                    underlyingTokenSymbol: ASSET_ID_TO_SYMBOL[asset_id],
                    receiptTokenAddress: '',
                    receiptTokenSymbol: '',
                    poolAddress: ctx.contractAddress,
                    poolType: 'collateral_only',
                });

                await ctx.store.upsert(pool);
            }

            // Collateral pool
            const collateralPoolId = `${chainId}_${ctx.contractAddress}_${asset_id}`;

            const poolSnapshot = new CollateralPool({
                id: collateralPoolId,
                chainId: chainId,
                poolAddress: ctx.contractAddress,
                underlyingTokenAddress: asset_id,
                underlyingTokenSymbol: ASSET_ID_TO_SYMBOL[asset_id],
                underlyingTokenPriceUsd: BigDecimal(0),
                availableAmount: 0n,
                availableAmountUsd: BigDecimal(0),
                suppliedAmount: 0n,
                suppliedAmountUsd: BigDecimal(0),
                collateralAmount: 0n,
                collateralAmountUsd: BigDecimal(0),
                collateralFactor: BigDecimal(
                    borrow_collateral_factor.toString()
                ).dividedBy(BigDecimal(FACTOR_SCALE_18.toString())),
                supplyIndex: 0n,
                supplyApr: 0n,
                borrowedAmount: 0n,
                borrowedAmountUsd: BigDecimal(0),
                borrowIndex: 0n,
                borrowApr: 0n,
                totalFeesUsd: BigDecimal(0),
                userFeesUsd: BigDecimal(0),
                protocolFeesUsd: BigDecimal(0),
            });

            await ctx.store.upsert(poolSnapshot);
        })
        .onLogCollateralAssetUpdated(async (event, ctx) => {
            const {
                data: {
                    asset_id: { bits: asset_id },
                    configuration: { decimals },
                },
            } = event;

            const chainId = CHAIN_ID_MAP[ctx.chainId as keyof typeof CHAIN_ID_MAP];
            const id = `${chainId}_${ctx.contractAddress}_${asset_id}`;

            let collateralConfiguration = await ctx.store.get(
                CollateralConfiguration,
                id
            );

            if (!collateralConfiguration) {
                throw new Error(
                    `Collateral configuration not found for asset ${asset_id} on chain ${chainId}`
                );
            }

            collateralConfiguration = new CollateralConfiguration({
                id,
                chainId: chainId,
                contractAddress: ctx.contractAddress,
                assetAddress: asset_id,
                decimals: decimals,
            });

            await ctx.store.upsert(collateralConfiguration);
        })
        .onLogUserBasicEvent(async (event, ctx) => {
            const {
                data: {
                    account,
                    user_basic: {
                        principal: { value, negative },
                    },
                },
            } = event;

            const valueNormalized = BigInt(value.toString()) - I256_INDENT;

            const address = (account.Address?.bits ?? account.ContractId?.bits)!;
            const chainId = CHAIN_ID_MAP[ctx.chainId as keyof typeof CHAIN_ID_MAP];
            const userBasicId = `${chainId}_${ctx.contractAddress}_${address}`;

            let userBasic = await ctx.store.get(UserBasic, userBasicId);

            if (!userBasic) {
                userBasic = new UserBasic({
                    id: userBasicId,
                    chainId: chainId,
                    contractAddress: ctx.contractAddress,
                    address: address,
                    principal: valueNormalized < 0 ? -valueNormalized : valueNormalized,
                    isNegative: valueNormalized < 0,
                });
            } else {
                userBasic.principal = valueNormalized < 0 ? -valueNormalized : valueNormalized;
                userBasic.isNegative = valueNormalized < 0;
            }

            await ctx.store.upsert(userBasic);
        })
        .onLogUserSupplyCollateralEvent(async (event, ctx) => {
            const {
                data: {
                    account,
                    asset_id: { bits: asset_id },
                    amount,
                },
            } = event;

            const address = (account.Address?.bits ?? account.ContractId?.bits)!;
            const chainId = CHAIN_ID_MAP[ctx.chainId as keyof typeof CHAIN_ID_MAP];

            const collateralConfigurationId = `${chainId}_${ctx.contractAddress}_${asset_id}`;
            const collateralConfiguration = await ctx.store.get(
                CollateralConfiguration,
                collateralConfigurationId
            );

            if (!collateralConfiguration) {
                throw new Error(
                    `Collateral configuration not found for asset ${asset_id} on chain ${chainId}`
                );
            }

            const id = `${chainId}_${ctx.contractAddress}_${address}_${asset_id}`;

            let collateralPosition = await ctx.store.get(CollateralPosition, id);

            if (!collateralPosition) {
                collateralPosition = new CollateralPosition({
                    id,
                    chainId: chainId,
                    poolAddress: ctx.contractAddress,
                    userAddress: address,
                    underlyingTokenAddress: collateralConfiguration.assetAddress,
                    underlyingTokenSymbol:
                        ASSET_ID_TO_SYMBOL[collateralConfiguration.assetAddress],
                    suppliedAmount: 0n,
                    suppliedAmountUsd: BigDecimal(0),
                    borrowedAmount: 0n,
                    borrowedAmountUsd: BigDecimal(0),
                    collateralAmount: BigInt(amount.toString()),
                    // BigInt(amount.toString()) /
                    // 10n ** BigInt(collateralConfiguration.decimals.toString()),
                });
            } else {
                collateralPosition.collateralAmount =
                    collateralPosition.collateralAmount + BigInt(amount.toString());
                // BigInt(amount.toString()) /
                // 10n ** BigInt(collateralConfiguration.decimals.toString());
            }

            await ctx.store.upsert(collateralPosition);

            // Collateral pool
            const collateralPoolId = `${chainId}_${ctx.contractAddress}_${collateralConfiguration.assetAddress}`;
            const collateralPool = await ctx.store.get(
                CollateralPool,
                collateralPoolId
            );

            if (!collateralPool) {
                throw new Error(
                    `Collateral pool not found for market ${ctx.contractAddress} on chain ${chainId}`
                );
            }

            collateralPool.collateralAmount =
                collateralPool.collateralAmount + BigInt(amount.toString());
            // BigInt(amount.toString()) /
            //   10n ** BigInt(collateralConfiguration.decimals.toString());

            await ctx.store.upsert(collateralPool);
        })
        .onLogUserWithdrawCollateralEvent(async (event, ctx) => {
            const {
                data: {
                    account,
                    asset_id: { bits: asset_id },
                    amount,
                },
            } = event;

            const address = (account.Address?.bits ?? account.ContractId?.bits)!;
            const chainId = CHAIN_ID_MAP[ctx.chainId as keyof typeof CHAIN_ID_MAP];

            const collateralConfigurationId = `${chainId}_${ctx.contractAddress}_${asset_id}`;
            const collateralConfiguration = await ctx.store.get(
                CollateralConfiguration,
                collateralConfigurationId
            );

            if (!collateralConfiguration) {
                throw new Error(
                    `Collateral configuration not found for asset ${asset_id} on chain ${chainId}`
                );
            }

            const id = `${chainId}_${ctx.contractAddress}_${address}_${asset_id}`;

            const collateralPosition = await ctx.store.get(CollateralPosition, id);

            if (!collateralPosition) {
                throw new Error(
                    `Collateral position (${id}) not found for user ${address} on chain ${chainId}`
                );
            }

            collateralPosition.collateralAmount =
                collateralPosition.collateralAmount - BigInt(amount.toString());
            // BigInt(amount.toString()) /
            //   10n ** BigInt(collateralConfiguration.decimals.toString());

            // If user withdraws all collatera
            await ctx.store.upsert(collateralPosition);

            // Collateral pool
            const collateralPoolId = `${chainId}_${ctx.contractAddress}_${collateralConfiguration.assetAddress}`;
            const collateralPool = await ctx.store.get(
                CollateralPool,
                collateralPoolId
            );

            if (!collateralPool) {
                throw new Error(
                    `Collateral pool not found for market ${ctx.contractAddress} on chain ${chainId}`
                );
            }

            collateralPool.collateralAmount =
                collateralPool.collateralAmount - BigInt(amount.toString());
            // BigInt(amount.toString()) /
            //   10n ** BigInt(collateralConfiguration.decimals.toString());

            await ctx.store.upsert(collateralPool);
        })
        .onLogAbsorbCollateralEvent(async (event, ctx) => {
            const {
                data: { account, asset_id, amount, decimals },
            } = event;

            // Collateral pool reduced for absorbed collateral
            const address = (account.Address?.bits ?? account.ContractId?.bits)!;
            const chainId = CHAIN_ID_MAP[ctx.chainId as keyof typeof CHAIN_ID_MAP];
            const collateralPoolId = `${chainId}_${ctx.contractAddress}_${asset_id}`;
            const collateralPool = await ctx.store.get(
                CollateralPool,
                collateralPoolId
            );

            if (!collateralPool) {
                throw new Error(
                    `Collateral pool not found for market ${ctx.contractAddress} on chain ${chainId}`
                );
            }

            collateralPool.collateralAmount =
                collateralPool.collateralAmount - BigInt(amount.toString());
            // BigInt(amount.toString()) / 10n ** BigInt(decimals.toString());

            await ctx.store.upsert(collateralPool);

            // Get collateral position
            const collateralPositionId = `${chainId}_${ctx.contractAddress}_${address}_${asset_id}`;
            const collateralPosition = await ctx.store.get(
                CollateralPosition,
                collateralPositionId
            );

            if (!collateralPosition) {
                throw new Error(
                    `Collateral position (${collateralPositionId}) not found for user ${address} on chain ${chainId}`
                );
            }

            collateralPosition.collateralAmount = 0n;

            await ctx.store.upsert(collateralPosition);
        })
        .onLogMarketBasicEvent(async (event, ctx) => {
            const {
                data: {
                    market_basic: {
                        last_accrual_time,
                        base_supply_index,
                        base_borrow_index,
                        total_supply_base,
                        total_borrow_base,
                    },
                },
            } = event;

            const chainId = CHAIN_ID_MAP[ctx.chainId as keyof typeof CHAIN_ID_MAP];

            const marketBasicId = `${chainId}_${ctx.contractAddress}`;
            let marketBasic = await ctx.store.get(MarketBasic, marketBasicId);

            if (!marketBasic) {
                marketBasic = new MarketBasic({
                    id: marketBasicId,
                    chainId: chainId,
                    contractAddress: ctx.contractAddress,
                    lastAccrualTime: BigInt(last_accrual_time.toString()),
                    baseSupplyIndex: BigInt(base_supply_index.toString()),
                    baseBorrowIndex: BigInt(base_borrow_index.toString()),
                    totalSupplyBase: BigInt(total_supply_base.toString()),
                    totalBorrowBase: BigInt(total_borrow_base.toString()),
                });
            } else {
                marketBasic.lastAccrualTime = BigInt(last_accrual_time.toString());
                marketBasic.baseSupplyIndex = BigInt(base_supply_index.toString());
                marketBasic.baseBorrowIndex = BigInt(base_borrow_index.toString());
                marketBasic.totalSupplyBase = BigInt(total_supply_base.toString());
                marketBasic.totalBorrowBase = BigInt(total_borrow_base.toString());
            }

            await ctx.store.upsert(marketBasic);
        })
        // Process only current market
        .onTimeInterval(
            async (_, ctx) => {
                // SHARED
                const START_TIME = dayjs(ctx.timestamp.getTime()).utc();
                const START_TIME_UNIX = START_TIME.unix();
                const START_TIME_FORMATED = START_TIME.format('YYYY-MM-DD HH:00:00');

                // BASE POOL SNAPSHOTS AND BASE POSITIONS SNAPSHOTS
                const pools = (
                    await ctx.store.list(Pool, [
                        { field: 'poolType', op: '=', value: 'supply_only' },
                        // { field: 'chainId', op: '=', value: 0 },
                        {
                            field: 'poolAddress',
                            op: '=',
                            value: ctx.contract.id.toB256(),
                        },
                    ])
                ).filter((val) => val.chainId === 0);

                if (pools.length !== 1) {
                    throw new Error(
                        `Only one pool should be found. Found: ${pools.length}`
                    );
                }

                const pool = pools[0];
                const marketConfigId = `${pool.chainId}_${pool.poolAddress}`;
                const marketBasic = await ctx.store.get(MarketBasic, marketConfigId);

                if (!marketBasic) {
                    throw new Error(
                        `Market basic not found for market ${pool.poolAddress} on chain ${pool.chainId}`
                    );
                }

                const marketConfiguration = await ctx.store.get(
                    MarketConfiguration,
                    marketConfigId
                );

                if (!marketConfiguration) {
                    throw new Error(
                        `Market configuration not found for market ${pool.poolAddress} on chain ${pool.chainId}`
                    );
                }

                const baseAssetPrice = await getPriceBySymbol(
                    ASSET_ID_TO_SYMBOL[pool.underlyingTokenAddress],
                    ctx.timestamp
                );

                if (!baseAssetPrice) {
                    console.error(
                        `No price found for ${ASSET_ID_TO_SYMBOL[pool.underlyingTokenAddress]} at ${ctx.timestamp}`
                    );
                }

                const basePrice = BigDecimal(baseAssetPrice ?? 0);

                const marketBasicsCall = ctx.contract.functions.get_market_basics();
                const marketBasicsRes = await marketBasicsCall.get();
                const marketBasicsWithInterestCall =
                    ctx.contract.functions.get_market_basics_with_interest();
                const marketBasicsWithInterestRes =
                    await marketBasicsWithInterestCall.get();

                ctx.eventLogger.emit('accrualTimes', {
                    marketBasicOnChain:
                        marketBasicsRes.value.last_accrual_time.toString() ?? 0,
                    marketBasicOnChainInterest:
                        marketBasicsWithInterestRes.value.last_accrual_time.toString() ?? 0,
                    marketBasicLocal: marketBasic.lastAccrualTime ?? 0,
                    currentTimeForCalculation: BigInt(
                        DateTime.fromUnixSeconds(START_TIME_UNIX).toTai64()
                    ),
                });

                ctx.eventLogger.emit('marketBasicDebug', {
                    baseBorrowIndex: marketBasic?.baseBorrowIndex ?? 0,
                    totalBorrowBase: marketBasic?.totalBorrowBase ?? 0,
                    totalSupplyIndex: marketBasic?.baseSupplyIndex ?? 0,
                    totalSupplyBase: marketBasic?.totalSupplyBase ?? 0,
                    postAccrue: 'no',
                    //borrow
                    baseBorrowIndexGetFunc: marketBasicsRes.value.base_borrow_index,
                    totalBorrowBaseGetFunc: marketBasicsRes.value.total_borrow_base,
                    baseBorrowIndexWithInterestGetFunc:
                        marketBasicsWithInterestRes.value.base_borrow_index,
                    totalBorrowBaseWithInterestGetFunc:
                        marketBasicsWithInterestRes.value.total_borrow_base,
                    //supply
                    baseSupplyIndexGetFunc: marketBasicsRes.value.base_supply_index,
                    totalSupplyBaseGetFunc: marketBasicsRes.value.total_supply_base,
                    baseSupplyIndexWithInterestGetFunc:
                        marketBasicsWithInterestRes.value.base_supply_index,
                    totalSupplyBaseWithInterestGetFunc:
                        marketBasicsWithInterestRes.value.total_supply_base,
                    last_accrual_timeGetFunc: marketBasicsRes.value.last_accrual_time,
                });

                // Accrue interest
                const now = BigInt(DateTime.fromUnixSeconds(START_TIME_UNIX).toTai64());

                // Need to convert timestamp to Tai64 format
                const timeElapsed = now - marketBasic.lastAccrualTime;

                if (timeElapsed > 0n) {
                    if (marketBasic.lastAccrualTime !== 0n) {
                        const baseSupplyIndex = marketBasic.baseSupplyIndex;
                        const baseBorrowIndex = marketBasic.baseBorrowIndex;

                        const utilization = getUtilization(
                            marketBasic.totalSupplyBase,
                            marketBasic.totalBorrowBase,
                            baseSupplyIndex,
                            baseBorrowIndex
                        );

                        const supplyRate = getSupplyRate(marketConfiguration, utilization);
                        const borrowRate = getBorrowRate(marketConfiguration, utilization);

                        const baseSupplyIndexDelta =
                            (baseSupplyIndex * supplyRate * timeElapsed) / FACTOR_SCALE_18;

                        const baseBorrowIndexDelta =
                            (baseBorrowIndex * borrowRate * timeElapsed) / FACTOR_SCALE_18;

                        marketBasic.baseSupplyIndex =
                            baseSupplyIndex + baseSupplyIndexDelta;
                        marketBasic.baseBorrowIndex =
                            baseBorrowIndex + baseBorrowIndexDelta;

                        const utilizationCall = ctx.contract.functions.get_utilization()
                        const utilizationRes = await utilizationCall.get()

                        const supplyRateCall = ctx.contract.functions.get_supply_rate(utilizationRes.value)
                        const supplyRateRes = await supplyRateCall.get()

                        const borrowRateCall = ctx.contract.functions.get_borrow_rate(utilizationRes.value)
                        const borrowRateRes = await borrowRateCall.get()

                        ctx.eventLogger.emit("OnTimeIntervalAccureDebug", {
                            utilization,
                            utilizationGetFunction: utilizationRes.value.toString(),
                            supplyRate,
                            supplyRateGetFunction: supplyRateRes.value.toString(),
                            borrowRate,
                            borrowRateGetFunction: borrowRateRes.value.toString()
                        })

                    }

                    marketBasic.lastAccrualTime = now
                }

                // Only handle events from the current market (contract)
                const userBasics = (
                    await ctx.store.list(UserBasic, [
                        // { field: 'chainId', op: '=', value: 0 },
                        {
                            field: 'contractAddress',
                            op: '=',
                            value: marketBasic.contractAddress,
                        },
                    ])
                ).filter((val) => val.chainId === 0);

                for (const userBasic of userBasics) {
                    const basePositionSnapshotId = `${userBasic.chainId}_${userBasic.contractAddress}_${marketConfiguration.baseTokenAddress}_${userBasic.address}`;

                    const presentValue = getPresentValue(
                        userBasic.principal,
                        userBasic.isNegative
                            ? marketBasic.baseBorrowIndex
                            : marketBasic.baseSupplyIndex
                    );
                    // /
                    // 10n ** BigInt(marketConfiguration.baseTokenDecimals);

                    let basePositionSnapshot = await ctx.store.get(
                        BasePositionSnapshot,
                        basePositionSnapshotId
                    );

                    const suppliedAmount = userBasic.isNegative ? 0n : presentValue;

                    const borrowedAmount = userBasic.isNegative ? presentValue : 0n;

                    // Create base position snapshot if it doesn't exist
                    if (!basePositionSnapshot) {
                        const underlyingTokenAddress = marketConfiguration.baseTokenAddress;

                        basePositionSnapshot = new BasePositionSnapshot({
                            id: basePositionSnapshotId,
                            timestamp: START_TIME_UNIX,
                            blockDate: START_TIME_FORMATED,
                            chainId: 0,
                            poolAddress: userBasic.contractAddress,
                            underlyingTokenAddress: underlyingTokenAddress,
                            underlyingTokenSymbol: ASSET_ID_TO_SYMBOL[underlyingTokenAddress],
                            userAddress: userBasic.address,
                            suppliedAmount: suppliedAmount,
                            suppliedAmountUsd: BigDecimal(suppliedAmount.toString()).times(
                                basePrice
                            ),
                            borrowedAmount: borrowedAmount,
                            borrowedAmountUsd: BigDecimal(borrowedAmount.toString()).times(
                                basePrice
                            ),
                            collateralAmount: 0n,
                            collateralAmountUsd: BigDecimal(0),
                        });
                    } else {
                        basePositionSnapshot.timestamp = START_TIME_UNIX;
                        basePositionSnapshot.blockDate = START_TIME_FORMATED;
                        basePositionSnapshot.suppliedAmount = suppliedAmount;
                        basePositionSnapshot.suppliedAmountUsd = BigDecimal(
                            suppliedAmount.toString()
                        ).times(basePrice);
                        basePositionSnapshot.borrowedAmount = borrowedAmount;
                        basePositionSnapshot.borrowedAmountUsd = BigDecimal(
                            borrowedAmount.toString()
                        ).times(basePrice);
                    }

                    await ctx.store.upsert(basePositionSnapshot);
                }

                // Create BasePoolSnapshot
                const underlyingTokenAddress = marketConfiguration.baseTokenAddress;

                // Create BasePoolSnapshot
                const basePoolSnapshotId = `${marketBasic.chainId}_${marketBasic.contractAddress}_${underlyingTokenAddress}`;
                let basePoolSnapshot = await ctx.store.get(
                    BasePoolSnapshot,
                    basePoolSnapshotId
                );

                // const totalSupplyBase =
                //   getPresentValue(
                //     marketBasic.totalSupplyBase,
                //     marketBasic.baseSupplyIndex
                //   ) /
                //   10n ** BigInt(marketConfiguration.baseTokenDecimals);
                const totalSupplyBase = getPresentValue(
                    marketBasic.totalSupplyBase,
                    marketBasic.baseSupplyIndex
                );

                // const totalBorrowBase =
                //   getPresentValue(
                //     marketBasic.totalBorrowBase,
                //     marketBasic.baseBorrowIndex
                //   ) /
                //   10n ** BigInt(marketConfiguration.baseTokenDecimals);

                const totalBorrowBase = getPresentValue(
                    marketBasic.totalBorrowBase,
                    marketBasic.baseBorrowIndex
                );

                ctx.eventLogger.emit('marketBasicDebug', {
                    baseBorrowIndex: marketBasic?.baseBorrowIndex ?? 0,
                    totalBorrowBase: totalBorrowBase,
                    totalSupplyIndex: marketBasic?.baseSupplyIndex ?? 0,
                    totalSupplyBase: totalSupplyBase,
                    postAccrue: 'yes',
                    //borrow
                    baseBorrowIndexGetFunc: marketBasicsRes.value.base_borrow_index,
                    totalBorrowBaseGetFunc: marketBasicsRes.value.total_borrow_base,
                    baseBorrowIndexWithInterestGetFunc:
                        marketBasicsWithInterestRes.value.base_borrow_index,
                    totalBorrowBaseWithInterestGetFunc:
                        marketBasicsWithInterestRes.value.total_borrow_base,
                    //supply
                    baseSupplyIndexGetFunc: marketBasicsRes.value.base_supply_index,
                    totalSupplyBaseGetFunc: marketBasicsRes.value.total_supply_base,
                    baseSupplyIndexWithInterestGetFunc:
                        marketBasicsWithInterestRes.value.base_supply_index,
                    totalSupplyBaseWithInterestGetFunc:
                        marketBasicsWithInterestRes.value.total_supply_base,
                    last_accrual_timeGetFunc: marketBasicsRes.value.last_accrual_time,
                });

                const utilization = getUtilization(
                    totalSupplyBase,
                    totalBorrowBase,
                    marketBasic.baseSupplyIndex,
                    marketBasic.baseBorrowIndex
                );

                const supplyRate = getSupplyRate(marketConfiguration, utilization);
                const borrowRate = getBorrowRate(marketConfiguration, utilization);
                const supplyApr = getApr(supplyRate);
                const borrowApr = getApr(borrowRate);

                if (!basePoolSnapshot) {
                    basePoolSnapshot = new BasePoolSnapshot({
                        id: basePoolSnapshotId,
                        timestamp: START_TIME_UNIX,
                        blockDate: START_TIME_FORMATED,
                        chainId: 0,
                        poolAddress: marketBasic.contractAddress,
                        underlyingTokenAddress: underlyingTokenAddress,
                        underlyingTokenSymbol: ASSET_ID_TO_SYMBOL[underlyingTokenAddress],
                        underlyingTokenPriceUsd: basePrice,
                        availableAmount: totalSupplyBase - totalBorrowBase,
                        availableAmountUsd: BigDecimal(
                            (totalSupplyBase - totalBorrowBase).toString()
                        ).times(basePrice),

                        suppliedAmount: totalSupplyBase,
                        suppliedAmountUsd: BigDecimal(totalSupplyBase.toString()).times(
                            basePrice
                        ),
                        collateralAmount: 0n,
                        collateralAmountUsd: BigDecimal(0),
                        collateralFactor: BigDecimal(0),
                        supplyIndex: marketBasic.baseSupplyIndex / FACTOR_SCALE_15,
                        supplyApr: supplyApr,
                        borrowedAmount: totalBorrowBase,
                        borrowedAmountUsd: BigDecimal(totalBorrowBase.toString()).times(
                            basePrice
                        ),
                        borrowIndex: marketBasic.baseBorrowIndex / FACTOR_SCALE_15,
                        borrowApr: borrowApr,
                        totalFeesUsd: BigDecimal(0),
                        userFeesUsd: BigDecimal(0),
                        protocolFeesUsd: BigDecimal(0),
                    });
                } else {
                    basePoolSnapshot.timestamp = START_TIME_UNIX;
                    basePoolSnapshot.blockDate = START_TIME_FORMATED;
                    basePoolSnapshot.availableAmount = totalSupplyBase - totalBorrowBase;
                    basePoolSnapshot.availableAmountUsd = BigDecimal(
                        (totalSupplyBase - totalBorrowBase).toString()
                    ).times(basePrice);
                    basePoolSnapshot.borrowedAmount = totalBorrowBase;
                    basePoolSnapshot.suppliedAmount = totalSupplyBase;
                    basePoolSnapshot.supplyIndex =
                        marketBasic.baseSupplyIndex / FACTOR_SCALE_15;
                    basePoolSnapshot.borrowIndex =
                        marketBasic.baseBorrowIndex / FACTOR_SCALE_15;
                    basePoolSnapshot.supplyApr = supplyApr;
                    basePoolSnapshot.borrowApr = borrowApr;
                    basePoolSnapshot.suppliedAmountUsd = BigDecimal(
                        totalSupplyBase.toString()
                    ).times(basePrice);
                    basePoolSnapshot.borrowedAmountUsd = BigDecimal(
                        totalBorrowBase.toString()
                    ).times(basePrice);
                    basePoolSnapshot.borrowApr = borrowApr;
                }

                await ctx.store.upsert(basePoolSnapshot);

                // COLLATERAL POOL SNAPSHOTS AND COLLATERAL POSITIONS SNAPSHOTS
                const collateralPools = (
                    await ctx.store.list(CollateralPool, [
                        {
                            field: 'poolAddress',
                            op: '=',
                            value: ctx.contract.id.toB256(),
                        },
                    ])
                ).filter((val) => val.chainId === 0);

                const collateralPrices = new Map<string, BigDecimal>();

                for (const collateralPool of collateralPools) {
                    const collateralPrice = await getPriceBySymbol(
                        ASSET_ID_TO_SYMBOL[collateralPool.underlyingTokenAddress],
                        ctx.timestamp
                    );

                    if (!collateralPrice) {
                        console.error(
                            `No price found for ${ASSET_ID_TO_SYMBOL[collateralPool.underlyingTokenAddress]} at ${ctx.timestamp}`
                        );
                    }

                    collateralPrices.set(
                        collateralPool.underlyingTokenAddress,
                        BigDecimal(collateralPrice ?? 0)
                    );
                }

                // Create CollateralPoolSnapshots
                const processCollateralPoolSnapshotsPromises = collateralPools.map(
                    async (collateralPool) => {
                        const collateralPoolSnapshotId = `${collateralPool.chainId}_${collateralPool.poolAddress}_${collateralPool.underlyingTokenAddress}`;

                        let collateralPoolSnapshot = await ctx.store.get(
                            CollateralPoolSnapshot,
                            collateralPoolSnapshotId
                        );

                        if (!collateralPoolSnapshot) {
                            collateralPoolSnapshot = new CollateralPoolSnapshot({
                                ...collateralPool,
                                timestamp: START_TIME_UNIX,
                                blockDate: START_TIME_FORMATED,
                                underlyingTokenPriceUsd: collateralPrices.get(
                                    collateralPool.underlyingTokenAddress
                                ),
                                collateralAmountUsd: BigDecimal(
                                    collateralPool.collateralAmount.toString()
                                ).times(
                                    collateralPrices.get(collateralPool.underlyingTokenAddress)!
                                ),
                            });
                        } else {
                            collateralPoolSnapshot.timestamp = START_TIME_UNIX;
                            collateralPoolSnapshot.blockDate = START_TIME_FORMATED;
                            collateralPoolSnapshot.availableAmount =
                                collateralPool.availableAmount;
                            collateralPoolSnapshot.collateralAmount =
                                collateralPool.collateralAmount;
                            collateralPoolSnapshot.collateralFactor =
                                collateralPool.collateralFactor;
                            collateralPoolSnapshot.underlyingTokenPriceUsd =
                                collateralPrices.get(collateralPool.underlyingTokenAddress);
                            collateralPoolSnapshot.collateralAmountUsd = BigDecimal(
                                collateralPool.collateralAmount.toString()
                            ).times(
                                collateralPrices.get(collateralPool.underlyingTokenAddress)!
                            );
                        }

                        await ctx.store.upsert(collateralPoolSnapshot);
                    }
                );

                await Promise.all(processCollateralPoolSnapshotsPromises);

                // Create CollateralPositionSnapshots
                const collateralPositions = (
                    await ctx.store.list(CollateralPosition, [
                        {
                            field: 'poolAddress',
                            op: '=',
                            value: ctx.contract.id.toB256(),
                        },
                    ])
                ).filter((val) => val.chainId === 0);

                const processCollateralPositionSnapshotsPromises =
                    collateralPositions.map(async (collateralPosition) => {
                        const collateralPositionSnapshotId = `${collateralPosition.chainId}_${collateralPosition.poolAddress}_${collateralPosition.underlyingTokenAddress}_${collateralPosition.userAddress}`;

                        let collateralPositionSnapshot = await ctx.store.get(
                            CollateralPositionSnapshot,
                            collateralPositionSnapshotId
                        );

                        if (!collateralPositionSnapshot) {
                            collateralPositionSnapshot = new CollateralPositionSnapshot({
                                ...collateralPosition,
                                timestamp: START_TIME_UNIX,
                                blockDate: START_TIME_FORMATED,
                                collateralAmountUsd: BigDecimal(
                                    collateralPosition.collateralAmount.toString()
                                ).times(
                                    collateralPrices.get(
                                        collateralPosition.underlyingTokenAddress!
                                    )!
                                ),
                            });
                        } else {
                            collateralPositionSnapshot.timestamp = START_TIME_UNIX;
                            collateralPositionSnapshot.blockDate = START_TIME_FORMATED;

                            collateralPositionSnapshot.collateralAmount =
                                collateralPosition.collateralAmount;
                            collateralPositionSnapshot.collateralAmountUsd = BigDecimal(
                                collateralPosition.collateralAmount.toString()
                            ).times(
                                collateralPrices.get(collateralPosition.underlyingTokenAddress)!
                            );
                        }

                        await ctx.store.upsert(collateralPositionSnapshot);
                    });

                await Promise.all(processCollateralPositionSnapshotsPromises);
            },
            5,
            60
        );
});
