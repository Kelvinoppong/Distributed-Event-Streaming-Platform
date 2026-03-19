package com.streaming.serialization;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.streaming.model.OrderEvent;
import org.apache.flink.connector.kafka.sink.KafkaRecordSerializationSchema;
import org.apache.kafka.clients.producer.ProducerRecord;

import javax.annotation.Nullable;

public class OrderEventKafkaSerializer implements KafkaRecordSerializationSchema<OrderEvent> {

    private static final long serialVersionUID = 1L;

    private final String topic;
    private transient ObjectMapper mapper;

    public OrderEventKafkaSerializer(String topic) {
        this.topic = topic;
    }

    private ObjectMapper getMapper() {
        if (mapper == null) {
            mapper = new ObjectMapper();
        }
        return mapper;
    }

    @Override
    public ProducerRecord<byte[], byte[]> serialize(
            OrderEvent event,
            KafkaSinkContext context,
            @Nullable Long timestamp) {
        try {
            byte[] value = getMapper().writeValueAsBytes(event);
            byte[] key = event.getUserId() != null
                    ? event.getUserId().getBytes()
                    : null;
            return new ProducerRecord<>(topic, key, value);
        } catch (Exception e) {
            throw new RuntimeException("Failed to serialize OrderEvent to DLQ", e);
        }
    }
}
