import { EthContext } from '@sentio/sdk/eth'

export function gasCost(ctx: EthContext) {
    return (
        BigInt(
            ctx.transactionReceipt?.effectiveGasPrice || ctx.transactionReceipt?.gasPrice || ctx.transaction?.gasPrice || 0n,
        ) * BigInt(ctx.transactionReceipt?.gasUsed || 0)
    )
}
