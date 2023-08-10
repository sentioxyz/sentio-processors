export const CoinInfoMap: { [address: string]: { symbol: string, decimal: number } } = {
    "0x0782b6d8c4551b9760e74c0545a9bcd90bdc41e5": {
        symbol: "hay", decimal: 18
    },
    "0xe9e7cea3dedca5984780bafc599bd69add087d56": {
        symbol: "busd", decimal: 18
    },
    "0x55d398326f99059ff775485246999027b3197955": {
        symbol: "bsc-usd", decimal: 18
    },
    "0x8ac76a51cc950d9822d68b83fe1ad97b32cd580d": {
        symbol: "usdc", decimal: 18
    }
}


export const PoolInfoMap: { [address: string]: { token0: string, token1: string } } = {
    "0x3efebc418efb585248a0d2140cfb87afcc2c63dd": {
        token0: "0x55d398326f99059ff775485246999027b3197955", token1: "0x8ac76a51cc950d9822d68b83fe1ad97b32cd580d"
    },
    "0x49079d07ef47449af808a4f36c2a8dec975594ec": {
        token0: "0x0782b6d8c4551b9760e74c0545a9bcd90bdc41e5", token1: "0xe9e7cea3dedca5984780bafc599bd69add087d56"
    },
    "0xc2f5b9a3d9138ab2b74d581fc11346219ebf43fe": {
        token0: "0x8ac76a51cc950d9822d68b83fe1ad97b32cd580d", token1: "0xe9e7cea3dedca5984780bafc599bd69add087d56"
    },
    "0x8ac76a51cc950d9822d68b83fe1ad97b32cd580d": {
        token0: "0x8ac76a51cc950d9822d68b83fe1ad97b32cd580d", token1: "0xe9e7cea3dedca5984780bafc599bd69add087d56"
    }
}