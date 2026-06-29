import { SuiGlobalProcessor, SuiNetwork } from '@sentio/sdk/sui';
import { Exporter } from '@sentio/sdk';
import { toBase64 } from '@mysten/sui/utils';

const MAVEN_PREFIX = '6d6176656e';
const ExecuteTransaction = Exporter.register('ExecuteTransaction', 'ExecuteTransaction');

SuiGlobalProcessor.bind({ network: SuiNetwork.TEST_NET, startCheckpoint: 4928686n }).onTransactionBlock(
    (tx, ctx) => {
      const sigBytes = tx.signatures[0]?.bcs?.value;
      const txSig = sigBytes ? toBase64(sigBytes) : undefined;
      if (txSig) {
        ExecuteTransaction.emit(ctx, {
          signature: txSig,
          // @ts-expect-error ??
          payloadHash: tx.transaction!.payloadHash,
        });
        ctx.eventLogger.emit('multisigTx', {
          signature: txSig,
          // @ts-expect-error ??
          payloadHash: tx.transaction!.payloadHash,
          message: `received a multisig transaction`,
        });
      } else {
        console.log('No sig found');
      }
    },
    {
      publicKeyPrefix: MAVEN_PREFIX,
    })
