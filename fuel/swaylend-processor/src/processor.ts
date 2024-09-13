import { BigDecimal } from '@sentio/sdk';
import { FuelNetwork } from '@sentio/sdk/fuel';
import { DateTime } from 'fuels';
import { ASSET_ID_TO_SYMBOL } from './constants.js';
import {
  BasePositionSnapshot,
  CollateralConfiguration,
  CollateralPositionSnapshot,
  MarketBasic,
  MarketConfiguration,
  Pool,
  BasePoolSnapshot,
  CollateralPoolSnapshot,
  UserBasic,
} from './schema/store.js';
import { MarketProcessor } from './types/fuel/MarketProcessor.js';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc.js';

dayjs.extend(utc);

const FACTOR_SCALE_15 = BigDecimal(10).pow(15);
const FACTOR_SCALE_18 = BigDecimal(10).pow(18);
const SECONDS_PER_YEAR = BigDecimal(365).times(24).times(60).times(60);

const getBorrowRate = (
  marketConfig: MarketConfiguration,
  utilization: BigDecimal
): BigDecimal => {
  if (utilization.lte(marketConfig.borrowKink)) {
    return marketConfig.borrowPerSecondInterestRateBase.plus(
      marketConfig.borrowPerSecondInterestRateSlopeLow
        .times(utilization)
        .dividedBy(FACTOR_SCALE_18)
    );
  }

  return marketConfig.borrowPerSecondInterestRateBase
    .plus(
      marketConfig.borrowPerSecondInterestRateSlopeLow
        .times(marketConfig.borrowKink)
        .dividedBy(FACTOR_SCALE_18)
    )
    .plus(
      marketConfig.borrowPerSecondInterestRateSlopeHigh
        .times(utilization.minus(marketConfig.borrowKink))
        .dividedBy(FACTOR_SCALE_18)
    );
};

const getSupplyRate = (
  marketConfig: MarketConfiguration,
  utilization: BigDecimal
): BigDecimal => {
  if (utilization.lte(marketConfig.supplyKink)) {
    return marketConfig.supplyPerSecondInterestRateBase.plus(
      marketConfig.supplyPerSecondInterestRateSlopeLow
        .times(utilization)
        .dividedBy(FACTOR_SCALE_18)
    );
  }

  return marketConfig.supplyPerSecondInterestRateBase
    .plus(
      marketConfig.supplyPerSecondInterestRateSlopeLow
        .times(marketConfig.supplyKink)
        .dividedBy(FACTOR_SCALE_18)
    )
    .plus(
      marketConfig.supplyPerSecondInterestRateSlopeHigh
        .times(utilization.minus(marketConfig.supplyKink))
        .dividedBy(FACTOR_SCALE_18)
    );
};

const getApr = (rate: BigDecimal) => {
  return rate.times(SECONDS_PER_YEAR).times(100).dividedBy(FACTOR_SCALE_18);
};

const getPresentValue = (
  principal: BigDecimal,
  baseTrackingIndex: BigDecimal
): BigDecimal => {
  return principal.times(baseTrackingIndex).dividedBy(FACTOR_SCALE_15);
};

const getPrincipalValue = (
  presentValue: BigDecimal,
  baseTrackingIndex: BigDecimal
): BigDecimal => {
  if (presentValue.gte(0)) {
    return presentValue.times(FACTOR_SCALE_15).dividedBy(baseTrackingIndex);
  }

  return presentValue
    .times(FACTOR_SCALE_15)
    .plus(baseTrackingIndex.minus(1))
    .dividedBy(baseTrackingIndex);
};

// Get the utilization of the market
const getUtilization = (
  totalSupplyBase: BigDecimal,
  totalBorrowBase: BigDecimal,
  baseSupplyIndex: BigDecimal,
  baseBorrowIndex: BigDecimal
) => {
  const presentValueSupply = getPresentValue(baseSupplyIndex, totalSupplyBase);
  const presentValueBorrow = getPresentValue(baseBorrowIndex, totalBorrowBase);

  if (presentValueSupply.eq(0)) {
    return BigDecimal(0);
  }

  return presentValueBorrow
    .times(FACTOR_SCALE_18)
    .dividedBy(presentValueSupply);
};

const START_BLOCK = BigInt(9500000);

const CHAIN_ID_MAP = {
  fuel_testnet: 0,
  fuel_mainnet: 0,
};

