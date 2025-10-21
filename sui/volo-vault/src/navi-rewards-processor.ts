import { SuiContext } from "@sentio/sdk/sui";
import { ChainId } from "@sentio/chain";
import { Counter, Gauge } from "@sentio/sdk";

// Import Navi incentive_v3 types (temporarily commented out for build fix)
// TODO: Re-enable after proper type setup
// import { incentive_v3 } from "./types/sui/0x81c408448d0d57b3e371ea94de1d40bf852784d3e225de1e74acab3e8395c18f.js";

import {
  NAVI_ACCOUNT_CAPS,
  VAULT_ADDRESSES,
  getDecimalBySymbol,
  COIN_MAP,
  applyTokenDecimalPrecision,
} from "./utils.js";

// Navi reward metrics for Volo Vault integration
const naviRewardMetrics = {
  // Daily rewards claimed from Navi protocol
  dailyNaviRewards: Counter.register("naviDailyRewards", {
    description:
      "Daily rewards claimed from Navi protocol by vault account caps",
  }),

  // Rewards by vault and coin type
  rewardsByCoinType: Counter.register("naviRewardsByCoinType", {
    description: "Navi rewards claimed by coin type",
  }),

  // Total rewards claimed (cumulative)
  totalNaviRewards: Counter.register("naviTotalRewards", {
    description: "Total cumulative rewards claimed from Navi protocol",
  }),

  // Last reward claim timestamp
  lastRewardClaim: Gauge.register("naviLastRewardClaim", {
    description: "Timestamp of last reward claim from Navi",
  }),
};

// Track which account cap addresses belong to which vault
const ACCOUNT_CAP_TO_VAULT_MAP: Record<string, string> = {
  // SUIBTC Vault account caps
  [NAVI_ACCOUNT_CAPS.SUIBTC_VAULT.naviAccountCap0]: "SUIBTC",
  [NAVI_ACCOUNT_CAPS.SUIBTC_VAULT.naviAccountCap1]: "SUIBTC",

  // XBTC Vault account caps
  [NAVI_ACCOUNT_CAPS.XBTC_VAULT.naviAccountCap0]: "XBTC",
  [NAVI_ACCOUNT_CAPS.XBTC_VAULT.naviAccountCap1]: "XBTC",
};

// Daily aggregation for each vault
const dailyNaviStats = {
  lastUpdateDate: "",
  vaultRewards: new Map<string, number>(), // vault -> daily total
  coinTypeRewards: new Map<string, number>(), // coinType -> daily total
};

// Helper functions
function getCurrentDateUTC(): string {
  return new Date().toISOString().split("T")[0];
}

function getVaultByAccountCap(accountCap: string): string | undefined {
  return ACCOUNT_CAP_TO_VAULT_MAP[accountCap];
}

function updateDailyNaviStats(ctx: SuiContext) {
  const currentDate = getCurrentDateUTC();

  // Reset daily stats if it's a new day
  if (dailyNaviStats.lastUpdateDate !== currentDate) {
    dailyNaviStats.lastUpdateDate = currentDate;
    dailyNaviStats.vaultRewards.clear();
    dailyNaviStats.coinTypeRewards.clear();
  }
}

// Navi RewardClaimed event handler (based on navi project implementation)
// TODO: Re-enable proper typing after type setup
async function handleNaviRewardClaimed(
  event: any, // incentive_v3.RewardClaimedInstance,
  ctx: SuiContext
) {
  const data = event.data_decoded;
  const user = data.user; // Account cap address
  const rawTotalClaimed = data.total_claimed;
  const coinType = data.coin_type;
  const ruleIds = data.rule_ids;
  const ruleIndices = data.rule_indices;

  const coinSymbol = COIN_MAP[coinType] || "UNKNOWN";
  const decimal = getDecimalBySymbol(coinSymbol) || 9;
  const totalClaimed = applyTokenDecimalPrecision(
    Number(rawTotalClaimed),
    decimal
  );

  console.log(
    `🎯 Navi Reward: ${coinSymbol} rawAmount=${rawTotalClaimed} normalized=${totalClaimed} decimal=${decimal}`
  );

  // Check if this reward claim is from one of our monitored account caps
  const vaultType = getVaultByAccountCap(user);
  if (!vaultType) {
    // Not from our vaults, skip processing
    return;
  }

  // Update daily statistics
  updateDailyNaviStats(ctx);

  // Update vault-specific daily rewards
  const currentVaultRewards = dailyNaviStats.vaultRewards.get(vaultType) || 0;
  dailyNaviStats.vaultRewards.set(
    vaultType,
    currentVaultRewards + totalClaimed
  );

  // Update coin-type-specific daily rewards
  const currentCoinRewards = dailyNaviStats.coinTypeRewards.get(coinType) || 0;
  dailyNaviStats.coinTypeRewards.set(
    coinType,
    currentCoinRewards + totalClaimed
  );

  // Record metrics
  naviRewardMetrics.dailyNaviRewards.add(ctx, totalClaimed, {
    vault: vaultType,
    accountCap: user,
    coinType: coinType,
    date: getCurrentDateUTC(),
  });

  naviRewardMetrics.rewardsByCoinType.add(ctx, totalClaimed, {
    vault: vaultType,
    coinType: coinType,
  });

  naviRewardMetrics.totalNaviRewards.add(ctx, totalClaimed, {
    vault: vaultType,
  });

  naviRewardMetrics.lastRewardClaim.record(
    ctx,
    ctx.timestamp.getTime() / 1000,
    {
      vault: vaultType,
      accountCap: user,
    }
  );
}

// Navi rewards processor setup
export function NaviRewardsProcessor() {
  console.log(
    "Setting up Navi rewards monitoring for Volo Vault account caps:"
  );
  console.log(
    "SUIBTC Vault caps:",
    Object.values(NAVI_ACCOUNT_CAPS.SUIBTC_VAULT)
  );
  console.log("XBTC Vault caps:", Object.values(NAVI_ACCOUNT_CAPS.XBTC_VAULT));

  // Bind to incentive_v3 contract to monitor RewardClaimed events
  // TODO: Re-enable after type setup
  /* 
  incentive_v3
    .bind({
      address:
        "0x81c408448d0d57b3e371ea94de1d40bf852784d3e225de1e74acab3e8395c18f",
      network: ChainId.SUI_MAINNET,
      startCheckpoint: 175000000n,
    })
    .onEventRewardClaimed(handleNaviRewardClaimed);
  */
}

export { naviRewardMetrics, ACCOUNT_CAP_TO_VAULT_MAP, handleNaviRewardClaimed };
