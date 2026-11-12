import { ContractContext, EthContext, RichBlock } from '@sentio/sdk/eth'
import {
  DepositEvent,
  ListaVault,
  ListaVaultBoundContractView,
  ListaVaultContext,
  ListaVaultProcessor,
  ReallocateSupplyEvent,
  ReallocateWithdrawEvent,
} from './types/eth/listavault.js'
import { network, recordTx, START_BLOCK } from './utils.js'
import { token } from '@sentio/sdk/utils'

const vaults = [
  '0xfa27f172e0b6ebcef9c51abf817e2cb142fbe627', // USD1
  '0x6d6783c146f2b0b2774c1725297f1845dc502525', // USDT
  '0xeb4f6ffb1038e1cca701e7d53083b37ec5b6ba33', // pUSDT
  '0xe03d86e5baa3509ac4a059a41737baa8169b6529', // lisUSD
]

interface PoolInfo {
  underlying: token.TokenInfo
}

const poolInfoMap = new Map<string, Promise<PoolInfo>>()

async function buildPoolInfo(
  ctx: ContractContext<ListaVault, ListaVaultBoundContractView>,
  pool: string,
): Promise<PoolInfo> {
  const [underlying] = await Promise.all([ctx.contract.asset()])
  const info = await token.getERC20TokenInfo(ctx, underlying)
  return {
    underlying: info,
  }
}

export const getPoolInfo = async function (
  ctx: ContractContext<ListaVault, ListaVaultBoundContractView>,
  pool: string,
): Promise<PoolInfo> {
  let infoPromise = poolInfoMap.get(pool)
  if (!infoPromise) {
    infoPromise = buildPoolInfo(ctx, pool)
    poolInfoMap.set(pool, infoPromise)
    console.log('set poolInfoMap for ' + pool)
  }
  return await infoPromise
}

function handleEvent(evt: DepositEvent | ReallocateSupplyEvent | ReallocateWithdrawEvent, ctx: ListaVaultContext) {
  const distinctId = 'caller' in evt.args ? evt.args.caller : evt.args.owner
  recordTx(ctx, distinctId, 'lista')
}

vaults.forEach((address) => {
  ListaVaultProcessor.bind({
    network,
    address,
    startBlock: START_BLOCK,
  })
    .onTimeInterval(
      async (block, ctx) => {
        const { underlying } = await getPoolInfo(ctx, ctx.address)
        try {
          const [totalAssets] = await Promise.all([ctx.contract.totalAssets()])
          const amount = totalAssets.scaleDown(underlying.decimal)
          ctx.eventLogger.emit('defi', {
            symbol: underlying.symbol,
            amount,
            platform: 'lista',
          })
        } catch (e) {}
      },
      60 * 12,
      60 * 24,
    )
    .onEventReallocateSupply(handleEvent)
    .onEventReallocateWithdraw(handleEvent)
    .onEventDeposit(handleEvent)
    .onEventWithdraw(handleEvent)
    .onEventTransfer(
      (evt, ctx) => {
        const distinctId = ctx.transaction?.from
        if (distinctId) {
          recordTx(ctx, distinctId, 'lista')
        }
      },
      undefined,
      { transaction: true },
    )
})
