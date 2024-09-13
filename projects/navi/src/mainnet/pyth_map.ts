const PRICE_ID_LIST =
    [
        {
            "Symbol": "Crypto.SUI/USD",
            "PriceID": "0x23d7315113f5b1d3ba7a83604c44b94d79f4fd69af77f804fc7f920a6dc65744"
        },
        {
            "Symbol": "Crypto.USDC/USD",
            "PriceID": "0xeaa020c61cc479712813461ce153894a96a6c00b21ed0cfc2798d1f9a9e9c94a"
        },
        {
            "Symbol": "Crypto.USDT/USD",
            "PriceID": "0x2b89b9dc8fdf9f34709a5b106b472f0f39bb6ca9ce04b0fd7f2e971688e2e53b"
        },
        {
            "Symbol": "Crypto.ETH/USD",
            "PriceID": "0xff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace"
        },
        {
            "Symbol": "Crypto.HASUI/USD",
            "PriceID": "0x6120ffcf96395c70aa77e72dcb900bf9d40dccab228efca59a17b90ce423d5e8"
        },
        {
            "Symbol": "Crypto.VSUI/USD",
            "PriceID": "0x57ff7100a282e4af0c91154679c5dae2e5dcacb93fd467ea9cb7e58afdcfde27"
        },
        {
            "Symbol": "Crypto.CETUS/USD",
            "PriceID": "0xe5b274b2611143df055d6e7cd8d93fe1961716bcd4dca1cad87a83bc1e78c1ef"
        },
        {
            "Symbol": "Crypto.NAVX/USD",
            "PriceID": "0x88250f854c019ef4f88a5c073d52a18bb1c6ac437033f5932cd017d24917ab46"
        },
        {
            "Symbol": "Crypto.WBTC/USD",
            "PriceID": "0xc9d8b075a5c69303365ae23633d4e085199bf5c520a3b90fed1322a0342ffc33"
        }
    ]

export const PRICE_MAP = new Map<string, string>(
    PRICE_ID_LIST.map(pair => [pair.PriceID, pair.Symbol])
);