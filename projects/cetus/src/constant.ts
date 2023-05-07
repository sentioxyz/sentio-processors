export const CLMM_MAINNET = "0x1eabed72c53feb3805120a081dc15963c204dc8d091542592abaf7a35689b2fb"
export const INTEGRATE_MAINNET = "0x2eeaab737b37137b94bfa8f841f92e36a153641119da3456dec1926b9960d9be"

export const POOLS_INFO_MAINNET: { [address: string]: { pairName: string } } = {
    "0xc8d7a1503dc2f9f5b05449a87d8733593e2f0f3e7bffd90541252782e4d2ca20": { pairName: "USDT-USDC 0.01%" },
    "0x5b0b24c27ccf6d0e98f3a8704d2e577de83fa574d3a9060eb8945eeb82b3e2df": { pairName: "WETH-USDC 0.25%" },
    "0xcf994611fd4c48e277ce3ffd4d4364c914af2c3cbb05f7bf6facd371de688630": { pairName: "SUI-USDC 0.25%" },
    "0x2944d4508c6972f858e8919d6e03d3609dfa4a427007c1d637413066b8e93fa7": { pairName: "SUI-USDC 0.01%" },
    "0x58fa2616cbaf4051d60d96cc31cd9a546a831676d3f1a9a6c160d6c783c08dc6": { pairName: "SUI-USDC 1%" },
    "0x1537fa369c20f39a1a5f1a9c78368af64a3c32e4c770c8561d5b3d9f57024ca9": { pairName: "SUI-USDC 0.05%" },
    "0xc93fb2ccd960bd8e369bd95a7b2acd884abf45943e459e95835941322e644ef1": { pairName: "USDCso-USDC 0.25%" },
    "0xad1b2a78890b46eb47d872916df18d2bf3f4629c244539989b3a8546b5a0b4ed": { pairName: "SHIBA-USDC 0.25%" },
    "0x9ddb0d269d1049caf7c872846cc6d9152618d1d3ce994fae84c1c051ee23b179": { pairName: "WSOL-USDC 0.01%" },
    "0x31970253068fc315682301b128b17e6c84a60b1cf0397641395d2b65268ed924": { pairName: "WBNB-USDC 0.25%" },
    "0xaa57c66ba6ee8f2219376659f727f2b13d49ead66435aa99f57bb008a64a8042": { pairName: "WBTC-USDC 0.25%" },
    "0xccf8fe1a4ae49e60757e807e4750b595062631ae2d19d33458d30e9e467631d4": { pairName: "WMATIC-USDC 0.25%" },
    "0x06d8af9e6afd27262db436f0d37b304a041f710c3ea1fa4c3a9bab36b3569ad3": { pairName: "USDT-SUI 0.25%" },
    "0xc86cf8ad40140212e099bed777e39434a17a66abfc96dc01e366d770d9a5bada": { pairName: "SPEPE-SUI 1.0%" }
}

export const CoinInfoMap_MAINNET: { [address: string]: { symbol: string, decimal: number } } = {
    "0xc060006111016b8a020ad5b33834984a437aaa7d3c74c18e09a95d48aceab08c": {
        symbol: "USDT", decimal: 6
    },
    "0x5d4b302506645c37ff133b98c4b50a5ae14841659738d6d733d59d0d217a93bf": {
        symbol: "USDC", decimal: 6
    },
    "0xaf8cd5edc19c4512f4259f0bee101a40d41ebed738ade5874359610ef8eeced5": {
        symbol: "WETH", decimal: 8
    },
    "0x27792d9fed7f9844eb4839566001bb6f6cb4804f66aa2da6fe1ee242d896881": {
        symbol: "WBTC", decimal: 8
    },
    "0x2": {
        symbol: "SUI", decimal: 9
    },
    "0xb231fcda8bbddb31f2ef02e6161444aec64a514e2c89279584ac9806ce9cf037": {
        symbol: "USDCSO", decimal: 6
    },
    "0xd01cebc27fe22868df462f33603646549e13a4b279f5e900b99b9843680445e1": {
        symbol: "SHIBA", decimal: 6
    },
    "0xb848cce11ef3a8f62eccea6eb5b35a12c4c2b1ee1af7755d02d7bd6218e8226f": {
        symbol: "WBNB", decimal: 8
    },
    "0xb7844e289a8410e50fb3ca48d69eb9cf29e27d223ef90353fe1bd8e27ff8f3f8": {
        symbol: "WSOL", decimal: 8
    },
    "0xdbe380b13a6d0f5cdedd58de8f04625263f113b3f9db32b3e1983f49e2841676": {
        symbol: "WMATIC", decimal: 8
    },
    "0xebbf537bc3686be32fe22b498b42715641bbb209267be72236a352e0444cc5df": {
        symbol: "SPEPE", decimal: 6
    }
}