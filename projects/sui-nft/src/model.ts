import { BigDecimal } from "@sentio/sdk";

export enum MintType {
  MINT = 'mint',
  BURN = 'burn'
}

export interface Mint {
  evt_type: MintType
  sender: string
  project: string
  collection_name: string
  // collection_id: string
  object_id: string
}

// export enum TradeType {
//   BUY = 'buy',
//   LIST = 'list',
//   DELIST = 'delist'
// }

export interface Trade {
  project: string
  collection_name: string
  // collection_id?: string
  nft_name: string
  object_id: string
  nft_link: string

  nft_type: string

  buyer: string
  seller: string

  // amount: BigDecimal
  price: BigDecimal

}