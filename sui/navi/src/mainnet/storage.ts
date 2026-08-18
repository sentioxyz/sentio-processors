import { BigDecimal } from "@sentio/sdk";
import { SuiObjectProcessor } from "@sentio/sdk/sui";
import { ChainId } from "@sentio/chain";
import { DECIMAL_RAY, DEFAULT_COIN_DECIMAL } from "./utils.js";
import { ALL_RESERVES } from "./asset-registry.js";
import {
  getCumulativeWithdrawnAmount,
  getTotalCumulativeWithdrawn,
  calculateRealCumulativeRevenue,
  getFeePoolNetGrowth,
  getFeePoolAmount,
  getTreasuryBalanceForPool,
  treasuryKey,
} from "./main.js";

// Reserve object ids for every market, resolved from chain by
// `yarn config:gen` (each market Storage holds a `reserves: Table<u8,
// ReserveData>` whose dynamic fields are assetId -> reserve object).
//
// This list used to be 35 hand-written ids for main market only, so the six
// isolated markets created 2026-08-03 and the Ember/RWA/Sui-Eco markets produced
// no snapshots at all.

export function ProtocolProcessor() {
  for (const asset of ALL_RESERVES) {
    const { marketId, symbol: coin_symbol, reserveId } = asset;
    const market_id = marketId.toString();
    SuiObjectProcessor.bind({
      objectId: reserveId,
      network: ChainId.SUI_MAINNET,
      startCheckpoint: 78000000n,
    }).onTimeInterval(
      async (self, _, ctx) => {
        try {
          const value = (self.fields as any).value.fields;

          const type = String(value.coin_type);
          const id = String(value.id);
          const ltv = BigDecimal(value.ltv).div(Math.pow(10, DECIMAL_RAY));

          const totalSupply = BigDecimal(
            value.supply_balance.fields.total_supply
          ).div(Math.pow(10, DEFAULT_COIN_DECIMAL));

          const totalBorrow = BigDecimal(
            value.borrow_balance.fields.total_supply
          ).div(Math.pow(10, DEFAULT_COIN_DECIMAL));

          const currentSupplyIndex = BigDecimal(value.current_supply_index).div(
            Math.pow(10, DECIMAL_RAY)
          );
          const currentBorrowIndex = BigDecimal(value.current_borrow_index).div(
            Math.pow(10, DECIMAL_RAY)
          );
          //add
          const supplyCapCelling = BigDecimal(value.supply_cap_ceiling).div(
            Math.pow(10, DECIMAL_RAY)
          );
          const borrowCapCeiling = BigDecimal(value.borrow_cap_ceiling).div(
            Math.pow(10, DECIMAL_RAY)
          );
          const treasuryBalance = BigDecimal(value.treasury_balance).div(
            Math.pow(10, DEFAULT_COIN_DECIMAL)
          );
          const currentBorrowRate = BigDecimal(value.current_borrow_rate).div(
            Math.pow(10, DECIMAL_RAY)
          );
          const currentSupplyRate = BigDecimal(value.current_supply_rate).div(
            Math.pow(10, DECIMAL_RAY)
          );

          // Configuration that monitoring needs and nothing emitted before.
          //
          // Alert rules could only compare a value against its own recent history,
          // which cannot express "the LTV must stay below the liquidation threshold"
          // or "the rate must stay under this pool's configured maximum" — those
          // compare against configuration, and the configuration was not in the
          // event. A statistical band is a weaker substitute: it has to be
          // recalibrated, it drifts as it ages, and it cannot tell a value that is
          // unusual from a value that is forbidden.
          const lf = value.liquidation_factors?.fields ?? {};
          const liquidationThreshold = BigDecimal(lf.threshold ?? 0).div(
            Math.pow(10, DECIMAL_RAY)
          );
          const liquidationBonus = BigDecimal(lf.bonus ?? 0).div(
            Math.pow(10, DECIMAL_RAY)
          );
          const liquidationRatio = BigDecimal(lf.ratio ?? 0).div(
            Math.pow(10, DECIMAL_RAY)
          );

          // The rate curve, and the maximum rate it can reach. At full utilisation
          // the borrow rate is base + multiplier * optimal + jump * (1 - optimal),
          // so a pool's ceiling is derivable rather than something to hardcode per
          // asset: for SUI that is 0.01 + 0.02*0.9 + 1.0*0.1 = 12.8%.
          const rf = value.borrow_rate_factors?.fields ?? {};
          const baseRate = BigDecimal(rf.base_rate ?? 0).div(Math.pow(10, DECIMAL_RAY));
          const rateMultiplier = BigDecimal(rf.multiplier ?? 0).div(Math.pow(10, DECIMAL_RAY));
          const jumpRateMultiplier = BigDecimal(rf.jump_rate_multiplier ?? 0).div(
            Math.pow(10, DECIMAL_RAY)
          );
          const optimalUtilization = BigDecimal(rf.optimal_utilization ?? 0).div(
            Math.pow(10, DECIMAL_RAY)
          );
          const maxBorrowRate = baseRate
            .plus(rateMultiplier.multipliedBy(optimalUtilization))
            .plus(jumpRateMultiplier.multipliedBy(BigDecimal(1).minus(optimalUtilization)));

          // When the indices last accrued. Without it, annualising an index delta is
          // meaningless for a pool nobody has touched: the index catches up in one
          // jump covering an unknown period, which made a dormant pool look like it
          // was accruing at 12x its own rate.
          const lastUpdateTimestamp = Number(value.last_update_timestamp ?? 0);

          // Whether this reserve belongs to a single-pair isolated market, straight
          // from the contract. Utilisation sitting at the cap is designed behaviour
          // there and a fault everywhere else, and the alternative was a hardcoded
          // list of market ids that goes stale when a market is added.
          const isIsolated = Boolean(value.is_isolated);

          // Record supply and borrow metrics
          ctx.meter
            .Gauge("total_supply")
            .record(totalSupply, { env: "mainnet", id, type, coin_symbol, market_id });
          ctx.meter
            .Gauge("total_borrow")
            .record(totalBorrow, { env: "mainnet", id, type, coin_symbol, market_id });

          ctx.meter.Gauge("currentSupplyIndex").record(currentSupplyIndex, {
            env: "mainnet",
            id,
            type,
            coin_symbol,
            market_id,
          });
          ctx.meter.Gauge("currentBorrowIndex").record(currentBorrowIndex, {
            env: "mainnet",
            id,
            type,
            coin_symbol,
            market_id,
          });

          ctx.meter.Gauge("supplyCapCeiling").record(supplyCapCelling, {
            env: "mainnet",
            id,
            type,
            coin_symbol,
            market_id,
          });
          ctx.meter.Gauge("borrowCapCeiling").record(borrowCapCeiling, {
            env: "mainnet",
            id,
            type,
            coin_symbol,
            market_id,
          });

          // Record supply and borrow rates
          ctx.meter.Gauge("currentBorrowRate").record(currentBorrowRate, {
            env: "mainnet",
            id,
            type,
            coin_symbol,
            market_id,
          });
          ctx.meter.Gauge("currentSupplyRate").record(currentSupplyRate, {
            env: "mainnet",
            id,
            type,
            coin_symbol,
            market_id,
          });

          ctx.meter
            .Gauge("ltv")
            .record(ltv, { env: "mainnet", id, type, coin_symbol, market_id });

          // Get cumulative withdrawn amount for revenue calculation
          const cumulativeWithdrawn = await getCumulativeWithdrawnAmount(
            ctx,
            treasuryKey(marketId, coin_symbol)
          );

          // Calculate real cumulative revenue using proper logic:
          // NAVI fund flow: lending fees -> fee pool (feeForPool) -> treasury -> WithdrawTreasury
          // Real cumulative revenue = current fee pool accumulated + withdrawn from treasury cumulative
          const realCumulativeRevenue = await calculateRealCumulativeRevenue(
            ctx,
            coin_symbol
          );

          // Get fee pool net growth (cumulative positive changes only)
          const feePoolNetGrowthAmount = getFeePoolNetGrowth(coin_symbol);

          // Get treasury balance for pool from cache
          const treasuryBalanceForPool = getTreasuryBalanceForPool(coin_symbol);

          // Record various metrics
          ctx.meter
            .Gauge("treasuryBalance")
            .record(treasuryBalance, { env: "mainnet", id, type, coin_symbol, market_id });

          // Record real cumulative revenue (corrected version)
          ctx.meter
            .Gauge("realCumulativeRevenue")
            .record(realCumulativeRevenue, {
              env: "mainnet",
              coin_type: type,
              coin_symbol,
              coin_id: asset.assetId.toString(),
              market_id,
            });

          // Record fee pool net growth (cumulative positive changes from fee pool)
          ctx.meter
            .Gauge("feePoolNetGrowthStorage")
            .record(feePoolNetGrowthAmount, {
              env: "mainnet",
              coin_type: type,
              coin_symbol,
              coin_id: asset.assetId.toString(),
              market_id,
            });

          // Record cumulative withdrawn amounts by token for dashboard aggregation
          ctx.meter
            .Gauge("cumulativeWithdrawnByToken")
            .record(cumulativeWithdrawn, {
              env: "mainnet",
              coin_type: type,
              coin_symbol,
              coin_id: asset.assetId.toString(),
              market_id,
            });

          // Record cumulative withdrawn amounts - consistent with feeForPool format
          ctx.meter
            .Gauge("cumulativeWithdrawnForPool")
            .record(cumulativeWithdrawn, {
              env: "mainnet",
              coin_type: type,
              coin_symbol,
              coin_id: asset.assetId.toString(),
              market_id,
            });

          // Emit cumulative withdrawn events by token
          ctx.eventLogger.emit("indexNumberEvent", {
            token: coin_symbol,
            liquidationThreshold,
            liquidationBonus,
            liquidationRatio,
            maxBorrowRate,
            baseRate,
            optimalUtilization,
            lastUpdateTimestamp,
            isIsolated,
            total_supply: totalSupply,
            total_borrow: totalBorrow,
            currentSupplyIndex: currentSupplyIndex,
            currentBorrowIndex: currentBorrowIndex,
            supplyCapCeiling: supplyCapCelling,
            borrowCapCeiling: borrowCapCeiling,
            currentBorrowRate: currentBorrowRate,
            currentSupplyRate: currentSupplyRate,
            ltv: ltv,
            treasuryBalance: treasuryBalance,
            treasuryBalanceForPool: treasuryBalanceForPool,
            market_id,
            env: "mainnet",
          });

          // Emit V2 version event with revenue-related data
          ctx.eventLogger.emit("indexNumberEventV2", {
            token: coin_symbol,
            liquidationThreshold,
            liquidationBonus,
            liquidationRatio,
            maxBorrowRate,
            baseRate,
            optimalUtilization,
            lastUpdateTimestamp,
            isIsolated,
            total_supply: totalSupply,
            total_borrow: totalBorrow,
            currentSupplyIndex: currentSupplyIndex,
            currentBorrowIndex: currentBorrowIndex,
            supplyCapCeiling: supplyCapCelling,
            borrowCapCeiling: borrowCapCeiling,
            currentBorrowRate: currentBorrowRate,
            currentSupplyRate: currentSupplyRate,
            ltv: ltv,
            treasuryBalance: treasuryBalance,
            treasuryBalanceForPool: treasuryBalanceForPool,
            market_id,
            env: "mainnet",
            cumulativeWithdrawn: cumulativeWithdrawn,
            realCumulativeRevenue: realCumulativeRevenue,
            feePoolNetGrowth: feePoolNetGrowthAmount,
            currentFeePool: getFeePoolAmount(coin_symbol),
            revenue_calculation_version: "v2",
          });
        } catch (e) {}
      },
      10,
      10
    );
  }

  // Record total cumulative withdrawn amounts for all tokens after processing individual tokens
  SuiObjectProcessor.bind({
    objectId: ALL_RESERVES[0].reserveId, // Use first reserve as trigger
    network: ChainId.SUI_MAINNET,
    startCheckpoint: 78000000n,
  }).onTimeInterval(
    async (self, _, ctx) => {
      try {
        // Get total cumulative withdrawn amounts for all tokens
        const totalCumulativeWithdrawn = getTotalCumulativeWithdrawn();

        // Record total cumulative withdrawn amounts
        ctx.meter
          .Gauge("totalCumulativeWithdrawnAllTokens")
          .record(totalCumulativeWithdrawn, {
            env: "mainnet",
            coin_type: "ALL",
            coin_symbol: "ALL",
            coin_id: "total",
          });
      } catch (e) {}
    },
    60, // Calculate total every 60 seconds
    60
  );
}
