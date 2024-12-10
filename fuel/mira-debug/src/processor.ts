import { FuelGlobalProcessor } from '@sentio/sdk/fuel';
import { InputType, OutputType, Interface, bn, ReceiptType, ZeroBytes32 } from 'fuels';
import { AmmProcessor } from './types/fuel/AmmProcessor.js'
import { AMM_CONTRACT_ADDRESS, BASE_ASSET_ID, NETWORK_ID, NETWORK_NAME } from './const.js';
import { getLPAssetId, normalizeTxDate, poolIdToStr } from './utils.js';
import { SetDecimalsEventInput, SetNameEventInput, SetSymbolEventInput, Src20, Src20Interface } from './types/fuel/Src20.js';
import verifiedAssets from './verified-assets.json' with { type: "json" };
import { Pool } from './schema/store.js';
import { getPoolSnapshot, newPool } from './entities.js';

const setNameEventId = "7845998088195677205";
const setSymbolEventId = "12152039456660331088";
const setDecimalsEventId = "18149631459970394923";

const src20Interface = new Interface(Src20.abi);

const ETH_ASSET_ID = '0xf8f8b6283d7fa5b672b530cbb84fcccb4ff8dc40f8176ef4544ddb1f1952ad07';

// const sha256 = (str: string) => crypto.createHash('sha256').update(str).digest('hex');

const processor = AmmProcessor.bind({
  address: AMM_CONTRACT_ADDRESS,
  chainId: NETWORK_ID,
});

processor.onLogCreatePoolEvent(async (event, ctx) => {
  if (ctx.transaction?.status === 'success') {
    ctx.meter.Counter('pools').add(1);
    ctx.eventLogger.emit("PairCreated", {
      poolId: poolIdToStr(event.data.pool_id),
      token0: event.data.pool_id[0].bits,
      token1: event.data.pool_id[1].bits,
      stable: event.data.pool_id[2],
      lpAssetId: getLPAssetId(event.data.pool_id),
    });

    await newPool(event.data.pool_id, ctx);
  }
});

processor.onLogSwapEvent(async (event, ctx) => {
  if (ctx.transaction?.status === 'success') {
    ctx.eventLogger.emit("Swap", {
      poolId: poolIdToStr(event.data.pool_id),
      token0In: event.data.asset_0_in,
      token1In: event.data.asset_1_in,
      token0Out: event.data.asset_0_out,
      token1Out: event.data.asset_1_out,
      recipient: event.data.recipient.Address?.bits || event.data.recipient.ContractId?.bits,
    });

    const pool = (await ctx.store.get(Pool, poolIdToStr(event.data.pool_id)))!;
    pool.reserve0 = pool.reserve0 + BigInt(event.data.asset_0_in.toString()) - BigInt(event.data.asset_0_out.toString());
    pool.reserve1 += BigInt(event.data.asset_1_in.toString()) - BigInt(event.data.asset_1_out.toString());
    pool.volumeAsset0 += BigInt(event.data.asset_0_in.toString()) + BigInt(event.data.asset_0_out.toString());
    pool.volumeAsset1 += BigInt(event.data.asset_1_in.toString()) + BigInt(event.data.asset_1_out.toString());

    const snapshot = await getPoolSnapshot(pool, ctx.timestamp, ctx);
    snapshot.transactions += 1;
    snapshot.reserve0 = pool.reserve0;
    snapshot.reserve1 = pool.reserve1;
    snapshot.volumeAsset0 += BigInt(event.data.asset_0_in.toString()) + BigInt(event.data.asset_0_out.toString());
    snapshot.volumeAsset1 += BigInt(event.data.asset_1_in.toString()) + BigInt(event.data.asset_1_out.toString());
    await ctx.store.upsert(snapshot);
    console.log(`Writing pool, which has last snapshot of ${pool.mostRecentSnapshot}`);
    await ctx.store.upsert(pool);
  }
});

