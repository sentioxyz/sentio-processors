export enum AbexEventType {
  // Position
  PositionClaimed = 'PositionClaimed',
  // Pool
  Deposited = 'Deposited',
  Withdrawn = 'Withdrawn',
  Swapped = 'Swapped',
  // Order
  OrderCreated = 'OrderCreated',
  OrderExecuted = 'OrderExecuted',
  OrderCleared = 'OrderCleared',
}

export enum PositionEventType {
  OpenPositionSuccessEvent = 'OpenPositionSuccessEvent',
  OpenPositionFailedEvent = 'OpenPositionFailedEvent',
  DecreasePositionSuccessEvent = 'DecreasePositionSuccessEvent',
  DecreasePositionFailedEvent = 'DecreasePositionFailedEvent',
  DecreaseReservedFromPositionEvent = 'DecreaseReservedFromPositionEvent',
  PledgeInPositionEvent = 'PledgeInPositionEvent',
  RedeemFromPositionEvent = 'RedeemFromPositionEvent',
  LiquidatePositionEvent = 'LiquidatePositionEvent',
}