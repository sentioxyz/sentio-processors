import { AsyncNedb } from "nedb-async";

export const db = new AsyncNedb({
  filename: "/data/nft.db",
  autoload: true,
});

type NFTListing = {
  _id: string;
  seller: string;
};

export function setSeller(id: string, seller: string) {
  return db.asyncUpdate({ _id: id }, { _id: id, seller }, { upsert: true });
}

export async function getSeller(id: string) {
  const listing = await db.asyncFindOne<NFTListing>({ _id: id });
  if (listing === null || listing === undefined) {
    return "";
  }
  return listing.seller
}