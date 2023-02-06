import { EbisusbayProcessor } from './types/ebisusbay/index.js'
import { MembershipStakerV3Processor } from './types/membershipstakerv3/index.js'
import { Counter, Gauge } from "@sentio/sdk"
import { getPriceBySymbol } from "@sentio/sdk/utils"


const vol_USD = Gauge.register("vol_USD")
const vol_CRO = Gauge.register("vol_CRO")

const volCounter_CRO = Counter.register("volCounter_CRO")
const volCounter_USD = Counter.register("volCounter_USD")

const royaltyGauge_CRO = Gauge.register("royaltyFee_CRO")
const royaltyCounter_CRO = Counter.register("royaltyFeeCounter_CRO")
const royaltyGauge_USD = Gauge.register("royaltyFee_USD")
const royaltyCounter_USD = Counter.register("royaltyFeeCounter_USD")

const stakeGauge = Gauge.register("stake")
const stakeCounter = Counter.register("stakeCounter")

const rewardCounter_CRO = Counter.register("stakeRewardCounter_CRO")
const rewardGauge_CRO = Gauge.register("stakeReward_CRO")
const rewardCounter_USD = Counter.register("stakeRewardCounter_USD")
const rewardGauge_USD = Gauge.register("stakeReward_USD")

const royaltyCounter1000Test_CRO = Counter.register("royalty_test_1000")

//first tx block time 6220924
EbisusbayProcessor.bind({ address: '0x7a3CdB2364f92369a602CAE81167d0679087e6a3', network: 25, startBlock: 6216653 })
    .onAllEvents(async (event, ctx) => {
        const hash = event.transactionHash


        let tx
        let cnt = 0
        while (!tx && cnt < 10){
            try {
                tx = await ctx.contract.provider.getTransaction(hash)
            } catch (e) {
                console.log("err get txn",e)
                return
            }
            console.log("no tx:", hash, cnt)
            cnt++
        }
        if (!tx) {
            console.log("no tx after retry:", hash)
            return
        }
        console.log("transaction", tx)
        let from = tx.from
        ctx.eventTracker.track("Any_Event",
            {
                distinctId: from
            })
    })
