package com.streaming.aggregator;

import com.streaming.model.OrderAccumulator;
import com.streaming.model.OrderEvent;
import com.streaming.model.UserOrderStats;
import org.apache.flink.api.common.functions.AggregateFunction;

public class OrderWindowAggregator
        implements AggregateFunction<OrderEvent, OrderAccumulator, UserOrderStats> {

    @Override
    public OrderAccumulator createAccumulator() {
        return new OrderAccumulator();
    }

    @Override
    public OrderAccumulator add(OrderEvent event, OrderAccumulator acc) {
        acc.userId = event.getUserId();
        acc.count++;
        acc.totalAmount += event.getAmount();
        return acc;
    }

    @Override
    public UserOrderStats getResult(OrderAccumulator acc) {
        return new UserOrderStats(acc.userId, acc.count, acc.totalAmount, 0, 0);
    }

    @Override
    public OrderAccumulator merge(OrderAccumulator a, OrderAccumulator b) {
        OrderAccumulator merged = new OrderAccumulator();
        merged.userId = a.userId;
        merged.count = a.count + b.count;
        merged.totalAmount = a.totalAmount + b.totalAmount;
        return merged;
    }
}
