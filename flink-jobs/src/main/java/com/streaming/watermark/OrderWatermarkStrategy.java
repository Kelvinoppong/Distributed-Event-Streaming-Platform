package com.streaming.watermark;

import com.streaming.model.OrderEvent;
import org.apache.flink.api.common.eventtime.BoundedOutOfOrdernessWatermarks;
import org.apache.flink.api.common.eventtime.TimestampAssigner;
import org.apache.flink.api.common.eventtime.TimestampAssignerSupplier;
import org.apache.flink.api.common.eventtime.WatermarkGenerator;
import org.apache.flink.api.common.eventtime.WatermarkGeneratorSupplier;
import org.apache.flink.api.common.eventtime.WatermarkStrategy;

import java.time.Duration;

public class OrderWatermarkStrategy implements WatermarkStrategy<OrderEvent> {

    private static final long serialVersionUID = 1L;

    private static final Duration MAX_OUT_OF_ORDERNESS = Duration.ofSeconds(5);

    @Override
    public WatermarkGenerator<OrderEvent> createWatermarkGenerator(
            WatermarkGeneratorSupplier.Context context) {
        return new BoundedOutOfOrdernessWatermarks<>(MAX_OUT_OF_ORDERNESS);
    }

    @Override
    public TimestampAssigner<OrderEvent> createTimestampAssigner(
            TimestampAssignerSupplier.Context context) {
        return (event, recordTimestamp) -> event.getTimestamp();
    }
}
