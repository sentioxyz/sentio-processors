import { EthChainId, getProvider } from "@sentio/sdk/eth";
import { getERC20Contract } from "@sentio/sdk/eth/builtin/erc20";

export const NETWORK = EthChainId.ETHEREUM;

export const WBTC = "0x2260fac5e5542a773aa44fbcfedf7c193bc2c599";
export const LBTC = "0x8236a87084f8B84306f72007F36F2618A5634494";

export const WBTC_BTC_PRICE_FEED = "0xfdFD9C85aD200c506Cf9e21F1FD8dd01932FBB23";
export const BTC_USD_PRICE_FEED = "0xF4030086522a5bEEa4988F8cA5B36dbC97BeE88c";
export const PTLBTC_USD_PRICE_FEED = "0x802fc5ABC3c0e3428a833cF459c9EcF4673B4915"
export const MORPHO_GAUNTLET = "0x443df5eEE3196e9b2Dd77CaBd3eA76C3dee8f9b2";
export const MORPHO_RE7 = "0xE0C98605f279e4D7946d25B75869c69802823763";
export const MORPHO_MARKET_ID =
  "0xf6a056627a51e511ec7f48332421432ea6971fc148d8f3c451e14ea108026549";
export const MORPHO = "0xBBBBBbbBBb9cC5e90e3b3Af64bdAF62C37EEFFCb";
export const SYMBIOTIC_LBTC = "0x9c0823d3a1172f9ddf672d438dec79c39a64f448";
export const GEARBOX_WBTC_POOL = "0xda00010eda646913f273e10e7a5d1f659242757d";
export const ETHERFI_VAULT = "0x657e8C867D8B37dCC18fA4Caead9C45EB088C642";

export const ZIRCUIT_POOL = "0xf047ab4c75cebf0eb9ed34ae2c186f3611aeafa6";
export const SATLAYER_POOL = "0x42a856dbEBB97AbC1269EAB32f3bb40C15102819";
export const PELL_LBTC_STRATEGY = "0x2DFc08F4FAd29761adf4cD9F1918296dC6F305C4";
export const KARAK_LBTC = "0x468c34703F6c648CCf39DBaB11305D17C70ba011";
export const CORN_SILO = "0x8bc93498b861fd98277c3b51d240e7E56E48F23c";
export const PENDLE_SY = "0x9d6Ec7a7B051B32205F74B140A0fa6f09D7F223E";

export const ZEROLEND_LBTC = "0xcABB8fa209CcdF98a7A0DC30b1979fC855Cb3Eb3";
export const ZEROLEND_PT_LBTC = "0xD9484f9d140f3300C6527B50ff81d46a9D53AcCa"

export const SATLAYER_TOKEN_LIST = [
  "0x004e9c3ef86bc1ca1f0bb5c7662861ee93350568", // uniBTC
  "0xd9d920aa40f578ab794426f5c90f6c731d159def", // SolvBTC.BBN
  "0xf469fbd2abcd6b9de8e169d128226c0fc90a012e", // pumpBTC
  "0xc96de26018a54d51c097160568752c4e3bd6c364", // FBTC
  WBTC,
  LBTC,
];

export const LBTCCPS_DERIVE = "0x5Fc48A32437Ff4BBab2A22646c3c9344ba003971"
export const LBTCCS_DERIVE = "0xbCab1f8BbA323BC55EA8cfaC34edAcf8DBE92dD4"


export const DECIMALS = Object.fromEntries(
  await Promise.all(
    SATLAYER_TOKEN_LIST.map((addr) =>
      getERC20Contract(EthChainId.ETHEREUM, addr)
        .decimals()
        .then((d) => [addr, Number(d)] as [string, number])
    )
  )
);

export const creationBlocks = Object.fromEntries(
  await Promise.all(
    [
      WBTC_BTC_PRICE_FEED,
      BTC_USD_PRICE_FEED,
      MORPHO_GAUNTLET,
      MORPHO_RE7,
      MORPHO,
      SYMBIOTIC_LBTC,
      GEARBOX_WBTC_POOL,
      ETHERFI_VAULT,
      LBTC,
      ZIRCUIT_POOL,
      SATLAYER_POOL,
      ...SATLAYER_TOKEN_LIST,
      PENDLE_SY,
      CORN_SILO,
      PELL_LBTC_STRATEGY,
      KARAK_LBTC,
      ZEROLEND_LBTC,
    ].map((addr) =>
      getCreationBlock(NETWORK, addr).then((v) => [addr, v] as [string, number])
    )
  )
);

async function getCreationBlock(
  network: EthChainId,
  address: string
): Promise<number> {
  const provider = getProvider(network);
  let l = 0;
  let r = await provider.getBlockNumber();
  while (l < r) {
    const m = Math.floor((l + r) / 2);
    const code = await provider.getCode(address, m);
    if (code.length > 2) {
      r = m;
    } else {
      l = m + 1;
    }
  }
  return l;
}
