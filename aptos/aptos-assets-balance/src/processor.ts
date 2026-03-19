import {
  AptosResourcesProcessor,
} from "@sentio/sdk/aptos";
import {
  fungible_asset,
  object$,
} from "@sentio/sdk/aptos/builtin/0x1";
import { ANY_TYPE } from "@typemove/move";
import { Balance } from "./schema/schema.js";
import {
  AccountAddress,
  WriteSetChange,
  WriteSetChangeWriteResource,
} from "@aptos-labs/ts-sdk";

// FA start version
const START_VERSION = 185557568;
const FUNGIBLE_STORE_TYPE = fungible_asset.FungibleStore.TYPE_QNAME;
const OBJECT_CORE_TYPE = object$.ObjectCore.TYPE_QNAME;

const normalizeAddress = (address: string) =>
  AccountAddress.from(address, { maxMissingChars: 63 }).toString();

AptosResourcesProcessor.bind({
  address: "*",
  startVersion: START_VERSION,
}).onResourceChange(async (changes, ctx) => {
  const stores = new Map<
    string,
    {
      asset?: string;
      balance?: bigint;
      account?: string;
    }
  >();

  for (const change of changes) {
    if (!isWriteSetChangeWriteResource(change)) {
      continue;
    }

    const storeAddress = normalizeAddress(change.address);

    if (isFungibleStoreChange(change)) {
      const fungibleStore = change.data.data_decoded;

      const entry = stores.get(storeAddress) ?? {};
      entry.asset = normalizeAddress(fungibleStore.metadata);
      entry.balance = BigInt(fungibleStore.balance);
      stores.set(storeAddress, entry);
      continue;
    }

    if (isObjectCoreChange(change)) {
      const objectCore = change.data.data_decoded;

      const entry = stores.get(storeAddress) ?? {};
      entry.account = normalizeAddress(objectCore.owner);
      stores.set(storeAddress, entry);
    }
  }

  for (const [storeAddress, store] of stores) {
    if (!store.asset || store.balance === undefined || !store.account) {
      console.log("Skipping Balance upsert due to incomplete resource pair", {
        version: ctx.version.toString(),
        storeAddress,
        hasAsset: !!store.asset,
        hasBalance: store.balance !== undefined,
        hasAccount: !!store.account,
      });
      continue;
    }

    await ctx.store.upsert(
      new Balance({
        id: storeAddress,
        asset: store.asset,
        balance: store.balance,
        account: store.account,
      }),
    );
  }
}, ANY_TYPE)

function isWriteSetChangeWriteResource(
  change: WriteSetChange,
): change is WriteSetChangeWriteResource {
  return change.type === "write_resource";
}

type DecodedWriteResource<TType extends string, TData> =
  WriteSetChangeWriteResource & {
    data: WriteSetChangeWriteResource["data"] & {
      type: TType;
      data_decoded: TData;
    };
  };

function isFungibleStoreChange(
  change: WriteSetChangeWriteResource,
): change is DecodedWriteResource<
  typeof FUNGIBLE_STORE_TYPE,
  fungible_asset.FungibleStore
> {
  return change.data.type === FUNGIBLE_STORE_TYPE;
}

function isObjectCoreChange(
  change: WriteSetChangeWriteResource,
): change is DecodedWriteResource<typeof OBJECT_CORE_TYPE, object$.ObjectCore> {
  return change.data.type === OBJECT_CORE_TYPE;
}
