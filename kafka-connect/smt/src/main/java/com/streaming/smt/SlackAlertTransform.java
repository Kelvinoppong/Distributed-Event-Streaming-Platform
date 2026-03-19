package com.streaming.smt;

import org.apache.kafka.common.config.ConfigDef;
import org.apache.kafka.connect.connector.ConnectRecord;
import org.apache.kafka.connect.transforms.Transformation;

import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.Map;

public class SlackAlertTransform<R extends ConnectRecord<R>> implements Transformation<R> {

    private static final String WEBHOOK_URL_CONFIG = "slack.webhook.url";

    private String webhookUrl;

    @Override
    public void configure(Map<String, ?> configs) {
        this.webhookUrl = (String) configs.get(WEBHOOK_URL_CONFIG);
    }

    @Override
    @SuppressWarnings("unchecked")
    public R apply(R record) {
        String orderId = "unknown";
        String userId = "unknown";
        String amount = "unknown";

        Object value = record.value();
        if (value instanceof Map) {
            Map<String, Object> map = (Map<String, Object>) value;
            orderId = String.valueOf(map.getOrDefault("order_id", "unknown"));
            userId  = String.valueOf(map.getOrDefault("user_id", "unknown"));
            amount  = String.valueOf(map.getOrDefault("amount", "unknown"));
        }

        String message = String.format(
                ":red_circle: *DLQ Alert*\n"
                        + "Order `%s` by user `%s` routed to dead letter queue\n"
                        + "Amount: $%s | Topic: `%s` | Partition: %d | Offset: %d",
                orderId, userId, amount,
                record.topic(), record.kafkaPartition(), record.kafkaOffset());

        postSlackAlert(message);
        return record;
    }

    private void postSlackAlert(String message) {
        if (webhookUrl == null || webhookUrl.isEmpty()) {
            return;
        }
        try {
            URL url = new URL(webhookUrl);
            HttpURLConnection conn = (HttpURLConnection) url.openConnection();
            conn.setRequestMethod("POST");
            conn.setRequestProperty("Content-Type", "application/json");
            conn.setDoOutput(true);

            String payload = String.format("{\"text\":\"%s\"}",
                    message.replace("\"", "\\\"").replace("\n", "\\n"));

            try (OutputStream os = conn.getOutputStream()) {
                os.write(payload.getBytes(StandardCharsets.UTF_8));
            }
            conn.getResponseCode();
            conn.disconnect();
        } catch (Exception e) {
            // Log but don't fail the pipeline for an alert side-effect
            System.err.println("Slack alert failed: " + e.getMessage());
        }
    }

    @Override
    public ConfigDef config() {
        return new ConfigDef()
                .define(WEBHOOK_URL_CONFIG, ConfigDef.Type.STRING, "",
                        ConfigDef.Importance.HIGH, "Slack incoming webhook URL");
    }

    @Override
    public void close() {}
}
