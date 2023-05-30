export const CoinInfoMap: { [address: string]: { symbol: string, decimal: number } } = {
    "0x0782b6d8c4551B9760e74c0545a9bCD90bdc41E5": {
        symbol: "hay", decimal: 18
    },
    "0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56": {
        symbol: "busd", decimal: 18
    },
    "0x55d398326f99059fF775485246999027B3197955": {
        symbol: "bsc-usd", decimal: 18
    },
    "0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d": {
        symbol: "usdc", decimal: 18
    }
}


export const PoolInfoMap: { [address: string]: { token0: string, token1: string } } = {
    "0x3EFebC418efB585248A0D2140cfb87aFcc2C63DD": {
        token0: "0x55d398326f99059fF775485246999027B3197955", token1: "0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d"
    },
    "0x49079D07ef47449aF808A4f36c2a8dEC975594eC": {
        token0: "0x0782b6d8c4551B9760e74c0545a9bCD90bdc41E5", token1: "0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56"
    },
    "0xc2F5B9a3d9138ab2B74d581fC11346219eBf43Fe": {
        token0: "0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d", token1: "0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56"
    },
    "0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d": {
        token0: "0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d", token1: "0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56"
    }
}