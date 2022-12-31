import {Gauge, MetricOptions} from "@sentio/sdk";

export const gaugeOptions: MetricOptions = {
    sparse: true,
    aggregationConfig: {
        intervalInMinutes: [60],
    }
}
export const tx_processed = Gauge.register("tx_processed", gaugeOptions)
export const block_sizes = Gauge.register("block_sizes", gaugeOptions)
export const deposit = Gauge.register("deposit", gaugeOptions)

export const withdraw = Gauge.register("withdraw", gaugeOptions)