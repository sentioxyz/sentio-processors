import { GLOBAL_CONFIG } from '@sentio/runtime';
import { BigDecimal } from '@sentio/sdk';
import { FuelNetwork } from '@sentio/sdk/fuel';
import { getPriceBySymbol } from '@sentio/sdk/utils';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc.js';
import { DateTime } from 'fuels';
import { appConfig } from './configs/index.js';
import {
  BasePool,
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

const getApr = (rate: bigint): BigDecimal => {
  return rate
    .asBigDecimal()
    .times(SECONDS_PER_YEAR.asBigDecimal())
    .times(100)
    .dividedBy(FACTOR_SCALE_18.asBigDecimal());
};

const getPresentValue = (principal: bigint, index: bigint): bigint => {
  return (principal * index) / FACTOR_SCALE_15;
};

const getPresentValueWithScale = (principal: bigint, index: bigint): bigint => {
  return principal * index;
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
  fuel_mainnet: 9889,
};

GLOBAL_CONFIG.execution = {
  sequential: true,
};

Object.values(appConfig.markets).forEach(({ marketAddress, startBlock }) => {
  MarketProcessor.bind({
    chainId:
      appConfig.env === 'testnet' ? FuelNetwork.TEST_NET : FuelNetwork.MAIN_NET,
    address: marketAddress,
    startBlock: startBlock,
  })
    .onLogMarketConfigurationEvent(async (event, ctx) => {
      if (ctx.transaction?.isStatusFailure) {
        return;
      }

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
          underlyingTokenSymbol: appConfig.assets[base_token],
          receiptTokenAddress: '',
          receiptTokenSymbol: '',
          poolAddress: ctx.contractAddress,
          poolType: 'supply_only',
        });

        await ctx.store.upsert(pool);
      }
    })
    .onLogCollateralAssetAdded(async (event, ctx) => {
      if (ctx.transaction?.isStatusFailure) {
        return;
      }

      const {
        data: {
          asset_id: { bits: asset_id },
          configuration: {
            decimals,
            borrow_collateral_factor,
            liquidate_collateral_factor,
          },
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
          underlyingTokenSymbol: appConfig.assets[asset_id],
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
        underlyingTokenSymbol: appConfig.assets[asset_id],
        underlyingTokenPriceUsd: BigDecimal(0),
        availableAmount: 0n,
        availableAmountUsd: BigDecimal(0),
        suppliedAmount: 0n,
        suppliedAmountUsd: BigDecimal(0),
        collateralAmount: 0n,
        collateralAmountUsd: BigDecimal(0),
        collateralFactor: BigDecimal(
          borrow_collateral_factor.toString()
        ).dividedBy(FACTOR_SCALE_18.asBigDecimal()),
        liquidationFactor: BigDecimal(
          liquidate_collateral_factor.toString()
        ).dividedBy(FACTOR_SCALE_18.asBigDecimal()),
        supplyIndex: BigDecimal(0),
        supplyApr: BigDecimal(0),
        borrowedAmount: 0n,
        borrowedAmountUsd: BigDecimal(0),
        borrowIndex: BigDecimal(0),
        borrowApr: BigDecimal(0),
        totalFeesUsd: BigDecimal(0),
        userFeesUsd: BigDecimal(0),
        protocolFeesUsd: BigDecimal(0),
      });

      await ctx.store.upsert(poolSnapshot);
    })
    .onLogCollateralAssetUpdated(async (event, ctx) => {
      if (ctx.transaction?.isStatusFailure) {
        return;
      }

      const {
        data: {
          asset_id: { bits: asset_id },
          configuration: { decimals }, // TODO: Update other field
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
      if (ctx.transaction?.isStatusFailure) {
        return;
      }

      const {
        data: {
          account,
          user_basic: {
            principal: { underlying },
          },
        },
      } = event;

      const value = BigInt(underlying.toString()) - I256_INDENT;

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
          principal: value < 0 ? -value : value,
          isNegative: value < 0,
        });
      } else {
        userBasic.principal = value < 0 ? -value : value;
        userBasic.isNegative = value < 0;
      }

      await ctx.store.upsert(userBasic);
    })
    .onLogUserSupplyCollateralEvent(async (event, ctx) => {
      if (ctx.transaction?.isStatusFailure) {
        return;
      }

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

      // Collateral price
      const collateralPrice = await getPriceBySymbol(
        appConfig.assets[asset_id],
        ctx.timestamp
      );

      if (!collateralPrice) {
        throw new Error(`No price found for ${asset_id} at ${ctx.timestamp}`);
      }

      let collateralPosition = await ctx.store.get(CollateralPosition, id);

      if (!collateralPosition) {
        collateralPosition = new CollateralPosition({
          id,
          chainId: chainId,
          poolAddress: ctx.contractAddress,
          userAddress: address,
          underlyingTokenAddress: collateralConfiguration.assetAddress,
          underlyingTokenSymbol:
            appConfig.assets[collateralConfiguration.assetAddress],
          suppliedAmount: 0n,
          suppliedAmountNormalized: BigDecimal(0),
          suppliedAmountUsd: BigDecimal(0),
          borrowedAmount: 0n,
          borrowedAmountNormalized: BigDecimal(0),
          borrowedAmountUsd: BigDecimal(0),
          collateralAmount: BigInt(amount.toString()),
          collateralAmountNormalized: BigDecimal(amount.toString()).dividedBy(
            BigDecimal(10).pow(collateralConfiguration.decimals)
          ),
          collateralAmountUsd: BigDecimal(amount.toString())
            .dividedBy(BigDecimal(10).pow(collateralConfiguration.decimals))
            .times(BigDecimal(collateralPrice)),
        });
      } else {
        const newCollateralAmount =
          collateralPosition.collateralAmount + BigInt(amount.toString());
        collateralPosition.collateralAmount = newCollateralAmount;
        collateralPosition.collateralAmountNormalized = newCollateralAmount
          .asBigDecimal()
          .dividedBy(BigDecimal(10).pow(collateralConfiguration.decimals));
        collateralPosition.collateralAmountUsd = newCollateralAmount
          .asBigDecimal()
          .dividedBy(BigDecimal(10).pow(collateralConfiguration.decimals))
          .times(BigDecimal(collateralPrice));
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
      collateralPool.collateralAmountNormalized =
        collateralPool.collateralAmount
          .asBigDecimal()
          .dividedBy(BigDecimal(10).pow(collateralConfiguration.decimals));
      collateralPool.collateralAmountUsd = collateralPool.collateralAmount
        .asBigDecimal()
        .dividedBy(BigDecimal(10).pow(collateralConfiguration.decimals))
        .times(BigDecimal(collateralPrice));

      await ctx.store.upsert(collateralPool);
    })
    .onLogUserWithdrawCollateralEvent(async (event, ctx) => {
      if (ctx.transaction?.isStatusFailure) {
        return;
      }

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

      // Collateral price
      const collateralPrice = await getPriceBySymbol(
        appConfig.assets[asset_id],
        ctx.timestamp
      );

      if (!collateralPrice) {
        throw new Error(`No price found for ${asset_id} at ${ctx.timestamp}`);
      }

      const newCollateralAmount =
        collateralPosition.collateralAmount - BigInt(amount.toString());
      collateralPosition.collateralAmount = newCollateralAmount;
      collateralPosition.collateralAmountNormalized = newCollateralAmount
        .asBigDecimal()
        .dividedBy(BigDecimal(10).pow(collateralConfiguration.decimals));
      collateralPosition.collateralAmountUsd = newCollateralAmount
        .asBigDecimal()
        .dividedBy(BigDecimal(10).pow(collateralConfiguration.decimals))
        .times(collateralPrice);

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
      collateralPool.collateralAmountNormalized =
        collateralPool.collateralAmount
          .asBigDecimal()
          .dividedBy(BigDecimal(10).pow(collateralConfiguration.decimals));
      collateralPool.collateralAmountUsd = collateralPool.collateralAmount
        .asBigDecimal()
        .dividedBy(BigDecimal(10).pow(collateralConfiguration.decimals))
        .times(collateralPrice);

      await ctx.store.upsert(collateralPool);
    })
    .onLogAbsorbCollateralEvent(async (event, ctx) => {
      if (ctx.transaction?.isStatusFailure) {
        return;
      }

      const {
        data: {
          account,
          asset_id: { bits: asset_id },
          amount,
          decimals,
        },
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

      // Collateral price
      const collateralPrice = await getPriceBySymbol(
        appConfig.assets[asset_id],
        ctx.timestamp
      );

      if (!collateralPrice) {
        throw new Error(`No price found for ${asset_id} at ${ctx.timestamp}`);
      }

      collateralPool.collateralAmount =
        collateralPool.collateralAmount - BigInt(amount.toString());
      collateralPool.collateralAmountNormalized =
        collateralPool.collateralAmount
          .asBigDecimal()
          .dividedBy(BigDecimal(10).pow(collateralConfiguration.decimals));
      collateralPool.collateralAmountUsd = collateralPool.collateralAmount
        .asBigDecimal()
        .dividedBy(BigDecimal(10).pow(collateralConfiguration.decimals))
        .times(collateralPrice);

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
      collateralPosition.collateralAmountNormalized = BigDecimal(0);
      collateralPosition.collateralAmountUsd = BigDecimal(0);

      await ctx.store.upsert(collateralPosition);
    })
    .onLogMarketBasicEvent(async (event, ctx) => {
      if (ctx.transaction?.isStatusFailure) {
        return;
      }

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

      // Pool
      const pools = (
        await ctx.store.list(Pool, [
          { field: 'poolType', op: '=', value: 'supply_only' },
          {
            field: 'poolAddress',
            op: '=',
            value: ctx.contractAddress,
          },
        ])
      ).filter((val) => val.chainId === chainId);

      if (pools.length !== 1) {
        console.error(
          `Exactly one pool should be found. Found: ${pools.length}`
        );
        return;
      }

      const pool = pools[0];

      // Base pool
      const basePoolId = `${chainId}_${ctx.contractAddress}`;
      let basePool = await ctx.store.get(BasePool, basePoolId);

      // Get market configuration
      const marketConfigId = `${chainId}_${ctx.contractAddress}`;
      const marketConfiguration = await ctx.store.get(
        MarketConfiguration,
        marketConfigId
      );

      if (!marketConfiguration) {
        throw new Error(
          `Market configuration not found for market ${ctx.contractAddress} on chain ${chainId}`
        );
      }

      // Get base asset price
      const baseAssetPrice = await getPriceBySymbol(
        appConfig.assets[pool.underlyingTokenAddress],
        ctx.timestamp
      );

      if (!baseAssetPrice) {
        console.error(
          `No price found for ${appConfig.assets[pool.underlyingTokenAddress]} at ${ctx.timestamp}`
        );
      }

      const basePrice = BigDecimal(baseAssetPrice ?? 0);

      const suppliedAmountNormalized = BigDecimal(
        total_supply_base.toString()
      ).dividedBy(BigDecimal(10).pow(marketConfiguration.baseTokenDecimals));

      const borrowedAmountNormalized = BigDecimal(
        total_borrow_base.toString()
      ).dividedBy(BigDecimal(10).pow(marketConfiguration.baseTokenDecimals));

      const utilization = getUtilization(
        BigInt(total_supply_base.toString()),
        BigInt(total_borrow_base.toString()),
        marketBasic.baseSupplyIndex,
        marketBasic.baseBorrowIndex
      );

      const supplyRate = getSupplyRate(marketConfiguration, utilization);
      const borrowRate = getBorrowRate(marketConfiguration, utilization);
      const supplyApr = getApr(supplyRate);
      const borrowApr = getApr(borrowRate);

      if (!basePool) {
        basePool = new BasePool({
          id: basePoolId,
          chainId: chainId,
          poolAddress: ctx.contractAddress,
          suppliedAmount: BigInt(total_supply_base.toString()),
          suppliedAmountNormalized: suppliedAmountNormalized,
          suppliedAmountUsd: suppliedAmountNormalized.times(basePrice),
          supplyApr: supplyApr,
          borrowedAmount: BigInt(total_borrow_base.toString()),
          borrowedAmountNormalized: borrowedAmountNormalized,
          borrowedAmountUsd: borrowedAmountNormalized.times(basePrice),
          borrowApr: borrowApr,
        });
      } else {
        basePool.suppliedAmount = BigInt(total_supply_base.toString());
        basePool.suppliedAmountNormalized = suppliedAmountNormalized;
        basePool.suppliedAmountUsd = suppliedAmountNormalized.times(basePrice);
        basePool.supplyApr = supplyApr;
        basePool.borrowedAmount = BigInt(total_borrow_base.toString());
        basePool.borrowedAmountNormalized = borrowedAmountNormalized;
        basePool.borrowedAmountUsd = borrowedAmountNormalized.times(basePrice);
        basePool.borrowApr = borrowApr;
      }

      await ctx.store.upsert(basePool);
    })
    // Process only current market
    .onTimeInterval(
      async (_, ctx) => {
        // SHARED
        const START_TIME = dayjs(ctx.timestamp.getTime()).utc();
        const START_TIME_UNIX = START_TIME.unix();
        const START_TIME_FORMATED = START_TIME.format('YYYY-MM-DD HH:00:00');
        const chainId = CHAIN_ID_MAP[ctx.chainId as keyof typeof CHAIN_ID_MAP];

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
        ).filter((val) => val.chainId === chainId);

        if (pools.length !== 1) {
          console.error(
            `Exactly one pool should be found. Found: ${pools.length}`
          );
          return;
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
          appConfig.assets[pool.underlyingTokenAddress],
          ctx.timestamp
        );

        if (!baseAssetPrice) {
          console.error(
            `No price found for ${appConfig.assets[pool.underlyingTokenAddress]} at ${ctx.timestamp}`
          );
        }

        const basePrice = BigDecimal(baseAssetPrice ?? 0);

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
          }

          marketBasic.lastAccrualTime = now;
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
        ).filter((val) => val.chainId === chainId);

        for (const userBasic of userBasics) {
          const basePositionSnapshotId = `${userBasic.chainId}_${userBasic.contractAddress}_${marketConfiguration.baseTokenAddress}_${userBasic.address}`;

          const presentValue = getPresentValueWithScale(
            userBasic.principal,
            userBasic.isNegative
              ? marketBasic.baseBorrowIndex
              : marketBasic.baseSupplyIndex
          );

          const presentValueNormalized = BigDecimal(presentValue.toString())
            .dividedBy(FACTOR_SCALE_15.asBigDecimal())
            .dividedBy(
              BigDecimal(10).pow(marketConfiguration.baseTokenDecimals)
            );

          let basePositionSnapshot = await ctx.store.get(
            BasePositionSnapshot,
            basePositionSnapshotId
          );

          const suppliedAmount = userBasic.isNegative ? 0n : presentValue;
          const suppliedAmountNormalized = userBasic.isNegative
            ? BigDecimal(0)
            : presentValueNormalized;

          const borrowedAmount = userBasic.isNegative ? presentValue : 0n;
          const borrowedAmountNormalized = userBasic.isNegative
            ? presentValueNormalized
            : BigDecimal(0);

          // Create base position snapshot if it doesn't exist
          if (!basePositionSnapshot) {
            const underlyingTokenAddress = marketConfiguration.baseTokenAddress;

            basePositionSnapshot = new BasePositionSnapshot({
              id: basePositionSnapshotId,
              timestamp: START_TIME_UNIX,
              blockDate: START_TIME_FORMATED,
              chainId: chainId,
              poolAddress: userBasic.contractAddress,
              underlyingTokenAddress: underlyingTokenAddress,
              underlyingTokenSymbol: appConfig.assets[underlyingTokenAddress],
              userAddress: userBasic.address,
              suppliedAmount: suppliedAmount,
              suppliedAmountNormalized: suppliedAmountNormalized,
              suppliedAmountUsd: suppliedAmountNormalized.times(basePrice),
              borrowedAmount: borrowedAmount,
              borrowedAmountNormalized: borrowedAmountNormalized,
              borrowedAmountUsd: borrowedAmountNormalized.times(basePrice),
              collateralAmount: 0n,
              collateralAmountNormalized: BigDecimal(0),
              collateralAmountUsd: BigDecimal(0),
            });
          } else {
            basePositionSnapshot.timestamp = START_TIME_UNIX;
            basePositionSnapshot.blockDate = START_TIME_FORMATED;
            basePositionSnapshot.suppliedAmount = suppliedAmount;
            basePositionSnapshot.suppliedAmountNormalized =
              suppliedAmountNormalized;
            basePositionSnapshot.suppliedAmountUsd =
              suppliedAmountNormalized.times(basePrice);
            basePositionSnapshot.borrowedAmount = borrowedAmount;
            basePositionSnapshot.borrowedAmountNormalized =
              borrowedAmountNormalized;
            basePositionSnapshot.borrowedAmountUsd =
              borrowedAmountNormalized.times(basePrice);
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

        const totalSupplyBase = getPresentValueWithScale(
          marketBasic.totalSupplyBase,
          marketBasic.baseSupplyIndex
        );

        const totalSupplyBaseNormalized = totalSupplyBase
          .asBigDecimal()
          .dividedBy(FACTOR_SCALE_15.asBigDecimal())
          .dividedBy(BigDecimal(10).pow(marketConfiguration.baseTokenDecimals));

        const totalBorrowBase = getPresentValueWithScale(
          marketBasic.totalBorrowBase,
          marketBasic.baseBorrowIndex
        );

        const totalBorrowBaseNormalized = totalBorrowBase
          .asBigDecimal()
          .dividedBy(FACTOR_SCALE_15.asBigDecimal())
          .dividedBy(BigDecimal(10).pow(marketConfiguration.baseTokenDecimals));

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
            chainId: chainId,
            poolAddress: marketBasic.contractAddress,
            underlyingTokenAddress: underlyingTokenAddress,
            underlyingTokenSymbol: appConfig.assets[underlyingTokenAddress],
            underlyingTokenPriceUsd: basePrice,
            availableAmount: totalSupplyBase - totalBorrowBase,
            availableAmountNormalized: totalSupplyBaseNormalized.minus(
              totalBorrowBaseNormalized
            ),
            availableAmountUsd: totalSupplyBaseNormalized
              .minus(totalBorrowBaseNormalized)
              .times(basePrice),

            suppliedAmount: totalSupplyBase,
            suppliedAmountNormalized: totalSupplyBaseNormalized,
            suppliedAmountUsd: totalSupplyBaseNormalized.times(basePrice),
            collateralAmount: 0n,
            collateralAmountNormalized: BigDecimal(0),
            collateralAmountUsd: BigDecimal(0),
            collateralFactor: BigDecimal(0),
            supplyIndex: marketBasic.baseSupplyIndex
              .asBigDecimal()
              .dividedBy(FACTOR_SCALE_15.asBigDecimal()),
            supplyApr: supplyApr,
            borrowedAmount: totalBorrowBase,
            borrowedAmountNormalized: totalBorrowBaseNormalized,
            borrowedAmountUsd: totalBorrowBaseNormalized.times(basePrice),
            borrowIndex: marketBasic.baseBorrowIndex
              .asBigDecimal()
              .dividedBy(FACTOR_SCALE_15.asBigDecimal()),
            borrowApr: borrowApr,
            totalFeesUsd: BigDecimal(0),
            userFeesUsd: BigDecimal(0),
            protocolFeesUsd: BigDecimal(0),
          });
        } else {
          basePoolSnapshot.timestamp = START_TIME_UNIX;
          basePoolSnapshot.blockDate = START_TIME_FORMATED;
          basePoolSnapshot.availableAmount = totalSupplyBase - totalBorrowBase;
          basePoolSnapshot.availableAmountNormalized =
            totalSupplyBaseNormalized.minus(totalBorrowBaseNormalized);
          basePoolSnapshot.availableAmountUsd = totalSupplyBaseNormalized
            .minus(totalBorrowBaseNormalized)
            .times(basePrice);
          basePoolSnapshot.borrowedAmount = totalBorrowBase;
          basePoolSnapshot.borrowedAmountNormalized = totalBorrowBaseNormalized;
          basePoolSnapshot.borrowedAmountUsd =
            totalBorrowBaseNormalized.times(basePrice);
          basePoolSnapshot.suppliedAmount = totalSupplyBase;
          basePoolSnapshot.suppliedAmountNormalized = totalSupplyBaseNormalized;
          basePoolSnapshot.suppliedAmountUsd =
            totalSupplyBaseNormalized.times(basePrice);
          basePoolSnapshot.supplyIndex = marketBasic.baseSupplyIndex
            .asBigDecimal()
            .dividedBy(FACTOR_SCALE_15.asBigDecimal());
          basePoolSnapshot.borrowIndex = marketBasic.baseBorrowIndex
            .asBigDecimal()
            .dividedBy(FACTOR_SCALE_15.asBigDecimal());
          basePoolSnapshot.supplyApr = supplyApr;
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
        ).filter((val) => val.chainId === chainId);

        const collateralPrices = new Map<string, BigDecimal>();

        for (const collateralPool of collateralPools) {
          const collateralPrice = await getPriceBySymbol(
            appConfig.assets[collateralPool.underlyingTokenAddress],
            ctx.timestamp
          );

          if (!collateralPrice) {
            console.error(
              `No price found for ${appConfig.assets[collateralPool.underlyingTokenAddress]} at ${ctx.timestamp}`
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
                collateralAmountUsd:
                  collateralPool.collateralAmountNormalized.times(
                    collateralPrices.get(collateralPool.underlyingTokenAddress)!
                  ),
              });
            } else {
              collateralPoolSnapshot.timestamp = START_TIME_UNIX;
              collateralPoolSnapshot.blockDate = START_TIME_FORMATED;
              collateralPoolSnapshot.underlyingTokenPriceUsd =
                collateralPrices.get(collateralPool.underlyingTokenAddress);

              collateralPoolSnapshot.availableAmount =
                collateralPool.availableAmount;
              collateralPoolSnapshot.availableAmountNormalized =
                collateralPool.availableAmountNormalized;
              collateralPoolSnapshot.availableAmountUsd =
                collateralPool.availableAmountUsd;

              collateralPoolSnapshot.collateralAmount =
                collateralPool.collateralAmount;
              collateralPoolSnapshot.collateralAmountNormalized =
                collateralPool.collateralAmountNormalized;
              collateralPoolSnapshot.collateralAmountUsd =
                collateralPool.collateralAmountNormalized.times(
                  collateralPrices.get(collateralPool.underlyingTokenAddress)!
                );

              collateralPoolSnapshot.collateralFactor =
                collateralPool.collateralFactor;
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
        ).filter((val) => val.chainId === chainId);

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
                collateralAmountUsd:
                  collateralPosition.collateralAmountNormalized.times(
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
              collateralPositionSnapshot.collateralAmountNormalized =
                collateralPosition.collateralAmountNormalized;
              collateralPositionSnapshot.collateralAmountUsd =
                collateralPosition.collateralAmountNormalized.times(
                  collateralPrices.get(
                    collateralPosition.underlyingTokenAddress!
                  )!
                );
            }

            await ctx.store.upsert(collateralPositionSnapshot);
          });

        await Promise.all(processCollateralPositionSnapshotsPromises);
      },
      60,
      60
    );
});
