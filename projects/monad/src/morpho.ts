import { getERC20ContractOnContext } from '@sentio/sdk/eth/builtin/erc20'
import {
  DepositEvent,
  getMetaMorphoContractOnContext,
  MetaMorphoProcessorTemplate,
  WithdrawEvent,
} from './types/eth/metamorpho.js'
import { MetaMorphoFactoryProcessor } from './types/eth/metamorphofactory.js'
import { network, recordTx, recordTvl, START_BLOCK } from './utils.js'
import { getPriceBySymbol, token } from '@sentio/sdk/utils'
import { MorphoV2FactoryProcessor } from './types/eth/morphov2factory.js'
import {
  getMorphoV2VaultContractOnContext,
  MorphoV2VaultProcessorTemplate,
  DepositEvent as DepositEventV2,
  WithdrawEvent as WithdrawEventV2,
} from './types/eth/morphov2vault.js'
import { EthContext } from '@sentio/sdk/eth'

const project = 'morpho'

const v1Template = new MetaMorphoProcessorTemplate()
  .onTimeInterval(
    async (block, ctx) => {
      const [asset, total] = await Promise.all([ctx.contract.asset(), ctx.contract.totalAssets()])
      await recordTvl(ctx, asset, total, ctx.address, project)
    },
    60 * 12,
    60 * 24,
  )
  .onEventDeposit(handleEvent)
  .onEventWithdraw(handleEvent)

MetaMorphoFactoryProcessor.bind({
  network,
  address: '0x33f20973275B2F574488b18929cd7DCBf1AbF275',
}).onEventCreateMetaMorpho(async (evt, ctx) => {
  const { metaMorpho } = evt.args
  const contract = getMetaMorphoContractOnContext(ctx, metaMorpho)
  const asset = await contract.asset()
  try {
    const symbol = await getERC20ContractOnContext(ctx, asset).symbol()
    const price = await getPriceBySymbol(symbol, ctx.timestamp)
    if (price) {
      const startBlock = ctx.blockNumber < START_BLOCK ? START_BLOCK : ctx.blockNumber
      v1Template.bind({ address: metaMorpho, startBlock }, ctx)
    }
  } catch (e) {
    console.warn('invalid meta morpho', metaMorpho)
  }
})

const v2Template = new MorphoV2VaultProcessorTemplate()
  .onTimeInterval(
    async (block, ctx) => {
      const [asset, total] = await Promise.all([ctx.contract.asset(), ctx.contract.totalAssets()])
      await recordTvl(ctx, asset, total, ctx.address, project)
    },
    60 * 12,
    60 * 24,
  )
  .onEventDeposit(handleEvent)
  .onEventWithdraw(handleEvent)

MorphoV2FactoryProcessor.bind({
  network,
  address: '0x8B2F922162FBb60A6a072cC784A2E4168fB0bb0c',
}).onEventCreateVaultV2(async (evt, ctx) => {
  const { newVaultV2 } = evt.args
  const contract = getMorphoV2VaultContractOnContext(ctx, newVaultV2)
  const asset = await contract.asset()
  try {
    const symbol = await getERC20ContractOnContext(ctx, asset).symbol()
    const price = await getPriceBySymbol(symbol, ctx.timestamp)
    if (price) {
      const startBlock = ctx.blockNumber < START_BLOCK ? START_BLOCK : ctx.blockNumber
      v2Template.bind({ address: newVaultV2, startBlock }, ctx)
    }
  } catch (e) {
    console.warn('invalid morpho vault', newVaultV2)
  }
})

function handleEvent(evt: DepositEvent | WithdrawEvent | DepositEventV2 | WithdrawEventV2, ctx: EthContext) {
  const distinctId = 'owner' in evt.args ? evt.args.owner : evt.args.sender
  recordTx(ctx, distinctId, project)
}
