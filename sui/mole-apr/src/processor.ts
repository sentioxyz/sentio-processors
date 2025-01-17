import { Counter, Gauge } from '@sentio/sdk'
import { SuiNetwork, SuiObjectProcessorTemplate, SuiObjectProcessor, SuiWrappedObjectProcessor} from "@sentio/sdk/sui"
import axiosInst from './utils/moleAxios.js'


SuiObjectProcessor.bind({
  objectId: "0xcf994611fd4c48e277ce3ffd4d4364c914af2c3cbb05f7bf6facd371de688630", // random fake id because no used in here
  network: SuiNetwork.MAIN_NET,
  startCheckpoint: 25721833n
})
.onTimeInterval(async (self, _, ctx) => {
  try {

    // get json data from mole
    const data_url = `https://app.mole.fi/api/SuiMainnet/data.json`
    const res = await axiosInst.get(data_url).catch((err: any) => {
        console.error('get data error:', err)
    })
    if (!res) {
      console.error('data_get got no response')
    }

    const farmsData = res!.data.farms

    for (let i = 0 ; i < farmsData.length; i ++) {
      const farmName = farmsData[i].symbol1 + '-' + farmsData[i].symbol2
      const farmApr = farmsData[i].totalApr

      ctx.meter.Gauge("lyf_apr").record(farmApr, { farmName, project: "mole" })
    }
  }
catch (e) {
      console.log(`${e.message} error at ${JSON.stringify(self)}`)
    }
  }, 30, 240, undefined, { owned: false })
