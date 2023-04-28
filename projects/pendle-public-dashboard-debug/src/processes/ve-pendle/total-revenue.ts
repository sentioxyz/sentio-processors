import {
    CreateYieldContractEvent,
    PendleYieldContractFactoryContext,
    PendleYieldContractFactoryProcessor,
} from '../../types/eth/pendleyieldcontractfactory.js';
import config from '../../config/main.json';
import {
    StandardizedYieldContext,
    StandardizedYieldProcessorTemplate,
    getStandardizedYieldContract,
} from '../../types/eth/standardizedyield.js';
import { TransferEvent } from '../../types/eth/pendlemarket.js';
import { ERC20Processor, ERC20ProcessorTemplate } from '@sentio/sdk/eth/builtin';
import { getSYTokenPrice } from '../../helpers/sy-pricing.js';
import { Counter, Gauge } from '@sentio/sdk';
import { ERC20Context, getERC20Contract } from '@sentio/sdk/eth/builtin/erc20';
import { getPriceBySymbol, getPriceByType } from '@sentio/sdk/utils';
import { TREASURY_ARBITRUM, TREASURY_ETHEREUM } from '../../helpers/consts.js';
import { FEE_TYPE, getSYName } from '../../helpers/labeling.js';

const revenueByToken = Counter.register('revenue_by_token', {
    sparse: false
});

const FILTER_TREASURY = [
    ERC20Processor.filters.Transfer(null, TREASURY_ETHEREUM),
    ERC20Processor.filters.Transfer(null, TREASURY_ARBITRUM),
];

export async function totalRevenue_handleYieldContractCreated(
    event: CreateYieldContractEvent,
    ctx: PendleYieldContractFactoryContext
) {
    const SY = getStandardizedYieldContract(ctx, event.args.SY);
    SYTemplate.bind({
        address: event.args.SY,
        startBlock: ctx.blockNumber,
        network: ctx.getChainId(),
    });

    const rewardTokens = await SY.getRewardTokens();
    for (let token of rewardTokens) {
        RewardTokenTemplate.bind({
            address: token,
            startBlock: ctx.blockNumber,
            network: ctx.getChainId(),
        });
    }
}

const SYTemplate = new StandardizedYieldProcessorTemplate().onEventTransfer(
    handleSYTransfer,
    FILTER_TREASURY
)
// .onTimeInterval(async (blk, ctx) => {
//     const symbol = await getSYName(ctx);
//     revenueByToken.add(ctx, 0.000001, { token: symbol, type: FEE_TYPE.SWAP_FEE });
// }, 60).onTimeInterval(async (blk, ctx) => {
//     const symbol = await getSYName(ctx);
//     revenueByToken.add(ctx, 0.000001, { token: symbol, type: FEE_TYPE.YT_FEE });
// }, 59);


const RewardTokenTemplate = new ERC20ProcessorTemplate().onEventTransfer(
    handleRewardTokenTransfer,
    FILTER_TREASURY
)
// .onTimeInterval(async (blk, ctx) => {
//     const symbol = await getSYName(ctx);
//     revenueByToken.add(ctx, 0.000001, { token: symbol, type: FEE_TYPE.YT_FEE });
// }, 60);


async function handleSYTransfer(event: TransferEvent, ctx: StandardizedYieldContext) {
    try {
        const amount = event.args.value.scaleDown(await ctx.contract.decimals());
        const price = await getSYTokenPrice(ctx, event.address);


        const senderContract = await getERC20Contract(ctx, event.args.from);
        const feeType = (await senderContract.symbol()).startsWith("YT") ? FEE_TYPE.YT_FEE : FEE_TYPE.SWAP_FEE;

        const symbol = await getSYName(ctx);
        revenueByToken.add(ctx, amount.times(price), { token: symbol, type: feeType });

        if (amount.times(price).lt(0)) {
            console.log("negative revenue", amount, price);
        }
    } catch (e) {
        console.log(e, ctx.address);
    }
}

async function handleRewardTokenTransfer(event: TransferEvent, ctx: ERC20Context) {
    try {
        const amount = event.args.value.scaleDown(await ctx.contract.decimals());
        const price = await getPriceByType(ctx.getChainId(), event.address, ctx.timestamp);

        if (!price) return;
        revenueByToken.add(ctx, amount.times(price), { token: await ctx.contract.symbol(), type: FEE_TYPE.YT_FEE });

        if (amount.times(price).lt(0)) {
            console.log("negative revenue", amount, price);
        }

    } catch (e) {
        console.log(e, ctx.address);
    }
}
