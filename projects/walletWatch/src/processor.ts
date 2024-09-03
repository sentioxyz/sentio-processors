import { AccountContext, AccountProcessor } from "@sentio/sdk/eth";
import { EthChainId } from "@sentio/sdk/eth"
import { TransferEvent } from "@sentio/sdk/eth/builtin/erc20";
import { TransferEvent as TransferEvent721 } from "@sentio/sdk/eth/builtin/erc721";
import { getERC721Contract } from "@sentio/sdk/eth/builtin/erc721";
import { token } from "@sentio/sdk/utils";
import { EthContext } from "@sentio/sdk/eth";

async function erc20In(evt: TransferEvent, ctx: EthContext) {
  const tokenInfo =  await token.getERC20TokenInfo(ctx, evt.address)
  const amount = evt.args.value.scaleDown(tokenInfo.decimal)

  ctx.eventLogger.emit("ERC20TransferIn", {
    message: `${amount} of ${tokenInfo.name} is transferred in`,
    name: tokenInfo.name,
    symbol: tokenInfo.symbol,
    amount: amount
  })
}

async function erc20Out(evt: TransferEvent, ctx: AccountContext) {
  const tokenInfo =  await token.getERC20TokenInfo(ctx, evt.address)
  const amount = evt.args.value.scaleDown(tokenInfo.decimal)

  ctx.eventLogger.emit("ERC20TransferOut", {
    message: `${amount} of ${tokenInfo.name} is transferred out`,
    name: tokenInfo.name,
    symbol: tokenInfo.symbol,
    amount: amount
  })
}

async function erc721In(evt: TransferEvent721, ctx: AccountContext) {
  const nft = getERC721Contract(ctx as any, evt.address)
  const tokenId = evt.args.tokenId
  const name = await nft.name()
  const symbol = await nft.symbol()

  ctx.eventLogger.emit("ERC721TransferIn", {
    message: `${tokenId} of ${name} is transferred out`,
    name: name,
    symbol: symbol,
    tokenId: tokenId
  })
}

async function erc721Out(evt: TransferEvent721, ctx: AccountContext) {
  const nft = getERC721Contract(ctx as any, evt.address)
  const tokenId = evt.args.tokenId

  ctx.eventLogger.emit("ERC721TransferOut", {
    message: `${tokenId} of ${nft.name} is transferred out`,
    name: nft.name,
    symbol: nft.symbol,
    tokenId: tokenId
  })
}

AccountProcessor.bind({address: "0xae2Fc483527B8EF99EB5D9B44875F005ba1FaE13", network: EthChainId.ETHEREUM, startBlock: 17000000})
.onERC20TransferIn(erc20In)
.onERC20TransferOut(erc20Out)
// .onERC721TransferIn(erc721In, [])
// .onERC721TransferOut(erc721Out, [])
