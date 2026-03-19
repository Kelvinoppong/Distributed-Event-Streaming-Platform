package com.streaming.serialization;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.streaming.model.OrderEvent;
import org.apache.flink.api.common.serialization.DeserializationSchema;
import org.apache.flink.api.common.typeinfo.TypeInformation;

import java.io.IOException;

public class OrderEventDeserializer implements DeserializationSchema<OrderEvent> {

    private static final long serialVersionUID = 1L;

    private transient ObjectMapper mapper;

    private ObjectMapper getMapper() {
        if (mapper == null) {
            mapper = new ObjectMapper();
        }
        return mapper;
    }

    @Override
    public OrderEvent deserialize(byte[] message) throws IOException {
        return getMapper().readValue(message, OrderEvent.class);
    }

    @Override
    public boolean isEndOfStream(OrderEvent nextElement) {
        return false;
    }

    @Override
    public TypeInformation<OrderEvent> getProducedType() {
        return TypeInformation.of(OrderEvent.class);
    }
}
