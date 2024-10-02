import { GLOBAL_CONFIG } from '@sentio/runtime';
import { BigDecimal } from '@sentio/sdk';
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
  index: BigDecimal
): BigDecimal => {
  return principal.times(index).dividedBy(FACTOR_SCALE_15);
};

const getPrincipalValue = (
  presentValue: BigDecimal,
  index: BigDecimal
): BigDecimal => {
  if (presentValue.gte(0)) {
    return presentValue.times(FACTOR_SCALE_15).dividedBy(index);
  }

  return presentValue
    .times(FACTOR_SCALE_15)
    .plus(index.minus(1))
    .dividedBy(index);
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
      '0x689bfaf54edfc433f62d06f3581998f9cb32ce864da5ff99f4be7bed3556529d',
    startBlock:
      // BigInt(11672964),
      BigInt(11200000),
  },
  // USDT: {
  //   marketAddress:
  //     '0x0891579ef65509eeba9c66742931cc21218cdb93dd2239dfec794e9d57f87286',
  //   startBlock: BigInt(11200000),
  // },
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
        availableAmount: BigDecimal(0),
        availableAmountUsd: BigDecimal(0),
        suppliedAmount: BigDecimal(0),
        suppliedAmountUsd: BigDecimal(0),
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
    // .onLogUserBasicEvent(async (event, ctx) => {
    //   const {
    //     data: {
    //       account,
    //       user_basic: {
    //         principal: { value, negative },
    //       },
    //     },
    //   } = event;

    //   const address = (account.Address?.bits ?? account.ContractId?.bits)!;
    //   const chainId = CHAIN_ID_MAP[ctx.chainId as keyof typeof CHAIN_ID_MAP];
    //   const userBasicId = `${chainId}_${ctx.contractAddress}_${address}`;

    //   let userBasic = await ctx.store.get(UserBasic, userBasicId);

    //   if (!userBasic) {
    //     userBasic = new UserBasic({
    //       id: userBasicId,
    //       chainId: chainId,
    //       contractAddress: ctx.contractAddress,
    //       address: address,
    //       principal: BigDecimal(value.toString()),
    //       isNegative: negative,
    //     });
    //   } else {
    //     userBasic.principal = BigDecimal(value.toString());
    //     userBasic.isNegative = negative;
    //   }

    //   await ctx.store.upsert(userBasic);
    // })
    // .onLogUserSupplyCollateralEvent(async (event, ctx) => {
    //   const {
    //     data: {
    //       account,
    //       asset_id: { bits: asset_id },
    //       amount,
    //     },
    //   } = event;

    //   const address = (account.Address?.bits ?? account.ContractId?.bits)!;
    //   const chainId = CHAIN_ID_MAP[ctx.chainId as keyof typeof CHAIN_ID_MAP];

    //   const collateralConfigurationId = `${chainId}_${ctx.contractAddress}_${asset_id}`;
    //   const collateralConfiguration = await ctx.store.get(
    //     CollateralConfiguration,
    //     collateralConfigurationId
    //   );

    //   if (!collateralConfiguration) {
    //     throw new Error(
    //       `Collateral configuration not found for asset ${asset_id} on chain ${chainId}`
    //     );
    //   }

    //   const id = `${chainId}_${ctx.contractAddress}_${address}_${asset_id}`;

    //   let collateralPosition = await ctx.store.get(CollateralPosition, id);

    //   if (!collateralPosition) {
    //     collateralPosition = new CollateralPosition({
    //       id,
    //       chainId: chainId,
    //       poolAddress: ctx.contractAddress,
    //       userAddress: address,
    //       underlyingTokenAddress: collateralConfiguration.assetAddress,
    //       underlyingTokenSymbol:
    //         ASSET_ID_TO_SYMBOL[collateralConfiguration.assetAddress],
    //       suppliedAmount: BigDecimal(0),
    //       suppliedAmountUsd: BigDecimal(0),
    //       borrowedAmount: BigDecimal(0),
    //       borrowedAmountUsd: BigDecimal(0),
    //       collateralAmount: BigDecimal(amount.toString()).dividedBy(
    //         BigDecimal(10).pow(collateralConfiguration.decimals)
    //       ),
    //     });
    //   } else {
    //     collateralPosition.collateralAmount =
    //       collateralPosition.collateralAmount.plus(
    //         BigDecimal(amount.toString()).dividedBy(
    //           BigDecimal(10).pow(collateralConfiguration.decimals)
    //         )
    //       );
    //   }

    //   await ctx.store.upsert(collateralPosition);

    //   // Collateral pool
    //   const collateralPoolId = `${chainId}_${ctx.contractAddress}_${collateralConfiguration.assetAddress}`;
    //   const collateralPool = await ctx.store.get(
    //     CollateralPool,
    //     collateralPoolId
    //   );

    //   if (!collateralPool) {
    //     throw new Error(
    //       `Collateral pool not found for market ${ctx.contractAddress} on chain ${chainId}`
    //     );
    //   }

    //   collateralPool.collateralAmount = collateralPool.collateralAmount.plus(
    //     BigDecimal(amount.toString()).dividedBy(
    //       BigDecimal(10).pow(collateralConfiguration.decimals)
    //     )
    //   );

    //   await ctx.store.upsert(collateralPool);
    // })
    // .onLogUserWithdrawCollateralEvent(async (event, ctx) => {
    //   const {
    //     data: {
    //       account,
    //       asset_id: { bits: asset_id },
    //       amount,
    //     },
    //   } = event;

    //   const address = (account.Address?.bits ?? account.ContractId?.bits)!;
    //   const chainId = CHAIN_ID_MAP[ctx.chainId as keyof typeof CHAIN_ID_MAP];

    //   const collateralConfigurationId = `${chainId}_${ctx.contractAddress}_${asset_id}`;
    //   const collateralConfiguration = await ctx.store.get(
    //     CollateralConfiguration,
    //     collateralConfigurationId
    //   );

    //   if (!collateralConfiguration) {
    //     throw new Error(
    //       `Collateral configuration not found for asset ${asset_id} on chain ${chainId}`
    //     );
    //   }

    //   const id = `${chainId}_${ctx.contractAddress}_${address}_${asset_id}`;

    //   const collateralPosition = await ctx.store.get(CollateralPosition, id);

    //   if (!collateralPosition) {
    //     throw new Error(
    //       `Collateral position (${id}) not found for user ${address} on chain ${chainId}`
    //     );
    //   }

    //   collateralPosition.collateralAmount = BigDecimal(
    //     collateralPosition.collateralAmount
    //       .minus(
    //         BigDecimal(amount.toString()).dividedBy(
    //           BigDecimal(10).pow(collateralConfiguration.decimals)
    //         )
    //       )
    //       .toString()
    //   );

    //   // If user withdraws all collatera
    //   await ctx.store.upsert(collateralPosition);

    //   // Collateral pool
    //   const collateralPoolId = `${chainId}_${ctx.contractAddress}_${collateralConfiguration.assetAddress}`;
    //   const collateralPool = await ctx.store.get(
    //     CollateralPool,
    //     collateralPoolId
    //   );

    //   if (!collateralPool) {
    //     throw new Error(
    //       `Collateral pool not found for market ${ctx.contractAddress} on chain ${chainId}`
    //     );
    //   }

    //   collateralPool.collateralAmount = collateralPool.collateralAmount.minus(
    //     BigDecimal(amount.toString()).dividedBy(
    //       BigDecimal(10).pow(collateralConfiguration.decimals)
    //     )
    //   );

    //   await ctx.store.upsert(collateralPool);
    // })
    // .onLogAbsorbCollateralEvent(async (event, ctx) => {
    //   const {
    //     data: { account, asset_id, amount, decimals },
    //   } = event;

    //   // Collateral pool reduced for absorbed collateral
    //   const address = (account.Address?.bits ?? account.ContractId?.bits)!;
    //   const chainId = CHAIN_ID_MAP[ctx.chainId as keyof typeof CHAIN_ID_MAP];
    //   const collateralPoolId = `${chainId}_${ctx.contractAddress}_${asset_id}`;
    //   const collateralPool = await ctx.store.get(
    //     CollateralPool,
    //     collateralPoolId
    //   );

    //   if (!collateralPool) {
    //     throw new Error(
    //       `Collateral pool not found for market ${ctx.contractAddress} on chain ${chainId}`
    //     );
    //   }

    //   collateralPool.collateralAmount = BigDecimal(
    //     collateralPool.collateralAmount
    //   ).minus(
    //     BigDecimal(amount.toString()).dividedBy(BigDecimal(10).pow(decimals))
    //   );

    //   await ctx.store.upsert(collateralPool);

    //   // Get collateral position
    //   const collateralPositionId = `${chainId}_${ctx.contractAddress}_${address}_${asset_id}`;
    //   const collateralPosition = await ctx.store.get(
    //     CollateralPosition,
    //     collateralPositionId
    //   );

    //   if (!collateralPosition) {
    //     throw new Error(
    //       `Collateral position (${collateralPositionId}) not found for user ${address} on chain ${chainId}`
    //     );
    //   }

    //   collateralPosition.collateralAmount = BigDecimal(0);

    //   await ctx.store.upsert(collateralPosition);
    // })
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


        ctx.eventLogger.emit("marketBasicDebug", {
          baseBorrowIndex: marketBasic?.baseBorrowIndex ?? 0,
          totalBorrowBase: marketBasic?.totalBorrowBase ?? 0,
          postAccrue: "no"
        })

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

        // Accrue interest
        const now = BigDecimal(
          DateTime.fromUnixSeconds(START_TIME_UNIX).toTai64()
        ); // Need to convert timestamp to Tai64 format
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
        // const userBasics = (
        //   await ctx.store.list(UserBasic, [
        //     // { field: 'chainId', op: '=', value: 0 },
        //     {
        //       field: 'contractAddress',
        //       op: '=',
        //       value: marketBasic.contractAddress,
        //     },
        //   ])
        // ).filter((val) => val.chainId === 0);

        // for (const userBasic of userBasics) {
        //   const basePositionSnapshotId = `${userBasic.chainId}_${userBasic.contractAddress}_${marketConfiguration.baseTokenAddress}_${userBasic.address}`;

        //   const presentValue = getPresentValue(
        //     userBasic.principal,
        //     userBasic.isNegative
        //       ? marketBasic.baseBorrowIndex
        //       : marketBasic.baseSupplyIndex
        //   ).dividedBy(
        //     BigDecimal(10).pow(marketConfiguration.baseTokenDecimals)
        //   );

        //   let basePositionSnapshot = await ctx.store.get(
        //     BasePositionSnapshot,
        //     basePositionSnapshotId
        //   );

        //   const suppliedAmount = userBasic.isNegative
        //     ? BigDecimal(0)
        //     : presentValue;

        //   const borrowedAmount = userBasic.isNegative
        //     ? presentValue
        //     : BigDecimal(0);

        //   // Create base position snapshot if it doesn't exist
        //   if (!basePositionSnapshot) {
        //     const underlyingTokenAddress = marketConfiguration.baseTokenAddress;

        //     basePositionSnapshot = new BasePositionSnapshot({
        //       id: basePositionSnapshotId,
        //       timestamp: START_TIME_UNIX,
        //       blockDate: START_TIME_FORMATED,
        //       chainId: 0,
        //       poolAddress: userBasic.contractAddress,
        //       underlyingTokenAddress: underlyingTokenAddress,
        //       underlyingTokenSymbol: ASSET_ID_TO_SYMBOL[underlyingTokenAddress],
        //       userAddress: userBasic.address,
        //       suppliedAmount: suppliedAmount,
        //       suppliedAmountUsd: suppliedAmount.times(basePrice),
        //       borrowedAmount: borrowedAmount,
        //       borrowedAmountUsd: borrowedAmount.times(basePrice),
        //       collateralAmount: BigDecimal(0),
        //       collateralAmountUsd: BigDecimal(0),
        //     });
        //   } else {
        //     basePositionSnapshot.timestamp = START_TIME_UNIX;
        //     basePositionSnapshot.blockDate = START_TIME_FORMATED;
        //     basePositionSnapshot.suppliedAmount = suppliedAmount;
        //     basePositionSnapshot.suppliedAmountUsd =
        //       suppliedAmount.times(basePrice);
        //     basePositionSnapshot.borrowedAmount = borrowedAmount;
        //     basePositionSnapshot.borrowedAmountUsd =
        //       borrowedAmount.times(basePrice);
        //   }

        //   await ctx.store.upsert(basePositionSnapshot);
        // }



        // Create BasePoolSnapshot
        const underlyingTokenAddress = marketConfiguration.baseTokenAddress;

        // Create BasePoolSnapshot
        const basePoolSnapshotId = `${marketBasic.chainId}_${marketBasic.contractAddress}_${underlyingTokenAddress}`;
        let basePoolSnapshot = await ctx.store.get(
          BasePoolSnapshot,
          basePoolSnapshotId
        );


        const totalSupplyBase = getPresentValue(
          marketBasic.totalSupplyBase,
          marketBasic.baseSupplyIndex
        ).dividedBy(BigDecimal(10).pow(marketConfiguration.baseTokenDecimals));



        const totalBorrowBase = getPresentValue(
          marketBasic.totalBorrowBase,
          marketBasic.baseBorrowIndex
        ).dividedBy(BigDecimal(10).pow(marketConfiguration.baseTokenDecimals));

        ctx.eventLogger.emit("marketBasicDebug", {
          baseBorrowIndex: marketBasic?.baseBorrowIndex ?? 0,
          totalBorrowBase: marketBasic?.totalBorrowBase ?? 0,
          postAccrue: "yes"
        })


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
            availableAmount: totalSupplyBase.minus(totalBorrowBase),
            availableAmountUsd: totalSupplyBase
              .minus(totalBorrowBase)
              .times(basePrice),
            suppliedAmount: totalSupplyBase,
            suppliedAmountUsd: totalSupplyBase.times(basePrice),
            collateralAmount: BigDecimal(0),
            collateralAmountUsd: BigDecimal(0),
            collateralFactor: BigDecimal(0),
            supplyIndex: marketBasic.baseSupplyIndex.dividedBy(FACTOR_SCALE_15),
            supplyApr: supplyApr,
            borrowedAmount: totalBorrowBase,
            borrowedAmountUsd: totalBorrowBase.times(basePrice),
            borrowIndex: marketBasic.baseBorrowIndex.dividedBy(FACTOR_SCALE_15),
            borrowApr: borrowApr,
            totalFeesUsd: BigDecimal(0),
            userFeesUsd: BigDecimal(0),
            protocolFeesUsd: BigDecimal(0),
          });
        } else {
          basePoolSnapshot.timestamp = START_TIME_UNIX;
          basePoolSnapshot.blockDate = START_TIME_FORMATED;
          basePoolSnapshot.availableAmount =
            totalSupplyBase.minus(totalBorrowBase);
          basePoolSnapshot.borrowedAmount = totalBorrowBase;
          basePoolSnapshot.suppliedAmount = totalSupplyBase;
          basePoolSnapshot.supplyIndex =
            marketBasic.baseSupplyIndex.dividedBy(FACTOR_SCALE_15);
          basePoolSnapshot.borrowIndex =
            marketBasic.baseBorrowIndex.dividedBy(FACTOR_SCALE_15);
          basePoolSnapshot.supplyApr = supplyApr;
          basePoolSnapshot.borrowApr = borrowApr;
          basePoolSnapshot.suppliedAmountUsd =
            totalSupplyBase.multipliedBy(basePrice);
          basePoolSnapshot.borrowedAmountUsd =
            totalBorrowBase.multipliedBy(basePrice);
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
                collateralAmountUsd: collateralPool.collateralAmount.times(
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
              collateralPoolSnapshot.collateralAmountUsd =
                collateralPool.collateralAmount.times(
                  collateralPrices.get(collateralPool.underlyingTokenAddress)!
                );
            }

            await ctx.store.upsert(collateralPoolSnapshot);
          }
        );

        await Promise.all(processCollateralPoolSnapshotsPromises);

        // Create CollateralPositionSnapshots
        // const collateralPositions = (
        //   await ctx.store.list(CollateralPosition, [
        //     {
        //       field: 'poolAddress',
        //       op: '=',
        //       value: ctx.contract.id.toB256(),
        //     },
        //   ])
        // ).filter((val) => val.chainId === 0);

        // const processCollateralPositionSnapshotsPromises =
        //   collateralPositions.map(async (collateralPosition) => {
        //     const collateralPositionSnapshotId = `${collateralPosition.chainId}_${collateralPosition.poolAddress}_${collateralPosition.underlyingTokenAddress}_${collateralPosition.userAddress}`;

        //     let collateralPositionSnapshot = await ctx.store.get(
        //       CollateralPositionSnapshot,
        //       collateralPositionSnapshotId
        //     );

        //     if (!collateralPositionSnapshot) {
        //       collateralPositionSnapshot = new CollateralPositionSnapshot({
        //         ...collateralPosition,
        //         timestamp: START_TIME_UNIX,
        //         blockDate: START_TIME_FORMATED,
        //         collateralAmountUsd: collateralPosition.collateralAmount.times(
        //           collateralPrices.get(
        //             collateralPosition.underlyingTokenAddress
        //           )!
        //         ),
        //       });
        //     } else {
        //       collateralPositionSnapshot.timestamp = START_TIME_UNIX;
        //       collateralPositionSnapshot.blockDate = START_TIME_FORMATED;

        //       collateralPositionSnapshot.collateralAmount =
        //         collateralPosition.collateralAmount;
        //       collateralPositionSnapshot.collateralAmountUsd =
        //         collateralPosition.collateralAmount.times(
        //           collateralPrices.get(
        //             collateralPosition.underlyingTokenAddress
        //           )!
        //         );
        //     }

        //     await ctx.store.upsert(collateralPositionSnapshot);
        //   });

        // await Promise.all(processCollateralPositionSnapshotsPromises);
      },
      3,
      60
    );
  // .onTimeInterval(
  //   async (_, ctx) => {
  //     //debug
  //     const marketBasicsCall = ctx.contract.functions.get_market_basics()
  //     const marketBasicsRes = await marketBasicsCall.get()

  //     const marketBasicsWithInterestCall = ctx.contract.functions.get_market_basics_with_interest()
  //     const marketBasicsWithInterestRes = await marketBasicsWithInterestCall.get()

  //     console.log("marketBasics", JSON.stringify(marketBasicsRes), ctx.timestamp)
  //     console.log("marketBasicsWithInterest", JSON.stringify(marketBasicsWithInterestRes), ctx.timestamp)

  //   }, 1, 60 * 24 * 7
  // )
});


function customReplacer(key: string, value: any) {
  if (typeof value === 'bigint') {
    return value.toString(); // Convert BigInt to string
  }
  if (typeof value === 'object' && value !== null && 'intValue' in value) {
    // Handle objects with "intValue"
    return value.intValue;
  }
  return value; // Return other values as is
}