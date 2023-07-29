export const LENDING_DECIMALS = 8;

export const TOKEN_ID_TO_SYMBOL = new Map<number, string>([
  [0, "BTC"],
  [1, "USDT"],
  [2, "USDC"],
  [3, "SUI"],
  [4, "ETH"],
  [5, "MATIC"],
  [6, "ARB"],
  [7, "OP"],
]);

export const CALL_TYPE_TO_NAME = new Map<number, string>([
  [0, "supply"],
  [1, "withdraw"],
  [2, "borrow"],
  [3, "repay"],
]);
