import { ZERO_ADDRESS } from './consts.js';

export const sentioTokens = {
    WETH: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
    wstETH: '0x7f39c581f595b53c5cb19bd0b3f8da6c935e2ca0',
    APE: '0x4d224452801aced8b2f0aebe155379bb5d594381',
    DAI: '0x6b175474e89094c44da98b954eedeac495271d0f',
    USDC: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
    USDT: '0xdac17f958d2ee523a2206206994597c13d831ec7',
    LOOKS: '0xf4d2888d29d722226fafa5d9b24f9164c092421e',
};

export const arbitrumTokens = {
    WETH: '0x82af49447d8a07e3bd95bd0d56f35241523fbab1',
    USDT: '0xfd086bc7cd5c481dcc9c85ebe478a1c0b69fcbb9',
    DAI: '0xda10009cbd5d07dd0cecc66161fc93d7c9000da1',
};

export const ethereumTokens = {
    wstETH: '0x7f39c581f595b53c5cb19bd0b3f8da6c935e2ca0',
    APE: '0x4d224452801aced8b2f0aebe155379bb5d594381',
    LOOKS: '0xf4d2888d29d722226fafa5d9b24f9164c092421e',
    USDC: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
    WETH: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
    USDT: '0xdac17f958d2ee523a2206206994597c13d831ec7',
};

export const syPricingStrategies = {
    GLP: {
        pToken: sentioTokens.WETH,
        pTokenIndex: 1,
        pTokenAddress: arbitrumTokens.WETH,
    },
    stETH: {
        pToken: sentioTokens.wstETH,
        pTokenIndex: 3,
        pTokenAddress: ethereumTokens.wstETH,
    },
    APE: {
        pToken: sentioTokens.APE,
        pTokenIndex: 0,
        pTokenAddress: ethereumTokens.APE,
    },
    GDAI: {
        pToken: sentioTokens.DAI,
        pTokenIndex: 0,
        pTokenAddress: arbitrumTokens.DAI,
    },
    FRAX_USDC: {
        pToken: sentioTokens.USDC,
        pTokenIndex: 2,
        pTokenAddress: ethereumTokens.USDC,
    },
    LOOKS: {
        pToken: sentioTokens.LOOKS,
        pTokenIndex: 0,
        pTokenAddress: ethereumTokens.LOOKS,
    },
    STG_USDT_ETH: {
        pToken: sentioTokens.USDT,
        pTokenIndex: 0,
        pTokenAddress: ethereumTokens.USDT,
    },
    STG_USDT_ARB: {
        pToken: sentioTokens.USDT,
        pTokenIndex: 0,
        pTokenAddress: arbitrumTokens.USDT,
    },
    BALANCER_WSTETH: {
        pToken: sentioTokens.WETH,
        pTokenIndex: 2,
        pTokenAddress: ethereumTokens.WETH,
    },
    BALANCER_RETH: {
        pToken: sentioTokens.WETH,
        pTokenIndex: 2,
        pTokenAddress: ethereumTokens.WETH,
    },
    BALANCER_ANKRETH: {
        pToken: sentioTokens.WETH,
        pTokenIndex: 1,
        pTokenAddress: ethereumTokens.WETH,
    },
    SFRX_ETH: {
        pToken: sentioTokens.WETH,
        pTokenIndex: 0,
        pTokenAddress: ZERO_ADDRESS,
    },
    STAFI_ETH: {
        pToken: sentioTokens.WETH,
        pTokenIndex: 2,
        pTokenAddress: ZERO_ADDRESS,
    }
};
