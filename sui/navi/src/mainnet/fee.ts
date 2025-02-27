import { SuiObjectProcessor } from "@sentio/sdk/sui";
import { ChainId } from "@sentio/chain";
import { BigDecimal } from "@sentio/sdk";
import { COIN_MAP, getDecimalBySymbol } from "./utils.js";

const feeObjects = [
  "0xb50bf81444d3489d423f1fe65e862cceb6be8d9f992343f222a558975a2b6938", // Fee Pool For SUI
  //   "", // Fee Pool For USDC
  //   "", // Fee Pool For USDT
  "0x086e046bbdc1c92fcb426ca33b01feb6d78a6ea2249268091b915cf09f65831f", // Fee Pool For WETH
  //   "", // Fee Pool For CETUS
  //   "", // Fee Pool For VoloSui
  //   "", // Fee Pool For haSui
  //   "", // Fee Pool For NAVX
  //   "", // Fee Pool For WBTC
  //   "", // Fee Pool For AUSD
  //   "", // Fee Pool For Native USDC
  //   "", // Fee Pool For Native ETH
  //   "", // Fee Pool For USDY
  //   "", // Fee Pool For NS
  //   "", // Fee Pool For stBTC
  //   "", // Fee Pool For Deep
  //   "", // Fee Pool For FDUSD
  //   "", // Fee Pool For BLUE
  //   "", // Fee Pool For BUCK
  //   "", // Fee Pool For nUSDT
  //   "", // Fee Pool For stSUI
  //   "", // Fee Pool For suiBTC
];

export function FeeProcessor() {
  for (let feeObject of feeObjects) {
    SuiObjectProcessor.bind({
      objectId: feeObject,
      network: ChainId.SUI_MAINNET,
      startCheckpoint: 100000000n,
    }).onTimeInterval(async (self, data, ctx) => {
      const coin_type = (self.fields as any).name.fields.name;
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

      //TODO
      ctx.meter
        .Gauge("feeForPool")
        .record(value, { env: "mainnet", coin_type, coin_symbol });
    });
  }
}