processor.onLogMintEvent(async (event, ctx) => {
  if (ctx.transaction?.status === 'success') {
    ctx.eventLogger.emit("Mint", {
      poolId: poolIdToStr(event.data.pool_id),
      token0In: event.data.asset_0_in,
      token1In: event.data.asset_1_in,
      liquidity: event.data.liquidity.amount,
      recipient: event.data.recipient.Address?.bits || event.data.recipient.ContractId?.bits,
      lpAssetId: event.data.liquidity.id.bits,
    });

    const pool = (await ctx.store.get(Pool, poolIdToStr(event.data.pool_id)))!;
    pool.reserve0 += BigInt(event.data.asset_0_in.toString());
    pool.reserve1 += BigInt(event.data.asset_1_in.toString());
    pool.lpTokenSupply += BigInt(event.data.liquidity.amount.toString());

    const snapshot = await getPoolSnapshot(pool, ctx.timestamp, ctx);
    snapshot.transactions += 1;
    snapshot.reserve0 = pool.reserve0;
    snapshot.reserve1 = pool.reserve1;
    snapshot.lpTokenSupply = pool.lpTokenSupply;
    await ctx.store.upsert(snapshot);
    await ctx.store.upsert(pool);
  }
});

processor.onLogBurnEvent(async (event, ctx) => {
  if (ctx.transaction?.status === 'success') {
    ctx.eventLogger.emit("Burn", {
      poolId: poolIdToStr(event.data.pool_id),
      token0Out: event.data.asset_0_out,
      token1Out: event.data.asset_1_out,
      liquidity: event.data.liquidity.amount,
      recipient: event.data.recipient.Address?.bits || event.data.recipient.ContractId?.bits,
      lpAssetId: event.data.liquidity.id.bits,
    });

    const pool = (await ctx.store.get(Pool, poolIdToStr(event.data.pool_id)))!;
    pool.reserve0 -= BigInt(event.data.asset_0_out.toString());
    pool.reserve1 -= BigInt(event.data.asset_1_out.toString());
    pool.lpTokenSupply -= BigInt(event.data.liquidity.amount.toString());

    const snapshot = await getPoolSnapshot(pool, ctx.timestamp, ctx);
    snapshot.transactions += 1;
    snapshot.reserve0 = pool.reserve0;
    snapshot.reserve1 = pool.reserve1;
    snapshot.lpTokenSupply = pool.lpTokenSupply;
    await ctx.store.upsert(snapshot);
    await ctx.store.upsert(pool);
  }
});


FuelGlobalProcessor
  .bind({ chainId: NETWORK_ID })
  .onTransaction(
    async (tx, ctx) => {
      if (tx.blockNumber === '1') {
        ctx.eventLogger.emit('SetName', {
          assetId: ETH_ASSET_ID,
          name: 'Ether',
        });
        ctx.eventLogger.emit('SetSymbol', {
          assetId: ETH_ASSET_ID,
          symbol: 'Symbol',
        });
        ctx.eventLogger.emit('SetDecimals', {
          assetId: ETH_ASSET_ID,
          decimals: 9,
        });

        for (const asset of verifiedAssets) {
          const assetChain = asset.networks.find((n) => n.chain === NETWORK_NAME && n.type === 'fuel');
          if (assetChain) {
            ctx.eventLogger.emit('VerifiedAsset', {
              assetId: assetChain.assetId,
              name: asset.name,
              symbol: asset.symbol,
              decimals: assetChain.decimals,
            });
          }
        }
      }

      const txDate = tx.date ? normalizeTxDate(tx.date) : null;

      if (tx.status === 'success') {
        for (const receipt of tx.receipts) {
          if (receipt.type === ReceiptType.Mint) {
            ctx.eventLogger.emit('AssetMint', {
              assetId: receipt.assetId,
              contractId: receipt.contractId,
              subId: receipt.subId,
            });
          } else if (receipt.type === ReceiptType.LogData) {
            switch (receipt.val1.toString()) {
              case setNameEventId:
                const [nameEvent]: [SetNameEventInput] = src20Interface.decodeLog(receipt.data, setNameEventId);

                ctx.eventLogger.emit('SetName', {
                  assetId: nameEvent.asset.bits,
                  name: nameEvent.name,
                });
                break;
              case setSymbolEventId:
                const [symbolEvent]: [SetSymbolEventInput] = src20Interface.decodeLog(receipt.data, setSymbolEventId);
                ctx.eventLogger.emit('SetSymbol', {
                  assetId: symbolEvent.asset.bits,
                  symbol: symbolEvent.symbol,
                });
                break;
              case setDecimalsEventId:
                const [decimalsEvent]: [SetDecimalsEventInput] = src20Interface.decodeLog(receipt.data, setDecimalsEventId);
                ctx.eventLogger.emit('SetDecimals', {
                  assetId: decimalsEvent.asset.bits,
                  decimals: decimalsEvent.decimals,
                });
                break;
            }
          }
        }
      }
    },
  );
