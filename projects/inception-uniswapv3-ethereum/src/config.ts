import { EthChainId } from "@sentio/sdk/eth"

export const NETWORK = EthChainId.ETHEREUM
export const NONFUNGIBLE_POSITION_MANAGER_CONTRACT_ADDRESS =
  "0xC36442b4a4522E871399CD717aBDD847Ab11FE88"
export const INSTETH_ADDRESS = "0x7FA768E035F956c41d6aeaa3Bd857e7E5141CAd5"
export const WSTETH_ADDRESS = "0x7f39C581F595B53c5cb19bD0b3f8dA6c935E2Ca0"
export const POOL_ADDRESS = "0x357175ee9822a43b2fdeba5ead63313f6376c75e"
export const POOL_FEE = 500
export const START_BLOCK = 19150029



export interface PoolInfo {
  token0: string,
  token1: string,
  fee: number,
  token0InceptionEthToken: boolean,
  poolAddress: string,
  startBlock: number,
  token: string
}


export const POOL_MAP: { [key: string]: PoolInfo } = {
  "wstETH-instETH": {
    token0: "0x7f39c581f595b53c5cb19bd0b3f8da6c935e2ca0",
    token1: "0x7fa768e035f956c41d6aeaa3bd857e7e5141cad5",
    fee: 500,
    token0InceptionEthToken: false,
    poolAddress: "0x357175ee9822a43b2fdeba5ead63313f6376c75e",
    startBlock: 19150029,
    token: "instETH"
  },
  "inrETH-rETH": {
    token0: "0x80d69e79258fe9d056c822461c4eb0b4ca8802e2",
    token1: "0xae78736cd615f374d3085123a210448e74fc6393",
    fee: 500,
    token0InceptionEthToken: true,
    poolAddress: "0x9600f9185c3f486f1ab9fb481b75cc8a31b22a58",
    startBlock: 19150150,
    token: "inrETH"
  },
  "ankrETH-InankrETH": {
    token0: "0xE95A203B1a91a908F9B9CE46459d101078c2c3cb",
    token1: "0xfa2629B9cF3998D52726994E0FcdB750224D8B9D",
    fee: 500,
    token0InceptionEthToken: false,
    poolAddress: "0x32148b791363fdc785be3907ad98afe7e94f3144",
    startBlock: 19150375,
    token: "inankrETH"
  },
  "osETH-InosETH": {
    token0: "0xf1C9acDc66974dFB6dEcB12aA385b9cD01190E38",
    token1: "0xfD07fD5EBEa6F24888a397997E262179Bf494336",
    fee: 500,
    token0InceptionEthToken: false,
    poolAddress: "0x8637a07ba774537a4365fb9a3e4a9f7110a76b1d",
    startBlock: 19150403,
    token: "inosETH"
  },
  "cbETH-IncbETH": {
    token0: "0xBe9895146f7AF43049ca1c1AE358B0541Ea49704",
    token1: "0xBf19Eead55a6B100667f04F8FBC5371E03E8ab2E",
    fee: 500,
    token0InceptionEthToken: false,
    poolAddress: "0xd03feda43db80b260b970fb3d852ede11125a8aa",
    startBlock: 19150365,
    token: "incbETH"
  },
  "wBETH-InwbETH": {
    token0: "0xa2E3356610840701BDf5611a53974510Ae27E2e1",
    token1: "0xDA9B11Cd701e10C2Ec1a284f80820eDD128c5246",
    fee: 500,
    token0InceptionEthToken: false,
    poolAddress: "0xf33bd083854189f4d5f75e48846346d4c431e0e7",
    startBlock: 19150389,
    token: "inwbETH"
  },
  "InswETH-swETH": {
    token0: "0xC3ADe5aCe1bBb033CcAE8177C12Ecbfa16bD6A9D",
    token1: "0xf951E335afb289353dc249e82926178EaC7DEd78",
    fee: 500,
    token0InceptionEthToken: true,
    poolAddress: "0xd6716ec5871515eca1cfa9de5e0a062cef699b1a",
    startBlock: 19150417,
    token: "inswETH"
  },
  "InETHx-ETHx": {
    token0: "0x57a5a0567187FF4A8dcC1A9bBa86155E355878F2",
    token1: "0xA35b1B31Ce002FBF2058D22F30f95D405200A15b",
    fee: 500,
    token0InceptionEthToken: true,
    poolAddress: "0xb63e836a2da30a89cccfe207e53e28b5404186b5",
    startBlock: 19150427,
    token: "inETHx"
  },
  "OETH-InoETH": {
    token0: "0x856c4Efb76C1D1AE02e20CEB03A2A6a08b0b8dC3",
    token1: "0x9181f633E9B9F15A32d5e37094F4C93b333e0E92",
    fee: 500,
    token0InceptionEthToken: false,
    poolAddress: "0xe6eb65f9c316eba4ba55e02dc9acc1a0f5019329",
    startBlock: 19150439,
    token: "inoETH"
  },
  "InsfrxETH-sfrxETH": {
    token0: "0x668308d77be3533c909a692302Cb4D135Bf8041C",
    token1: "0xac3E018457B222d93114458476f3E3416Abbe38F",
    fee: 500,
    token0InceptionEthToken: true,
    poolAddress: "0x77558f80aee6a420bccc9380d2f2c0ea823e1d81",
    startBlock: 19150472,
    token: "insfrxETH"
  },
  "mETH-InmETH": {
    token0: "0xd5F7838F5C461fefF7FE49ea5ebaF7728bB0ADfa",
    token1: "0xeCf3672A6d2147E2A77f07069Fb48d8Cf6F6Fbf9",
    fee: 500,
    token0InceptionEthToken: true,
    poolAddress: "0xf3fd078d7d76a579d3063c8c66204bfd8f1d0c2e",
    startBlock: 19150448,
    token: "inmETH"
  },
  "LsETH-InlsETH": {
    token0: "0x8c1BEd5b9a0928467c9B1341Da1D7BD5e10b6549",
    token1: "0x94B888E11a9E960A9c3B3528EB6aC807B27Ca62E",
    fee: 500,
    token0InceptionEthToken: false,
    poolAddress: "0x972fd2ad6df74abe9f52400bf8af03d20ee0bfd5",
    startBlock: 19150498,
    token: "inlsETH"
  }
}
