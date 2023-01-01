import { ExchangeData } from "./types/internal/ExchangeV3";
import { ExchangeV3Context } from "./types/internal/exchangev3_processor";
import { Bitstream } from "@sentio/loopring-protocols/src/bitstream";
import { TransactionType } from "@sentio/loopring-protocols/src/types";
import { DepositProcessor } from "@sentio/loopring-protocols/src/request_processors/deposit_processor";
import { SpotTradeProcessor } from "@sentio/loopring-protocols/src/request_processors/spot_trade_processor";
import { TransferProcessor } from "@sentio/loopring-protocols/src/request_processors/transfer_processor";
import { WithdrawalProcessor } from "@sentio/loopring-protocols/src/request_processors/withdrawal_processor";
import { AccountUpdateProcessor } from "@sentio/loopring-protocols/src/request_processors/account_update_processor";
import { AmmUpdateProcessor } from "@sentio/loopring-protocols/src/request_processors/amm_update_processor";
import { SignatureVerificationProcessor } from "@sentio/loopring-protocols/src/request_processors/signature_verification_processor";
import { NftMintProcessor } from "@sentio/loopring-protocols/src/request_processors/nft_mint_processor";
import { NftDataProcessor } from "@sentio/loopring-protocols/src/request_processors/nft_data_processor";
import { getTxData, ThinBlock } from "@sentio/loopring-protocols/src/parse";
import assert from "assert";
import { AddressZero } from "@ethersproject/constants"
import { AccountEventTracker} from "@sentio/sdk";
import {block_sizes, tx_processed} from "./metrics";

const accountTracker = AccountEventTracker.register("wallets")
function parseSingleTx(txData: Bitstream, ctx: ExchangeV3Context) {
  const txType = txData.extractUint8(0);
  tx_processed.record(ctx,1, {txType: txType.toString()})
  ctx.meter.Counter("tx_processed_counter").add(1, {txType: txType.toString()})

  // SELECT CASE (t.transaction).txType
  //               WHEN 1 THEN ((t.transaction).deposit).toAccount
  //               WHEN 3 THEN ((t.transaction).transfer).toAccount
  //               WHEN 5 THEN ((t.transaction).account_update).ownerAccount
  //               ELSE '0'
  //           END as id,
  //           CASE (t.transaction).txType
  //               WHEN 1 THEN ((t.transaction).deposit).toAddress
  //               WHEN 3 THEN ((t.transaction).transfer).toAddress
  //               WHEN 5 THEN ((t.transaction).account_update).ownerAddress
  //               ELSE '\x0000000000000000000000000000000000000000'::bytea
  //           END as address
  // 1,3,5 corresponds to DEPOSIT, TRANSFER and ACCOUNT_UPDATE
  if (txType === TransactionType.NOOP) {
    // Do nothing
  } else if (txType === TransactionType.DEPOSIT) {
    const request = DepositProcessor.extractData(txData);
    var account = request.toAccountID
    var address = request.to
    if (account !== undefined && address !== undefined && account! !== 0 && address !== AddressZero) {
      accountTracker.trackEvent(ctx, { distinctId: account.toString(16) })
    }
  } else if (txType === TransactionType.SPOT_TRADE) {
    const request = SpotTradeProcessor.extractData(txData);
  } else if (txType === TransactionType.TRANSFER) {
    const request = TransferProcessor.extractData(txData);
    var account = request.accountToID
    var address = request.to
    if (account !== undefined && address !== undefined && account! !== 0 && address !== AddressZero) {
      accountTracker.trackEvent(ctx, { distinctId: account.toString(16) })
    }
  } else if (txType === TransactionType.WITHDRAWAL) {
    const request = WithdrawalProcessor.extractData(txData);
  } else if (txType === TransactionType.ACCOUNT_UPDATE) {
    const request = AccountUpdateProcessor.extractData(txData);
    var account = request.accountID
    var address = request.owner
    if (account !== undefined && address !== undefined && account! !== 0 && address !== AddressZero) {
      accountTracker.trackEvent(ctx, { distinctId: account.toString(16) })
    }
  } else if (txType === TransactionType.AMM_UPDATE) {
    const request = AmmUpdateProcessor.extractData(txData);
  } else if (txType === TransactionType.SIGNATURE_VERIFICATION) {
    const request = SignatureVerificationProcessor.extractData(txData);
  } else if (txType === TransactionType.NFT_MINT) {
    ctx.meter.Counter("unique_nft_minted").add(1)
    const request = NftMintProcessor.extractData(txData);
  } else if (txType === TransactionType.NFT_DATA) {
    const request = NftDataProcessor.extractData(txData);
  } else {
    assert(false, "unknown transaction type: " + txType);
  }


  // request.type = adjustTxType(txType, request);
  // console.log("request.type:", request.type);
  // request.txData = txData.getData();

  // return request;
}


export function processBlockStruct(block: ExchangeData.BlockStructOutput, transactionHash: string, ctx: ExchangeV3Context) {
  const owner = "0x5c367c1b2603ed166C62cEc0e4d47e9D5DC1c073";

  const bs = new Bitstream(block.data)
  if (bs.length() < 20 + 32 + 32) {
    // console.log("Invalid block data: " + data);
    return;
  }
  const merkleRoot = bs.extractUint(20 + 32).toString(10);

  const newBlock: ThinBlock = {
    blockSize: block.blockSize,
    blockVersion: block.blockVersion,
    data: block.data,
    offchainData: block.offchainData,
    operator: owner,
    merkleRoot,
    transactionHash: transactionHash
  };

  processBlock(newBlock, ctx)
}

// mostly copy， need refactor sdk
function processBlock(block: ThinBlock, ctx: ExchangeV3Context) {
  let requests: any[] = [];

  let data = new Bitstream(block.data);
  let offset = 0;

  const blockSize = block.blockSize
  block_sizes.record(ctx, 1, {blocksize: blockSize.toString()})
  ctx.meter.Counter("block_sizes_counter").add(1, {blocksize: blockSize.toString()})

  // General data
  offset += 20 + 32 + 32 + 4;
  // const protocolFeeTakerBips = data.extractUint8(offset);
  offset += 1;
  // const protocolFeeMakerBips = data.extractUint8(offset);
  offset += 1;
  // const numConditionalTransactions = data.extractUint32(offset);
  offset += 4;
  // const operatorAccountID = data.extractUint32(offset);
  offset += 4;

  let noopSize = 0;
  for (let i = 0; i < block.blockSize; i++) {
    const size1 = 29;
    const size2 = 39;
    const txData1 = data.extractData(offset + i * size1, size1);
    const txData2 = data.extractData(
        offset + block.blockSize * size1 + i * size2,
        size2
    );

    const txData = new Bitstream(txData1 + txData2);
    const txType = txData.extractUint8(0);

    if (txType === TransactionType.NFT_MINT) {
      if (i + 1 < block.blockSize) {
        txData.addHex(
            getTxData(data, offset, i + 1, block.blockSize).getData()
        );
        if (i + 2 < block.blockSize) {
          txData.addHex(
              getTxData(data, offset, i + 2, block.blockSize).getData()
          );
        }
      }
    }

    parseSingleTx(txData, ctx);
  }
}