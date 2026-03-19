package com.streaming;

import com.streaming.aggregator.OrderWindowAggregator;
import com.streaming.model.OrderEvent;
import com.streaming.model.UserOrderStats;
import com.streaming.serialization.OrderEventDeserializer;
import com.streaming.watermark.OrderWatermarkStrategy;

import org.apache.flink.connector.jdbc.JdbcConnectionOptions;
import org.apache.flink.connector.jdbc.JdbcExecutionOptions;
import org.apache.flink.connector.jdbc.JdbcSink;
import org.apache.flink.connector.kafka.source.KafkaSource;
import org.apache.flink.connector.kafka.source.enumerator.initializer.OffsetsInitializer;
import org.apache.flink.contrib.streaming.state.EmbeddedRocksDBStateBackend;
import org.apache.flink.streaming.api.datastream.DataStream;
import org.apache.flink.streaming.api.environment.StreamExecutionEnvironment;
import org.apache.flink.streaming.api.functions.windowing.ProcessWindowFunction;
import org.apache.flink.streaming.api.windowing.assigners.TumblingEventTimeWindows;
import org.apache.flink.streaming.api.windowing.time.Time;
import org.apache.flink.streaming.api.windowing.windows.TimeWindow;
import org.apache.flink.util.Collector;

public class OrderEventJob {

    public static void main(String[] args) throws Exception {

        StreamExecutionEnvironment env = StreamExecutionEnvironment.getExecutionEnvironment();
        env.setStateBackend(new EmbeddedRocksDBStateBackend());
        env.enableCheckpointing(30_000);

        String brokers     = envOrDefault("KAFKA_BROKERS", "kafka-1:9092,kafka-2:9092,kafka-3:9092");
        String groupId     = envOrDefault("CONSUMER_GROUP_ID", "flink-order-processor");
        String jdbcUrl     = envOrDefault("JDBC_URL", "jdbc:postgresql://postgres:5432/streaming");
        String jdbcUser    = envOrDefault("JDBC_USER", "streaming");
        String jdbcPassword = envOrDefault("JDBC_PASSWORD", "streaming");

        KafkaSource<OrderEvent> source = KafkaSource.<OrderEvent>builder()
                .setBootstrapServers(brokers)
                .setTopics("order-events")
                .setGroupId(groupId)
                .setStartingOffsets(OffsetsInitializer.latest())
                .setValueOnlyDeserializer(new OrderEventDeserializer())
                .setProperty("partition.assignment.strategy",
                        "org.apache.kafka.clients.consumer.CooperativeStickyAssignor")
                .build();

        DataStream<OrderEvent> orderStream = env.fromSource(
                source,
                new OrderWatermarkStrategy(),
                "Kafka Source");

        DataStream<UserOrderStats> stats = orderStream
                .filter(e -> "PLACED".equals(e.getStatus()))
                .keyBy(OrderEvent::getUserId)
                .window(TumblingEventTimeWindows.of(Time.minutes(1)))
                .aggregate(
                        new OrderWindowAggregator(),
                        new ProcessWindowFunction<UserOrderStats, UserOrderStats, String, TimeWindow>() {
                            @Override
                            public void process(String key,
                                                Context ctx,
                                                Iterable<UserOrderStats> elements,
                                                Collector<UserOrderStats> out) {
                                UserOrderStats result = elements.iterator().next();
                                result.setWindowStart(ctx.window().getStart());
                                result.setWindowEnd(ctx.window().getEnd());
                                out.collect(result);
                            }
                        });

        stats.addSink(JdbcSink.sink(
                "INSERT INTO user_order_stats (user_id, order_count, total_amount, window_start, window_end) "
                        + "VALUES (?, ?, ?, ?, ?) "
                        + "ON CONFLICT (user_id, window_start) DO UPDATE SET "
                        + "order_count = EXCLUDED.order_count, total_amount = EXCLUDED.total_amount",
                (statement, stat) -> {
                    statement.setString(1, stat.getUserId());
                    statement.setLong(2, stat.getOrderCount());
                    statement.setDouble(3, stat.getTotalAmount());
                    statement.setTimestamp(4, new java.sql.Timestamp(stat.getWindowStart()));
                    statement.setTimestamp(5, new java.sql.Timestamp(stat.getWindowEnd()));
                },
                JdbcExecutionOptions.builder()
                        .withBatchSize(100)
                        .withBatchIntervalMs(1000)
                        .withMaxRetries(3)
                        .build(),
                new JdbcConnectionOptions.JdbcConnectionOptionsBuilder()
                        .withUrl(jdbcUrl)
                        .withDriverName("org.postgresql.Driver")
                        .withUsername(jdbcUser)
                        .withPassword(jdbcPassword)
                        .build()));

        stats.print();

        env.execute("Order Event Processing Job");
    }

    private static String envOrDefault(String key, String defaultValue) {
        String value = System.getenv(key);
        return (value != null && !value.isEmpty()) ? value : defaultValue;
    }
}
