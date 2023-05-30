export const CoinInfoMap: { [address: string]: { symbol: string, decimal: number } } = {
    "0x0782b6d8c4551b9760e74c0545a9bcd90bdc41e5": {
        symbol: "hay", decimal: 18
    },
    "0xe9e7cea3dedca5984780bafc599bd69add087d56": {
        symbol: "busd", decimal: 18
    },
    "0x55d398326f99059ff775485246999027b3197955": {
        symbol: "usdt", decimal: 18
    },
    "0x8ac76a51cc950d9822d68b83fe1ad97b32cd580d": {
        symbol: "usdc", decimal: 18
    },
    "0x4268b8f0b87b6eae5d897996e6b845ddbd99adf3": {
        symbol: "axlUSDC", decimal: 6
    },
    "0x1bdd3cf7f79cfb8edbb955f20ad99211551ba275": {
        symbol: "BNBx", decimal: 18
    },
    "0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c": {
        symbol: "WBNB", decimal: 18
    },
    "0xc2e9d07f66a89c44062459a47a0d2dc038e4fb16": {
        symbol: "stkBNB", decimal: 18
    }
}


export const PoolInfoMap: { [address: string]: { poolName: string, token0: string, token1: string } } = {
    "0x6d8fba276ec6f1eda2344da48565adbca7e4ffa5": {
        poolName: "axlUSDC/USDT", token0: "0x4268b8f0b87b6eae5d897996e6b845ddbd99adf3", token1: "0x55d398326f99059ff775485246999027b3197955"
    },
    "0x169f653a54acd441ab34b73da9946e2c451787ef": {
        poolName: "USDT/BUSD", token0: "0x55d398326f99059ff775485246999027b3197955", token1: "0xe9e7cea3dedca5984780bafc599bd69add087d56"
    },
    "0xc2f5b9a3d9138ab2b74d581fc11346219ebf43fe": {
        poolName: "USDC/BUSD", token0: "0x8ac76a51cc950d9822d68b83fe1ad97b32cd580d", token1: "0xe9e7cea3dedca5984780bafc599bd69add087d56"
    },
    "0x3efebc418efb585248a0d2140cfb87afcc2c63dd": {
        poolName: "USDT/USDC", token0: "0x55d398326f99059ff775485246999027b3197955", token1: "0x8ac76a51cc950d9822d68b83fe1ad97b32cd580d"
    },
    "0x49079d07ef47449af808a4f36c2a8dec975594ec": {
        poolName: "HAY/BUSD", token0: "0x0782b6d8c4551b9760e74c0545a9bcd90bdc41e5", token1: "0xe9e7cea3dedca5984780bafc599bd69add087d56"
    },
    "0xb1da7d2c257c5700612bde35c8d7187dc80d79f1": {
        poolName: "HAY/USDT", token0: "0x0782b6d8c4551b9760e74c0545a9bcd90bdc41e5", token1: "0x55d398326f99059ff775485246999027b3197955"
    },
    "0x9c138be1d76ee4c5162e0fe9d4eea5542a23d1bd": {
        poolName: "BNBx/WBNB", token0: "0x1bdd3cf7f79cfb8edbb955f20ad99211551ba275", token1: "0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c"
    },
    "0x0b03e3d6ec0c5e5bbf993ded8d947c6fb6eec18d": {
        poolName: "WBNB/stkBNB", token0: "0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c", token1: "0xc2e9d07f66a89c44062459a47a0d2dc038e4fb16"
    }
}



