
/* Autogenerated file. Do not edit manually. */
/* tslint:disable */
/* eslint-disable */
import type { String, Int, BigInt, Float, ID, Bytes, Timestamp, Boolean } from '@sentio/sdk/store'
import { Entity, Required, One, Many, Column, ListColumn, AbstractEntity } from '@sentio/sdk/store'
import { BigDecimal } from '@sentio/bigdecimal'
import { DatabaseSchema } from '@sentio/sdk'






@Entity("PositionSnapshot")
export class PositionSnapshot extends AbstractEntity  {

	@Required
	@Column("ID")
	id: ID

	@Required
	@Column("String")
	poolAddress: String

	@Required
	@Column("BigInt")
	tickLower: BigInt

	@Required
	@Column("BigInt")
	tickUpper: BigInt

	@Required
	@Column("String")
	owner: String

	@Required
	@Column("BigInt")
	timestampMilli: BigInt

	@Required
	@Column("BigDecimal")
	stoneBalance: BigDecimal
  constructor(data: Partial<PositionSnapshot>) {super()}
}

@Entity("PoolArgs")
export class PoolArgs extends AbstractEntity  {

	@Required
	@Column("ID")
	id: ID

	@Required
	@Column("BigInt")
	sqrtPriceX96: BigInt

	@Required
	@Column("BigInt")
	liquidity: BigInt

	@Required
	@Column("BigInt")
	tick: BigInt
  constructor(data: Partial<PoolArgs>) {super()}
}


const source = `type PositionSnapshot @entity {
  id: ID!
  poolAddress: String!
  tickLower: BigInt!
  tickUpper: BigInt!
  owner: String!
  timestampMilli: BigInt!
  stoneBalance: BigDecimal!
}

type PoolArgs @entity {
  id: ID!
  sqrtPriceX96: BigInt!
  liquidity: BigInt!
  tick: BigInt!
}
`
DatabaseSchema.register({
  source,
  entities: {
    "PositionSnapshot": PositionSnapshot,
		"PoolArgs": PoolArgs
  }
})