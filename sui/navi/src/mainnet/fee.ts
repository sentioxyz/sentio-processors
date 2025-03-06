import { SuiObjectProcessor } from "@sentio/sdk/sui";
import { ChainId } from "@sentio/chain";
import { BigDecimal } from "@sentio/sdk";
import { COIN_MAP, getDecimalBySymbol } from "./utils.js";

const feeObjects = [
  "0xb50bf81444d3489d423f1fe65e862cceb6be8d9f992343f222a558975a2b6938", // Fee Pool For SUI
  "0x3c3b0514ad15d87bad11125c75c2575d164b7eee01b9f68fde996d84d30bd361", // Fee Pool For wUSDC
  "0xae4916db851ca9c79c9083a103771a8b3c79cd04067933eeaeff34e088b30d02", // Fee Pool For USDT
  "0xeeb59a6e47fd80eb0846d127e06e8c0024af56a2c3766f0d3b38dab1808ceb24", // Fee Pool For WETH
  "0xffcf1e4c2d5dc9519f01d163df1a8826a70179b6bddb9c0093604ef77ced1f5f", // Fee Pool For CETUS
  "0xc7fbe9d1216b8c0f0af5d628db09fa0c559eb4f35ad0e52a771bef7004b5630b", // Fee Pool For VoloSui
  "0x51291b3fd2f706f8c42868a2b4d4ba8b1c6df3168224212baccff659b85bbb6d", // Fee Pool For haSui
  "0xdf328558610b977c4eec65713d750faa749d92d2c46888b2d3f9e7f0cc69da5d", // Fee Pool For NAVX
  "0x27127ca232267adc0312487cecc91123f30753b8438ba5b2823597366d74445d", // Fee Pool For WBTC
  "0x7ba420d41c63b681ae7169abb2e05e5ffba7e23b11be7e26a8b9f74c4a047176", // Fee Pool For AUSD
  "0x71dd059d3983da4f324f73c7b28b8fb8e8ab52b4953fe7d633f314e23903e7cc", // Fee Pool For Native USDC
  "0x086e046bbdc1c92fcb426ca33b01feb6d78a6ea2249268091b915cf09f65831f", // Fee Pool For nbETH
  "0xc94e3e654a409424841987a6958d3bc4295fd4734056427565a833610d4f6aee", // Fee Pool For USDY
  "0x7fd8fa933dfa2ef7a50cd640d750b8ffaa6b112db13140bae3504ce0d43166cb", // Fee Pool For NS
  "0x96d4b505a1a1097c15b96685ba6f79fa4221094fd77570b7e70da3659d6d21f4", // Fee Pool For stBTC
  "0x4f7bdbb39f58fa038429b824bf9112c55a507637ca91c2416471def8e13f56e3", // Fee Pool For Deep
  "0x22e56abac79eccafa850ffd124305b3a9d04661e2b0b055c893041fa925bcc7c", // Fee Pool For FDUSD
  "0xa506535fa44238e7eee1978676b4a1bba8e29a19ca25211e8137f8d326506341", // Fee Pool For BLUE
  "0xcaa89fe2f9f4362097243462f2b73b1e001cdafa55da6787e76dd172957481ce", // Fee Pool For BUCK
  "0xc04210796e8c929a257fdadc34d94929a098da03fc89da5663becf147045d9d4", // Fee Pool For nUSDT
  "0xbdc7410f89443b59b98c493e59039ed07a29c55a773f19e96d5e0118faf52cbc", // Fee Pool For stSUI
  "0x1295de5a55511e085449c5eed9cddcb034faa86ef68820aa436f65cb574ddc54", // Fee Pool For suiBTC
];

export function FeeProcessor() {
  for (let feeObject of feeObjects) {
    SuiObjectProcessor.bind({
      objectId: feeObject,
      network: ChainId.SUI_MAINNET,
      startCheckpoint: 100000000n,
    }).onTimeInterval(async (self, data, ctx) => {
      let coin_type = "0x" + (self.fields as any).name.fields.name;
      if (
        coin_type ==
        "0x0000000000000000000000000000000000000000000000000000000000000002::sui::SUI"
      ) {
        coin_type = "0x2::sui::SUI";
      }

      const coin_symbol = COIN_MAP[coin_type];

      //@ts-ignore
      const value_with_decimal = self.fields.value;
      const decimal = getDecimalBySymbol(coin_symbol);

      let value;
      if (decimal !== undefined) {
        value = BigDecimal(value_with_decimal).div(Math.pow(10, decimal));
      } else {
        value = BigDecimal(value_with_decimal);
      }

      ctx.meter
        .Gauge("feeForPool")
        .record(value, { env: "mainnet", coin_type, coin_symbol });
    });
  }
}
