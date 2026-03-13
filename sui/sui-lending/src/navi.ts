// Register NAVI multi-market handlers from the unified event module.

import { event } from './types/sui/navi.js'
import { MULTI_MARKET_START_CHECKPOINT } from './navi/constants.js'
import { registerCoreLendingHandlers } from './navi/handlers/core-lending.js'
import { registerFlashLoanHandlers } from './navi/handlers/flash-loan.js'
import { registerPoolHandlers } from './navi/handlers/pool.js'

const processor = event.bind({ startCheckpoint: MULTI_MARKET_START_CHECKPOINT })

registerCoreLendingHandlers(processor)
registerFlashLoanHandlers(processor)
registerPoolHandlers(processor)
