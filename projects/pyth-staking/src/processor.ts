import { StakingProcessor } from "./types/solana/staking_processor.js";

StakingProcessor.bind({
  address: "pytS9TjG1qyAZypk7n8rw8gfW9sUaqqYyMhJQ4E7JCQ",
  startBlock: 306755000,
})
  .onCreate_position((args, _, ctx) => {
    const { amount, target_with_parameters: target } = args;
    if ("IntegrityPool" in target) {
      const { publisher } = target.IntegrityPool;
      ctx.eventLogger.emit("create_position", {
        amount,
        publisher,
      });
    }
  })
  .onClose_position((args, _, ctx) => {
    const { amount, target_with_parameters: target } = args;
    if ("IntegrityPool" in target) {
      const { publisher } = target.IntegrityPool;
      ctx.eventLogger.emit("close_position", {
        amount,
        publisher,
      });
    }
  });
