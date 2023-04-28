import { getERC20Contract } from '@sentio/sdk/eth/builtin/erc20';
import {
    PendleMarketBoundContractView,
    PendleMarketContext,
    PendleMarketContractView,
    PendleMarketProcessorTemplate,
} from '../types/eth/pendlemarket.js';
import {
    CreateNewMarketEvent,
    PendleMarketFactoryContext,
} from '../types/eth/pendlemarketfactory.js';
import { getSYTokenPrice } from '../helpers/sy-pricing.js';
import { BaseContext, BigDecimal, Counter, Gauge, LogLevel } from '@sentio/sdk';
import { getExchangeRateFromLnImpliedRate } from '../helpers/math.js';
import { getStandardizedYieldContract } from '../types/eth/standardizedyield.js';
import { getNormalizedTokenName } from '../helpers/misc.js';
import { TIME_INTERVAL, whitelistedMarkets } from '../helpers/consts.js';

const tradingVolumeCounter = Counter.register('trading_volume', {
    sparse: false,
});
const totalValueLockedGauge = Gauge.register('total_value_locked', {
    sparse: true,
});

export async function tradingVolume_handleCreateNewMarket(
    event: CreateNewMarketEvent,
    ctx: PendleMarketFactoryContext
) {
    if (!whitelistedMarkets.includes(event.args.market.toLowerCase())) return;
    PendleMarketTemplate.bind({
        address: event.args.market,
        startBlock: ctx.blockNumber,
        network: ctx.getChainId(),
    });
}

const PendleMarketTemplate = new PendleMarketProcessorTemplate()
    .onEventSwap(async (event, ctx) => {
        const tokens = await ctx.contract.readTokens();
        const sy = getERC20Contract(ctx, tokens._SY);
        const pt = getERC20Contract(ctx, tokens._PT);

        const syPrice = await getSYTokenPrice(ctx, tokens._SY);
        const decimals = await sy.decimals();
        let totalSyTraded = event.args.netSyOut.scaleDown(decimals);

        if (totalSyTraded.isNegative()) {
            totalSyTraded = totalSyTraded.negated();
        } else {
            totalSyTraded = totalSyTraded.plus(event.args.netSyFee.scaleDown(decimals));
        }
        const volumeUsd = totalSyTraded.times(syPrice);
        tradingVolumeCounter.add(ctx, volumeUsd, {
            pool: getNormalizedTokenName(await pt.name(), ctx.address.toLowerCase()),
        });

        // try {
        //     await recordMarketTvl(ctx);
        // } catch (e) {
        //     ctx.eventLogger.emit('PendleMarket tvl record bug', {
        //         distinctId: ctx.address,
        //         message: e
        //     })
        // }
    })
    .onTimeInterval(async (blk, ctx) => {
        try {
            await recordMarketTvl(ctx);
        } catch (e) {
            ctx.eventLogger.emit('PendleMarket tvl record bug', {
                distinctId: ctx.address,
                message: e
            })
        }
    }, 60, 60);

async function recordMarketTvl(ctx: PendleMarketContext) {
    const market = ctx.contract;
    const tokens = await market.readTokens();
    const sy = getStandardizedYieldContract(ctx, tokens._SY);
    const syDecimals = await sy.decimals();

    const pt = getERC20Contract(ctx, tokens._PT);
    const syPrice = await getSYTokenPrice(ctx, tokens._SY);
    const _storage = await ctx.contract._storage({ blockTag: ctx.blockNumber });

    let tvl = new BigDecimal(0);
    {
        const syBalanceUsd = _storage.totalSy.scaleDown(syDecimals).times(syPrice);
        tvl = tvl.plus(syBalanceUsd);
    }
    {
        const ptBalance = _storage.totalPt;
        const ptDecimals = await pt.decimals();
        const ptBalanceNormalized = ptBalance.scaleDown(ptDecimals);

        const expiry = (await market.expiry()).asBigDecimal();
        const currentTime = new BigDecimal(ctx.timestamp.getTime() / 1000);
        const timeToExpiry = expiry.minus(currentTime);

        const lnRate = _storage.lastLnImpliedRate;

        // this is the rate between asset and pt
        const assetToPtRate = getExchangeRateFromLnImpliedRate(lnRate, timeToExpiry);

        // I read sentio's docs, it might accept negative scale down
        const syToAssetRate = (
            await sy.exchangeRate({ blockTag: ctx.blockNumber })
        ).scaleDown(18n - syDecimals + ptDecimals);
        const ptPrice = syPrice.div(syToAssetRate).div(assetToPtRate);

        tvl = tvl.plus(ptBalanceNormalized.times(ptPrice));
    }
    totalValueLockedGauge.record(ctx, tvl, {
        pool: getNormalizedTokenName(await pt.name(), ctx.address.toLowerCase()),
    });
}

