import { EthChainId } from "@sentio/sdk/eth";
import { ReferralManagerProcessor } from "./types/eth/referralmanager.js";
import { CHAINS, VREFERRAL_MANAGER_MAP } from "./constant.js";
const REFERRAL_MANAGER = "0xd565cb10930f63fc9b5244310aa74bfd22069934"

CHAINS.forEach(chain => {
  ReferralManagerProcessor.bind({ address: VREFERRAL_MANAGER_MAP.get(chain)!, network: chain })
    .onEventRegisterCode(async (event, ctx) => {
      ctx.eventLogger.emit("RegisterCode", {
        affiliate: event.args.affiliate,
        code: event.args.code
      })
    })
    .onEventSetTraderReferralCode(async (event, ctx) => {
      ctx.eventLogger.emit("SetTraderReferralCode", {
        affiliate: event.args.trader,
        code: event.args.code
      })
    })
    .onEventAffiliateRewardClaimed(async (event, ctx) => {
      const tokens = event.args.tokens
      const amounts = event.args.amounts
      for (let i = 0; i < tokens.length; i++) {
        ctx.eventLogger.emit("AffiliateRewardClaimed", {
          affiliate: event.args.affiliate,
          token: tokens[i],
          amount: amounts[i]
        })
      }
    })
    .onEventReferralDiscount(async (event, ctx) => {
      ctx.eventLogger.emit("ReferralDiscount", {
        code: event.args.code,
        affiliate: event.args.affiliate,
        trader: event.args.trader,
        token: event.args.token,
        traderDiscountAmount: event.args.traderDiscountAmount,
        affiliateRewardAmount: event.args.affiliateRewardAmount,
        tokenPrice: event.args.tokenPrice,
        sizeDelta: Number(event.args.sizeDelta) / Math.pow(10, 30)
      })
    })
})