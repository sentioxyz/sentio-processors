export const WATCHED_ADDRESSES: Record<string, string> = {
  '0x52add72b435f426d85fc4c7419d6fbd5dfe33e1e': 'BATCHER',
  '0x31ad3df4b3beafac74ad6c494557953c855cbe50': 'PROPOSER',
  '0xb65459ddb2aa451af4d1b22b6702a033dd403711': 'CHALLENGER',
  '0x4161f3e544e08bd597b90385f8dc339f2776f891': 'SEQUENCER',
}

// List of addresses (lowercase) for easy lookup
export const ADDRESS_LIST = Object.keys(WATCHED_ADDRESSES)
