import { SuiContext } from "@sentio/sdk/sui";
import { Counter, Gauge } from "@sentio/sdk";

import {
  getDecimalBySymbol,
  COIN_MAP,
  applyTokenDecimalPrecision,
  getVaultTypeByAccountCap,
  getCoinSymbolByVaultType,
  getNaviAccountCaps,
  getCurrentDateUTC,
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

// Daily aggregation for each vault
const dailyNaviStats = {
  lastUpdateDate: "",
  vaultRewards: new Map<string, number>(), // vault -> daily total
  coinTypeRewards: new Map<string, number>(), // coinType -> daily total
};

function resolveVaultForAccountCap(accountCap: string): {
  vaultType: string;
  vaultLabel: string;
} | null {
  const vaultType = getVaultTypeByAccountCap(accountCap);
  if (!vaultType) {
    return null;
  }

  const coinSymbol = getCoinSymbolByVaultType(vaultType);
  const vaultLabel = coinSymbol
    ? coinSymbol.toUpperCase()
    : vaultType.replace(/_VAULT$/, "");

  return { vaultType, vaultLabel };
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
  const vaultInfo = resolveVaultForAccountCap(user);
  if (!vaultInfo) {
    // Not from our vaults, skip processing
    return;
  }
  const { vaultType, vaultLabel } = vaultInfo;

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
    vault: vaultLabel,
    vaultType,
    accountCap: user,
    coinType: coinType,
    date: getCurrentDateUTC(),
  });

  naviRewardMetrics.rewardsByCoinType.add(ctx, totalClaimed, {
    vault: vaultLabel,
    vaultType,
    coinType: coinType,
  });

  naviRewardMetrics.totalNaviRewards.add(ctx, totalClaimed, {
    vault: vaultLabel,
    vaultType,
  });

  naviRewardMetrics.lastRewardClaim.record(
    ctx,
    ctx.timestamp.getTime() / 1000,
    {
      vault: vaultLabel,
      vaultType,
      accountCap: user,
    }
  );
}

// Navi rewards processor setup
export function NaviRewardsProcessor() {
  console.log(
    "Setting up Navi rewards monitoring for Volo Vault account caps:"
  );
  console.log("SUIBTC Vault caps:", getNaviAccountCaps("wBTC_VAULT"));
  console.log("XBTC Vault caps:", getNaviAccountCaps("xBTC_VAULT"));

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

export { naviRewardMetrics, handleNaviRewardClaimed };
