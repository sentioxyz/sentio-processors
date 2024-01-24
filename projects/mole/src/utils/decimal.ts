const Decimal = require("decimal.js")

Decimal.config({
  precision: 64,
  rounding: Decimal.ROUND_DOWN,
  toExpNeg: -64,
  toExpPos: 64,
})

export default Decimal
