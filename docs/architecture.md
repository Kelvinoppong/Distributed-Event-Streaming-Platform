# Architecture

## Overview

The platform is a real-time event streaming pipeline built around Apache Kafka and Apache Flink. It ingests high-throughput e-commerce order events, processes them through stateful windowed aggregations, and persists results to PostgreSQL with exactly-once guarantees. Malformed or invalid events are routed to a dead letter queue with exponential retry backoff and Slack alerting.

## Data Flow

```
┌──────────────────┐     ┌──────────────────────────────┐     ┌──────────────────┐
│  Go Producer(s)  │────►│  Kafka Cluster (3 brokers)   │────►│  Apache Flink    │
│  N goroutines    │     │  KRaft mode, RF=3            │     │  RocksDB state   │
│  idempotent      │     │  12 partitions               │     │  exactly-once    │
│  ~2% poison pills│     │  min.insync.replicas=2       │     │  checkpointing   │
└──────────────────┘     └──────────────────────────────┘     └────────┬─────────┘
                                                                       │
                                                          ┌────────────┴────────────┐
                                                          ▼                         ▼
                                                 ┌────────────────┐       ┌─────────────────┐
                                                 │  PostgreSQL    │       │  DLQ Topic       │
                                                 │  JDBC upsert   │       │  (side output)   │
                                                 └────────────────┘       └────────┬────────┘
                                                                                   │
                                                                      ┌────────────┴───────────┐
                                                                      ▼                        ▼
                                                             ┌─────────────────┐     ┌──────────────────┐
                                                             │  Retry Consumer │     │  Kafka Connect   │
                                                             │  exp backoff    │     │  + Slack SMT     │
                                                             │  1s→2s→4s→8s→16s│     │                  │
                                                             └─────────────────┘     └──────────────────┘
```

## Components

### Go Event Producer

- Uses IBM/sarama client library with idempotent producer settings (`acks=all`, `max.in.flight.requests=1`).
- Generates `OrderEvent` payloads (JSON) with randomized order data across configurable worker goroutines.
- ~2% of generated events are intentional poison pills (negative amounts, empty user IDs, empty order IDs) to exercise the DLQ pipeline.
- Event rate is controlled via environment variables, enabling load-test-like throughput from a single binary.
- Key partitioning by `userId` ensures per-user ordering within Kafka partitions.

### Kafka Cluster

- 3 brokers running in KRaft mode (no ZooKeeper dependency).
- `order-events` topic: 12 partitions, replication factor 3, `min.insync.replicas=2`.
- `order-events-dlq` topic: 3 partitions, RF=3 for dead letter events.
- Transaction log configured with RF=3 and ISR=2 to support exactly-once producer semantics.
- Auto topic creation disabled; topics are created explicitly via `setup-local.sh`.

### Apache Flink Job (`OrderEventJob`)

- **Source**: KafkaSource with `CooperativeStickyAssignor` for reduced rebalance overhead.
- **Validation**: `ProcessFunction` with DLQ side output. Events with negative amounts, empty user IDs, or empty order IDs are routed to the `order-events-dlq` topic via a `KafkaSink`.
- **Watermark strategy**: Bounded out-of-orderness (5 seconds) with event-time timestamp extraction from the `timestamp` field.
- **Processing**: Filters `PLACED` events from the validated stream, keys by `userId`, and performs 1-minute tumbling window aggregations (count + total amount).
- **State backend**: RocksDB with incremental checkpointing every 30 seconds in `EXACTLY_ONCE` mode.
- **Sink**: JDBC batch sink to PostgreSQL with upsert semantics (`ON CONFLICT ... DO UPDATE`).

### Dead Letter Queue Pipeline

The DLQ pipeline provides multi-layered failure handling:

1. **Flink side output**: The `OrderEventJob` validates every event through a `ProcessFunction`. Invalid events (poison pills) are emitted via an `OutputTag` to a `KafkaSink` writing to the `order-events-dlq` topic. The main stream continues processing only valid events.

2. **DLQ retry consumer**: A standalone Go service consumes from `order-events-dlq` and implements exponential backoff retry:
   - Retry intervals: 1s, 2s, 4s, 8s, 16s (configurable base backoff).
   - Retry count is tracked via Kafka message headers (`retry-count`).
   - Events under the retry limit are re-published to `order-events` for reprocessing.
   - Events exceeding max retries trigger a Slack webhook notification and are logged as permanent failures.

3. **Kafka Connect Slack SMT**: A custom Single Message Transform (`SlackAlertTransform`) that posts real-time Slack notifications for every event arriving in the DLQ topic. Deployed via Kafka Connect with the DLQ connector configuration.

### PostgreSQL

- Stores windowed aggregation results in `user_order_stats` table.
- Composite primary key on `(user_id, window_start)` enables idempotent upserts from Flink.
- Indexed on window boundaries for time-range queries.

## Exactly-Once Guarantees

The pipeline achieves exactly-once delivery through three layers:

1. **Producer**: Sarama idempotent producer (`enable.idempotence=true`, `acks=all`) eliminates duplicates at the broker.
2. **Flink checkpointing**: `EXACTLY_ONCE` checkpoint mode with RocksDB ensures operator state is consistent across failures.
3. **Sink idempotency**: PostgreSQL upsert (`ON CONFLICT`) makes the sink naturally idempotent regardless of Flink retries.

## Local Development

All components run as Docker containers via `docker-compose.yml`. The Flink job JAR is mounted from the local Maven build output (`flink-jobs/target/`) into the Flink job manager container, allowing rapid iteration without image rebuilds.

DLQ services (retry consumer, Kafka Connect) run under Docker Compose profiles (`dlq`, `connect`) to keep the default stack lightweight. Enable them with:

```bash
docker compose --profile dlq --profile connect up -d
```
