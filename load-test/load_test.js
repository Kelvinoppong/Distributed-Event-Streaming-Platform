import { Writer, Connection } from "k6/x/kafka";
import { check } from "k6";
import { Counter, Rate, Trend } from "k6/metrics";

const brokers = __ENV.KAFKA_BROKERS
  ? __ENV.KAFKA_BROKERS.split(",")
  : ["localhost:29092"];
const topic = __ENV.KAFKA_TOPIC || "order-events";
const batchSize = parseInt(__ENV.BATCH_SIZE || "100");

const writer = new Writer({
  brokers: brokers,
  topic: topic,
  autoCreateTopic: false,
  requiredAcks: -1, // acks=all
});

const messagesSent = new Counter("kafka_messages_sent");
const sendErrors = new Rate("kafka_send_errors");
const sendDuration = new Trend("kafka_send_duration_ms", true);

export const options = {
  scenarios: {
    ramp_up: {
      executor: "ramping-vus",
      startVUs: 0,
      stages: [
        { duration: "30s", target: 50 },
        { duration: "1m", target: 200 },
        { duration: "2m", target: 500 },
        { duration: "3m", target: 1000 },
        { duration: "2m", target: 1000 },
        { duration: "1m", target: 500 },
        { duration: "30s", target: 0 },
      ],
    },
  },
  thresholds: {
    kafka_send_errors: ["rate<0.01"],
    kafka_send_duration_ms: ["p(99)<10"],
  },
};

const statuses = ["PLACED", "SHIPPED", "CANCELLED"];

function generateOrderEvent(vuId, iter) {
  return {
    order_id: `ord-${Date.now()}-${vuId}-${iter}`,
    user_id: `user-${Math.floor(Math.random() * 10000)}`,
    amount: parseFloat((Math.random() * 500).toFixed(2)),
    status: statuses[Math.floor(Math.random() * statuses.length)],
    timestamp: Date.now(),
  };
}

export default function () {
  const messages = Array.from({ length: batchSize }, (_, i) => ({
    key: `user-${Math.floor(Math.random() * 10000)}`,
    value: JSON.stringify(generateOrderEvent(__VU, __ITER * batchSize + i)),
  }));

  const start = Date.now();
  try {
    writer.produce({ messages });
    messagesSent.add(batchSize);
    sendErrors.add(false);
    sendDuration.add(Date.now() - start);
  } catch (e) {
    sendErrors.add(true);
    console.error(`Send failed: ${e.message}`);
  }
}

export function teardown() {
  writer.close();
}

export function handleSummary(data) {
  const totalMessages = data.metrics.kafka_messages_sent
    ? data.metrics.kafka_messages_sent.values.count
    : 0;
  const durationSec = data.state.testRunDurationMs / 1000;
  const throughput = Math.round(totalMessages / durationSec);
  const p99 = data.metrics.kafka_send_duration_ms
    ? data.metrics.kafka_send_duration_ms.values["p(99)"]
    : "N/A";
  const p95 = data.metrics.kafka_send_duration_ms
    ? data.metrics.kafka_send_duration_ms.values["p(95)"]
    : "N/A";
  const p50 = data.metrics.kafka_send_duration_ms
    ? data.metrics.kafka_send_duration_ms.values["p(50)"]
    : "N/A";

  const summary = `
## Load Test Results — ${new Date().toISOString().split("T")[0]}

| Metric | Value |
|--------|-------|
| Total Messages | ${totalMessages.toLocaleString()} |
| Duration | ${durationSec.toFixed(1)}s |
| Throughput | ${throughput.toLocaleString()} events/sec |
| P50 Send Latency | ${p50}ms |
| P95 Send Latency | ${p95}ms |
| P99 Send Latency | ${p99}ms |
| Error Rate | ${(data.metrics.kafka_send_errors ? data.metrics.kafka_send_errors.values.rate * 100 : 0).toFixed(2)}% |
`;

  return {
    stdout: summary,
    "load-test/results.json": JSON.stringify(data, null, 2),
  };
}
