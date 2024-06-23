import { EthChainId } from "@sentio/sdk/eth";

export const NETWORK = EthChainId.ETHEREUM

export interface PoolInfo {
    poolAddress: string,
    gaugeExists: boolean,
    gaugeAddress: string,
    gaugeStartBlock: number
}
export const map: { [key: string]: PoolInfo } = {
    "instETH": {
        poolAddress: "0x5378c23f4cf85fc28fddea16153cf9213aefe9be",
        gaugeExists: true,
        gaugeAddress: "0x9fb7c82dac1823a472def8b506ea70fdbfc3fc3f",
        gaugeStartBlock: 19493239
    },
    "inswETH": {
        poolAddress: "0x51fd52420ce0c8df1fcf36c9511f01998de73887",
        gaugeExists: true,
        gaugeAddress: "0x3ed4de2fabd03a6fd289851544c1065b961bd195",
        gaugeStartBlock: 19493314
    },
    "inrETH": {
        poolAddress: "0x98407609f0911b57a8666a48c74666bafbaef501",
        gaugeExists: true,
        gaugeAddress: "0xdd2d0d32dcae80e4cbd87a609cc72f5b1a042548",
        gaugeStartBlock: 19493232
    },
    "inankrETH": {
        poolAddress: "0x68e26daf88da63bebd3da05fc9c880fa37080d3e",
        gaugeExists: true,
        gaugeAddress: "0x5d0bb2c582e9298e33e8d2fba3d5a278a8f28553",
        gaugeStartBlock: 19493273
    },
    "insfrxETH": {
        poolAddress: "0x15061e372d50792b68a8e400e89a5da0e4861236",
        gaugeExists: true,
        gaugeAddress: "0x319b3ec2945ee430d8418ae6e9e1e6f8abbbb754",
        gaugeStartBlock: 19493334
    },
    "inETHx": {
        poolAddress: "0x952de65765c1fb6181280bb4fa059cb616e35832",
        gaugeExists: true,
        gaugeAddress: "0x3422079e3d4e04f8a10c65ca4ff4a222457fdd68",
        gaugeStartBlock: 19588361
    },
    "inmETH": {
        poolAddress: "0x8b1925c7470a97731f14e65168675d5086cd967b",
        gaugeExists: true,
        gaugeAddress: "0x906c1074d83d5f3f4b729c7a006ac6fb8ce9eac8",
        gaugeStartBlock: 19588554
    },
    "inoETH": {
        poolAddress: "0x5b075138b26342b07aafbf26e5886d51acffa8fe",
        gaugeExists: true,
        gaugeAddress: "0x83fad34c8cd8bdd21d66a46778395c2277b0f43b",
        gaugeStartBlock: 19589007
    },
    "inosETH": {
        poolAddress: "0xfbc50c058d5b972c68c52e1ef7a8f766b39b4a4c",
        gaugeExists: true,
        gaugeAddress: "0xdab95213c08fff4f3232ea8d0c8fe42027e430f3",
        gaugeStartBlock: 19589515
    },
    "inwbETH": {
        poolAddress: "0x9fb2c7ac644214395b446032266e0fcbce40cd1a",
        gaugeExists: true,
        gaugeAddress: "0xf55883dd469847c8f2be3f9270ccbf94ed2c6750",
        gaugeStartBlock: 19589470
    },
    "incbETH": {
        poolAddress: "0xd35fabf6ec806f4d772617956a2058cde086c6e0",
        gaugeExists: true,
        gaugeAddress: "0x2d232a49476b61c34ece99c953958de170cbebfd",
        gaugeStartBlock: 19589528
    },
    "inlsETH": {
        poolAddress: "0x02988f3e08a06be634d985ab94706182db882666",
        gaugeExists: true,
        gaugeAddress: "0xbfb99c28d3e3d73f1b530c1bc2496938228d6b36",
        gaugeStartBlock: 19589542
    }

}
