
/* Autogenerated file. Do not edit manually. */
/* tslint:disable */
/* eslint-disable */
import type { String, Int, BigInt, Float, ID, Bytes, Timestamp, Boolean } from '@sentio/sdk/store'
import { Entity, Required, One, Many, Column, ListColumn, AbstractEntity } from '@sentio/sdk/store'
import { BigDecimal } from '@sentio/bigdecimal'
import { DatabaseSchema } from '@sentio/sdk'






@Entity("AccountSnapshot")
export class AccountSnapshot extends AbstractEntity  {

	@Required
	@Column("ID")
	id: ID

	@Required
	@Column("String")
	network: String

	@Required
	@Column("BigInt")
	timestampMilli: BigInt

	@Required
	@Column("BigInt")
	stoneBalance: BigInt
  constructor(data: Partial<AccountSnapshot>) {super()}
}

@Entity("TempEvent")
export class TempEvent extends AbstractEntity  {

	@Required
	@Column("ID")
	id: ID

	@Required
	@Column("String")
	network: String

	@Required
	@Column("String")
	eventName: String

	@Required
	@Column("String")
	args: String

	@Required
	@Column("Int")
	blockNumber: Int

	@Required
	@Column("Int")
	txIdx: Int

	@Required
	@Column("Int")
	eventIdx: Int

	@Required
	@Column("BigInt")
	timestampMilli: BigInt
  constructor(data: Partial<TempEvent>) {super()}
}


const source = `type AccountSnapshot @entity {
  id: ID!
  network: String!
  timestampMilli: BigInt!
  stoneBalance: BigInt!
}

type TempEvent @entity {
  id: ID!
  network: String!
  eventName: String!
  args: String!
  blockNumber: Int!
  txIdx: Int!
  eventIdx: Int!
  timestampMilli: BigInt!
}
`
DatabaseSchema.register({
  source,
  entities: {
    "AccountSnapshot": AccountSnapshot,
		"TempEvent": TempEvent
  }
})