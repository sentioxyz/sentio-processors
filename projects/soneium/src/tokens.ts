import { BaseContext, Counter, Gauge, scaleDown } from '@sentio/sdk'
import {
  BaseProcessor,
  EthChainId,
  EthContext,
  GenericProcessor,
  GlobalContext,
  GlobalProcessor
} from '@sentio/sdk/eth'
import { ASTRProcessor, getASTRContractOnContext } from './types/eth/astr.js'
import { getVASTRContractOnContext, VASTRProcessor } from './types/eth/vastr.js'
import { getWstASTRContractOnContext, WstASTRProcessor } from './types/eth/wstastr.js'
import { getXnASTRContractOnContext, XnASTRProcessor } from './types/eth/xnastr.js'
import { getNsASTRContractOnContext, NsASTRProcessor } from './types/eth/nsastr.js'
import { getYayASTRContractOnContext, YayASTRProcessor } from './types/eth/yayastr.js'

const network = EthChainId.SONEIUM_MAINNET
const timeIntervalInMinutes = 6 * 60
const backfillTimeIntervalInMinutes = timeIntervalInMinutes * 4

const totalSupplyGauge = Gauge.register('totalSupply')

const tokens: [
  string,
  string,
  (
    | typeof ASTRProcessor
    | typeof VASTRProcessor
    | typeof WstASTRProcessor
    | typeof XnASTRProcessor
    | typeof NsASTRProcessor
    | typeof YayASTRProcessor
  ),
  (ctx: BaseContext, address: string) => any
][] = [
  ['ASTR', '0x2CAE934a1e84F693fbb78CA5ED3B0A6893259441', ASTRProcessor, getASTRContractOnContext],
  ['vASTR', '0x60336f9296C79dA4294A19153eC87F8E52158e5F', VASTRProcessor, getVASTRContractOnContext],
  ['wstASTR', '0x3b0DC2daC9498A024003609031D973B1171dE09E', WstASTRProcessor, getWstASTRContractOnContext],
  ['xnASTR', '0xea1e08A176528e2d7250a6F7001F18EDF0CaeCF0', XnASTRProcessor, getXnASTRContractOnContext],
  // ['nsASTR', '0xc67476893C166c537afd9bc6bc87b3f228b44337', NsASTRProcessor, getNsASTRContractOnContext],
  ['yayASTR', '0x19a80F5DFE30bdf19054716E221539FC040f3b72', YayASTRProcessor, getYayASTRContractOnContext]
]

tokens.map(([name, address, processor, getContract]) => {
  processor.bind({ network, address }).onTimeInterval(
    async (_, ctx) => {
      const contract = getContract(ctx, address)
      const supply = await contract.totalSupply()
      totalSupplyGauge.record(ctx, scaleDown(supply, 18), { name })
    },
    6 * 60,
    6 * 60 * 4
  )
})
