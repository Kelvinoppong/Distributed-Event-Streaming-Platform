# Architecture

## Overview

The platform is a real-time event streaming pipeline built around Apache Kafka and Apache Flink. It ingests high-throughput e-commerce order events, processes them through stateful windowed aggregations, and persists results to PostgreSQL with exactly-once guarantees.

## Data Flow

```
┌──────────────────┐     ┌──────────────────────────────┐     ┌──────────────────┐
│  Go Producer(s)  │────►│  Kafka Cluster (3 brokers)   │────►│  Apache Flink    │
│  N goroutines    │     │  KRaft mode, RF=3            │     │  RocksDB state   │
│  idempotent      │     │  12 partitions               │     │  exactly-once    │
└──────────────────┘     │  min.insync.replicas=2       │     │  checkpointing   │
                         └──────────────────────────────┘     └────────┬─────────┘
                                                                       │
                                                          ┌────────────┴────────────┐
                                                          ▼                         ▼
                                                 ┌────────────────┐       ┌─────────────────┐
                                                 │  PostgreSQL    │       │  DLQ Topic       │
                                                 │  JDBC sink     │       │  (future phase)  │
                                                 └────────────────┘       └─────────────────┘
```

## Components

### Go Event Producer

- Uses IBM/sarama client library with idempotent producer settings (`acks=all`, `max.in.flight.requests=1`).
- Generates `OrderEvent` payloads (JSON) with randomized order data across configurable worker goroutines.
- Event rate is controlled via environment variables, enabling load-test-like throughput from a single binary.
- Key partitioning by `userId` ensures per-user ordering within Kafka partitions.

### Kafka Cluster

- 3 brokers running in KRaft mode (no ZooKeeper dependency).
- `order-events` topic: 12 partitions, replication factor 3, `min.insync.replicas=2`.
- Transaction log configured with RF=3 and ISR=2 to support exactly-once producer semantics.
- Auto topic creation disabled; topics are created explicitly via `setup-local.sh`.

### Apache Flink Job (`OrderEventJob`)

- **Source**: KafkaSource with `CooperativeStickyAssignor` for reduced rebalance overhead.
- **Watermark strategy**: Bounded out-of-orderness (5 seconds) with event-time timestamp extraction from the `timestamp` field.
- **Processing**: Filters `PLACED` events, keys by `userId`, and performs 1-minute tumbling window aggregations (count + total amount).
- **State backend**: RocksDB with incremental checkpointing every 30 seconds in `EXACTLY_ONCE` mode.
- **Sink**: JDBC batch sink to PostgreSQL with upsert semantics (`ON CONFLICT ... DO UPDATE`).

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