MarketProcessor.bind({
  chainId: FuelNetwork.TEST_NET,
  address: '0x8cd0c973a8ab7c15c0a8ee8f5cb4dd04ea3f27411c8eef6e76f3765fe43863fe',
  startBlock: START_BLOCK,
})
  .onLogMarketConfigurationEvent(async (event, ctx) => {
    const {
      data: {
        market_config: {
          base_token,
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
        supplyKink: BigDecimal(supply_kink.toString()),
        borrowKink: BigDecimal(borrow_kink.toString()),
        supplyPerSecondInterestRateBase: BigDecimal(
          supply_per_second_interest_rate_base.toString()
        ),
        supplyPerSecondInterestRateSlopeLow: BigDecimal(
          supply_per_second_interest_rate_slope_low.toString()
        ),
        supplyPerSecondInterestRateSlopeHigh: BigDecimal(
          supply_per_second_interest_rate_slope_high.toString()
        ),
        borrowPerSecondInterestRateBase: BigDecimal(
          borrow_per_second_interest_rate_base.toString()
        ),
        borrowPerSecondInterestRateSlopeLow: BigDecimal(
          borrow_per_second_interest_rate_slope_low.toString()
        ),
        borrowPerSecondInterestRateSlopeHigh: BigDecimal(
          borrow_per_second_interest_rate_slope_high.toString()
        ),
      });
    } else {
      marketConfiguration.baseTokenAddress = base_token;
      marketConfiguration.baseTokenDecimals = base_token_decimals;
      marketConfiguration.chainId = chainId;
      marketConfiguration.contractAddress = ctx.contractAddress;
      marketConfiguration.supplyKink = BigDecimal(supply_kink.toString());
      marketConfiguration.borrowKink = BigDecimal(borrow_kink.toString());
      marketConfiguration.supplyPerSecondInterestRateBase = BigDecimal(
        supply_per_second_interest_rate_base.toString()
      );
      marketConfiguration.supplyPerSecondInterestRateSlopeLow = BigDecimal(
        supply_per_second_interest_rate_slope_low.toString()
      );
      marketConfiguration.supplyPerSecondInterestRateSlopeHigh = BigDecimal(
        supply_per_second_interest_rate_slope_high.toString()
      );
      marketConfiguration.borrowPerSecondInterestRateBase = BigDecimal(
        borrow_per_second_interest_rate_base.toString()
      );
      marketConfiguration.borrowPerSecondInterestRateSlopeLow = BigDecimal(
        borrow_per_second_interest_rate_slope_low.toString()
      );
      marketConfiguration.borrowPerSecondInterestRateSlopeHigh = BigDecimal(
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
        receiptTokenAddress: 'TODO',
        receiptTokenSymbol: 'TODO',
        poolAddress: ctx.contractAddress,
        poolType: 'supply_only',
      });

      await ctx.store.upsert(pool);
    }
  })
  .onLogCollateralAssetAdded(async (event, ctx) => {
    const {
      data: {
        asset_id,
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
        receiptTokenAddress: 'TODO',
        receiptTokenSymbol: 'TODO',
        poolAddress: ctx.contractAddress,
        poolType: 'collateral_only',
      });

      await ctx.store.upsert(pool);
    }

    // Create pool snapshot
    const poolSnapshotId = `${chainId}_${ctx.contractAddress}_${asset_id}`;
    const poolSnapshot = await ctx.store.get(
      CollateralPoolSnapshot,
      poolSnapshotId
    );

    if (!poolSnapshot) {
      const poolSnapshot = new CollateralPoolSnapshot({
        id: poolSnapshotId,
        chainId: chainId,
        poolAddress: ctx.contractAddress,
        underlyingTokenAddress: asset_id,
        underlyingTokenSymbol: ASSET_ID_TO_SYMBOL[asset_id],
        underlyingTokenPriceUsd: BigDecimal(0),
        availableAmount: BigDecimal(0),
        availableAmountUsd: BigDecimal(0),
        suppliedAmount: BigDecimal(0),
        suppliedAmountUsd: BigDecimal(0),
        nonRecursiveSuppliedAmount: BigDecimal(0),
        collateralAmount: BigDecimal(0),
        collateralAmountUsd: BigDecimal(0),
        collateralFactor: BigDecimal(
          borrow_collateral_factor.toString()
        ).dividedBy(FACTOR_SCALE_18),
        supplyIndex: BigDecimal(0),
        supplyApr: BigDecimal(0),
        borrowedAmount: BigDecimal(0),
        borrowedAmountUsd: BigDecimal(0),
        borrowIndex: BigDecimal(0),
        borrowApr: BigDecimal(0),
        totalFeesUsd: BigDecimal(0),
        userFeesUsd: BigDecimal(0),
        protocolFeesUsd: BigDecimal(0),
      });

      await ctx.store.upsert(poolSnapshot);
    }
  })
  .onLogCollateralAssetUpdated(async (event, ctx) => {
    const {
      data: {
        asset_id,
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
        address,
        user_basic: {
          principal: { value, negative },
        },
      },
    } = event;

    const chainId = CHAIN_ID_MAP[ctx.chainId as keyof typeof CHAIN_ID_MAP];
    const userBasicId = `${chainId}_${ctx.contractAddress}_${address}`;

    let userBasic = await ctx.store.get(UserBasic, userBasicId);

    if (!userBasic) {
      userBasic = new UserBasic({
        id: userBasicId,
        chainId: chainId,
        contractAddress: ctx.contractAddress,
        address: address.bits,
        principal: BigDecimal(value.toString()),
        isNegative: negative,
      });
    } else {
      userBasic.principal = BigDecimal(value.toString());
      userBasic.isNegative = negative;
    }

    await ctx.store.upsert(userBasic);
  })
  .onLogUserSupplyCollateralEvent(async (event, ctx) => {
    const {
      data: { address, asset_id, amount },
    } = event;

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

    const id = `${chainId}_${ctx.contractAddress}_${address.bits}_${asset_id}`;

    let positionSnapshot = await ctx.store.get(CollateralPositionSnapshot, id);

    if (!positionSnapshot) {
      positionSnapshot = new CollateralPositionSnapshot({
        id,
        chainId: chainId,
        poolAddress: ctx.contractAddress,
        underlyingTokenAddress: collateralConfiguration.assetAddress,
        underlyingTokenSymbol:
          ASSET_ID_TO_SYMBOL[collateralConfiguration.assetAddress],
        userAddress: address.bits,
        suppliedAmount: BigDecimal(0),
        borrowedAmount: BigDecimal(0),
        collateralAmount: BigDecimal(amount.toString()).dividedBy(
          BigDecimal(10).pow(collateralConfiguration.decimals)
        ),
      });
    } else {
      positionSnapshot.collateralAmount =
        positionSnapshot.collateralAmount.plus(
          BigDecimal(amount.toString()).dividedBy(
            BigDecimal(10).pow(collateralConfiguration.decimals)
          )
        );
    }

    await ctx.store.upsert(positionSnapshot);

    // Pool snapshot
    const poolSnapshotId = `${chainId}_${ctx.contractAddress}_${collateralConfiguration.assetAddress}`;
    const poolSnapshot = await ctx.store.get(
      CollateralPoolSnapshot,
      poolSnapshotId
    );

    if (!poolSnapshot) {
      throw new Error(
        `Pool snapshot not found for market ${ctx.contractAddress} on chain ${chainId}`
      );
    }

    poolSnapshot.collateralAmount = BigDecimal(
      poolSnapshot.collateralAmount
    ).plus(
      BigDecimal(amount.toString()).dividedBy(
        BigDecimal(10).pow(collateralConfiguration.decimals)
      )
    );

    await ctx.store.upsert(poolSnapshot);
  })
  .onLogUserWithdrawCollateralEvent(async (event, ctx) => {
    const {
      data: { address, asset_id, amount },
    } = event;

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

    const id = `${chainId}_${ctx.contractAddress}_${address.bits}_${asset_id}`;

    const positionSnapshot = await ctx.store.get(
      CollateralPositionSnapshot,
      id
    );

    if (!positionSnapshot) {
      throw new Error(
        `Position snapshot (${id}) not found for user ${address.bits} on chain ${chainId}`
      );
    }

    positionSnapshot.collateralAmount = BigDecimal(
      positionSnapshot.collateralAmount
        .minus(
          BigDecimal(amount.toString()).dividedBy(
            BigDecimal(10).pow(collateralConfiguration.decimals)
          )
        )
        .toString()
    );

    // If user withdraws all collateral, delete the position snapshot
    if (positionSnapshot.collateralAmount.lte(0)) {
      await ctx.store.delete(positionSnapshot, id);
    } else {
      await ctx.store.upsert(positionSnapshot);
    }

    // Pool snapshot
    const poolSnapshotId = `${chainId}_${ctx.contractAddress}_${collateralConfiguration.assetAddress}`;
    const poolSnapshot = await ctx.store.get(
      CollateralPoolSnapshot,
      poolSnapshotId
    );

    if (!poolSnapshot) {
      throw new Error(
        `Pool snapshot not found for market ${ctx.contractAddress} on chain ${chainId}`
      );
    }

    poolSnapshot.collateralAmount = BigDecimal(
      poolSnapshot.collateralAmount
    ).minus(
      BigDecimal(amount.toString()).dividedBy(
        BigDecimal(10).pow(collateralConfiguration.decimals)
      )
    );

    await ctx.store.upsert(poolSnapshot);
  })
  .onLogAbsorbCollateralEvent(async (event, ctx) => {
    const {
      data: { address, asset_id, amount, decimals },
    } = event;

    // Collateral pool reduced for absorbed collateral
    const chainId = CHAIN_ID_MAP[ctx.chainId as keyof typeof CHAIN_ID_MAP];
    const poolSnapshotId = `${chainId}_${ctx.contractAddress}_${asset_id}`;
    const poolSnapshot = await ctx.store.get(
      CollateralPoolSnapshot,
      poolSnapshotId
    );

    if (!poolSnapshot) {
      throw new Error(
        `Pool snapshot not found for market ${ctx.contractAddress} on chain ${chainId}`
      );
    }

    poolSnapshot.collateralAmount = BigDecimal(
      poolSnapshot.collateralAmount
    ).minus(
      BigDecimal(amount.toString()).dividedBy(BigDecimal(10).pow(decimals))
    );

    await ctx.store.upsert(poolSnapshot);

    // Get collateral position snapshot (and delete it as all collateral has been absorbed/seized)
    const positionSnapshotId = `${chainId}_${ctx.contractAddress}_${address.bits}_${asset_id}`;
    const positionSnapshot = await ctx.store.get(
      CollateralPositionSnapshot,
      positionSnapshotId
    );

    if (!positionSnapshot) {
      throw new Error(
        `Position snapshot (${positionSnapshotId}) not found for user ${address.bits} on chain ${chainId}`
      );
    }

    await ctx.store.delete(positionSnapshot, positionSnapshotId);
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
    const marketConfigId = `${chainId}_${ctx.contractAddress}`;
    const marketConfiguration = await ctx.store.get(
      MarketConfiguration,
      marketConfigId
    );

    // if (
    //   !marketConfiguration &&
    //   ctx.block?.height.toString() === START_BLOCK.toString() // TODO: Remove on redeploy
    // ) {
    //   throw new Error(
    //     `Market configuration not found for market ${ctx.contractAddress} on chain ${ctx.chainId}`
    //   );
    // }

    const marketBasicId = `${chainId}_${ctx.contractAddress}`;
    let marketBasic = await ctx.store.get(MarketBasic, marketBasicId);

    if (!marketBasic) {
      marketBasic = new MarketBasic({
        id: marketBasicId,
        chainId: chainId,
        contractAddress: ctx.contractAddress,
        lastAccrualTime: BigDecimal(last_accrual_time.toString()),
        baseSupplyIndex: BigDecimal(base_supply_index.toString()),
        baseBorrowIndex: BigDecimal(base_borrow_index.toString()),
        totalSupplyBase: BigDecimal(total_supply_base.toString()),
        totalBorrowBase: BigDecimal(total_borrow_base.toString()),
      });
    } else {
      marketBasic.lastAccrualTime = BigDecimal(last_accrual_time.toString());
      marketBasic.baseSupplyIndex = BigDecimal(base_supply_index.toString());
      marketBasic.baseBorrowIndex = BigDecimal(base_borrow_index.toString());
      marketBasic.totalSupplyBase = BigDecimal(total_supply_base.toString());
      marketBasic.totalBorrowBase = BigDecimal(total_borrow_base.toString());
    }

    await ctx.store.upsert(marketBasic);
  })
  // Process only current market
  .onTimeInterval(async (block, ctx) => {
    const START_TIME = dayjs(ctx.timestamp.getTime()).utc();
    const START_TIME_UNIX = START_TIME.unix();
    const START_TIME_FORMATED = START_TIME.format('YYYY-MM-DD HH:00:00');

    const pools = (
      await ctx.store.list(Pool, [
        { field: 'poolType', op: '=', value: 'supply_only' },
        { field: 'chainId', op: '=', value: 0 },
        {
          field: 'poolAddress',
          op: '=',
          value:
            '0x8cd0c973a8ab7c15c0a8ee8f5cb4dd04ea3f27411c8eef6e76f3765fe43863fe',
        },
      ])
    )
    //.filter((val) => val.chainId === 0);

    if (pools.length !== 1) {
      throw new Error(`Only one pool should be found. Found: ${pools.length}`);
    }

    console.log(`Pool chain id: ${pools[0].chainId}`);

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
    // Accrue interest
    const now = BigDecimal(DateTime.fromUnixSeconds(START_TIME_UNIX).toTai64()); // Need to convert timestamp to Tai64 format
    const timeElapsed = now.minus(marketBasic.lastAccrualTime);

    if (timeElapsed.gt(0)) {
      if (!marketBasic.lastAccrualTime.eq(0)) {
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

        const baseSupplyIndexDelta = baseSupplyIndex
          .times(supplyRate)
          .times(timeElapsed)
          .dividedBy(FACTOR_SCALE_18);

        const baseBorrowIndexDelta = baseBorrowIndex
          .times(borrowRate)
          .times(timeElapsed)
          .dividedBy(FACTOR_SCALE_18);

        marketBasic.baseSupplyIndex =
          baseSupplyIndex.plus(baseSupplyIndexDelta);
        marketBasic.baseBorrowIndex =
          baseBorrowIndex.plus(baseBorrowIndexDelta);
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
    ).filter((val) => val.chainId === 0);

    for (const userBasic of userBasics) {
      const basePositionSnapshotId = `${userBasic.chainId}_${userBasic.contractAddress}_${marketConfiguration.baseTokenAddress}_${userBasic.address}`;

      const presentValue = getPresentValue(
        userBasic.principal,
        userBasic.isNegative
          ? marketBasic.baseBorrowIndex
          : marketBasic.baseSupplyIndex
      );

      let basePositionSnapshot = await ctx.store.get(
        BasePositionSnapshot,
        basePositionSnapshotId
      );

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
          suppliedAmount: userBasic.isNegative ? BigDecimal(0) : presentValue,
          borrowedAmount: userBasic.isNegative ? presentValue : BigDecimal(0),
          collateralAmount: BigDecimal(0),
        });
      } else {
        basePositionSnapshot.timestamp = START_TIME_UNIX;
        basePositionSnapshot.blockDate = START_TIME_FORMATED;
        basePositionSnapshot.suppliedAmount = userBasic.isNegative
          ? BigDecimal(0)
          : presentValue;
        basePositionSnapshot.borrowedAmount = userBasic.isNegative
          ? presentValue
          : BigDecimal(0);
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

    const totalSupplyBase = marketBasic.totalSupplyBase
      .times(marketBasic.baseSupplyIndex)
      .dividedBy(BigDecimal(10).pow(marketConfiguration.baseTokenDecimals));

    const totalBorrowBase = marketBasic.totalBorrowBase
      .times(marketBasic.baseBorrowIndex)
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
        chainId: 0,
        poolAddress: marketBasic.contractAddress,
        underlyingTokenAddress: underlyingTokenAddress,
        underlyingTokenSymbol: ASSET_ID_TO_SYMBOL[underlyingTokenAddress],
        underlyingTokenPriceUsd: BigDecimal(0),
        availableAmount: totalSupplyBase.minus(totalBorrowBase),
        availableAmountUsd: BigDecimal(0),
        suppliedAmount: totalSupplyBase,
        suppliedAmountUsd: BigDecimal(0),
        nonRecursiveSuppliedAmount: totalSupplyBase,
        collateralAmount: BigDecimal(0),
        collateralAmountUsd: BigDecimal(0),
        collateralFactor: BigDecimal(0),
        supplyIndex: marketBasic.baseSupplyIndex.dividedBy(FACTOR_SCALE_15),
        supplyApr: supplyApr,
        borrowedAmount: totalBorrowBase,
        borrowedAmountUsd: BigDecimal(0),
        borrowIndex: marketBasic.baseBorrowIndex.dividedBy(FACTOR_SCALE_15),
        borrowApr: borrowApr,
        totalFeesUsd: BigDecimal(0),
        userFeesUsd: BigDecimal(0),
        protocolFeesUsd: BigDecimal(0),
      });
    } else {
      basePoolSnapshot.timestamp = START_TIME_UNIX;
      basePoolSnapshot.blockDate = START_TIME_FORMATED;
      basePoolSnapshot.availableAmount = totalSupplyBase.minus(totalBorrowBase);
      basePoolSnapshot.borrowedAmount = totalBorrowBase;
      basePoolSnapshot.suppliedAmount = totalSupplyBase;
      basePoolSnapshot.nonRecursiveSuppliedAmount = totalSupplyBase;
      basePoolSnapshot.supplyIndex =
        marketBasic.baseSupplyIndex.dividedBy(FACTOR_SCALE_15);
      basePoolSnapshot.borrowIndex =
        marketBasic.baseBorrowIndex.dividedBy(FACTOR_SCALE_15);

      basePoolSnapshot.borrowApr = borrowApr;
    }

    await ctx.store.upsert(basePoolSnapshot);
  }, 60);
