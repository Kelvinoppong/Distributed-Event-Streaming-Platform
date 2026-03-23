# Architecture

## Overview

The platform is a real-time event streaming pipeline built around Apache Kafka and Apache Flink. It ingests high-throughput e-commerce order events, processes them through stateful windowed aggregations, and persists results to PostgreSQL with exactly-once guarantees. Malformed events are routed to a dead letter queue with exponential retry backoff and Slack alerting. The entire stack is deployable to Kubernetes via Strimzi, the Flink Kubernetes Operator, and a Helm chart.

## Data Flow

```
┌──────────────────┐     ┌──────────────────────────────┐     ┌──────────────────┐
│  Go Producer(s)  │────►│  Kafka Cluster (3 brokers)   │────►│  Apache Flink    │
│  N goroutines    │     │  Strimzi (K8s) / KRaft (local│     │  RocksDB state   │
│  idempotent      │     │  12 partitions, RF=3         │     │  exactly-once    │
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
- Key partitioning by `userId` ensures per-user ordering within Kafka partitions.
- On Kubernetes: Deployment with HPA (2–20 replicas, CPU/memory targets) and PDB (min 2 available).

### Kafka Cluster

- **Local**: 3 brokers in KRaft mode via Docker Compose.
- **Kubernetes**: Strimzi Kafka CRD with pod anti-affinity across availability zones, JMX Prometheus metrics, and entity operator for declarative topic/user management.
- `order-events` topic: 12 partitions, RF=3, `min.insync.replicas=2`.
- `order-events-dlq` topic: 3 partitions, RF=3 for dead letter events.
- Transaction log configured with RF=3 and ISR=2.
- PodDisruptionBudget allows max 1 unavailable broker during rolling upgrades.

### Apache Flink Job (`OrderEventJob`)

- **Source**: KafkaSource with `CooperativeStickyAssignor` for reduced rebalance overhead.
- **Validation**: `ProcessFunction` with DLQ side output. Events with negative amounts, empty user IDs, or empty order IDs are routed to `order-events-dlq` via `KafkaSink`.
- **Watermark strategy**: Bounded out-of-orderness (5 seconds) with event-time timestamp extraction.
- **Processing**: Filters `PLACED` events from the validated stream, keys by `userId`, performs 1-minute tumbling window aggregations.
- **State backend**: RocksDB with checkpointing every 30 seconds in `EXACTLY_ONCE` mode.
- **Sink**: JDBC batch sink to PostgreSQL with upsert semantics.
- **Kubernetes**: Managed by the Flink Kubernetes Operator via `FlinkDeployment` and `FlinkSessionJob` CRDs with savepoint-based upgrades.

### Dead Letter Queue Pipeline

1. **Flink side output**: Invalid events emitted via `OutputTag` to `KafkaSink` writing to `order-events-dlq`.
2. **DLQ retry consumer**: Go service with exponential backoff (1s→2s→4s→8s→16s). Events under retry limit are re-published to `order-events`. Permanent failures trigger Slack notifications.
3. **Kafka Connect Slack SMT**: Custom `SlackAlertTransform` posts real-time DLQ alerts to Slack via incoming webhook.

### PostgreSQL

- Stores windowed aggregation results in `user_order_stats` table.
- Composite primary key on `(user_id, window_start)` enables idempotent upserts.
- On Kubernetes: Deployment with PVC, Secret for credentials, and ConfigMap for init SQL.

## Kubernetes Deployment

### Operators

- **Strimzi**: Manages Kafka broker lifecycle, topic creation, user ACLs, and rolling upgrades.
- **Flink Kubernetes Operator**: Manages Flink job manager/task manager lifecycle and savepoint-based job upgrades.

### Autoscaling and Resilience

- **HPA**: Producer deployment scales 2–20 replicas based on CPU (70%) and memory (80%) with stabilization windows to prevent flapping.
- **PDB (Producer)**: `minAvailable: 2` ensures at least 2 producer pods remain during voluntary disruptions.
- **PDB (Kafka)**: `maxUnavailable: 1` allows only one broker to be unavailable during rolling upgrades (zero-downtime).
- **Pod Anti-Affinity**: Kafka brokers spread across nodes via `requiredDuringSchedulingIgnoredDuringExecution` on `kubernetes.io/hostname`.

### Helm Chart

All manifests are wrapped in a Helm chart (`helm/streaming-platform/`) with configurable values for:
- Kafka replica count, storage size, and resource limits
- Producer replica count, HPA thresholds, and PDB settings
- Flink parallelism, checkpoint interval, and resource allocation
- DLQ retry consumer settings
- Monitoring toggle

## Exactly-Once Guarantees

1. **Producer**: Sarama idempotent producer (`enable.idempotence=true`, `acks=all`).
2. **Flink checkpointing**: `EXACTLY_ONCE` mode with RocksDB state backend.
3. **Sink idempotency**: PostgreSQL `ON CONFLICT ... DO UPDATE` upsert.

## Observability

### Metrics Collection

- **Kafka**: JMX metrics exported via Strimzi's built-in Prometheus JMX Exporter (port 9404). Key metrics: messages/sec, bytes in/out, P99 produce latency, under-replicated partitions, consumer lag.
- **Flink**: Built-in metrics reporter exposes checkpoint duration, failure counts, job uptime, and backpressure metrics.
- **Prometheus**: Scrapes all metric endpoints at 15-second intervals with 7-day retention.

### Dashboards

Custom Grafana dashboard (`kafka-overview.json`) provides:
- Messages in per second (aggregate throughput)
- Bytes in/out per second
- P99 produce latency with threshold markers (warning at 5ms, critical at 10ms)
- Under-replicated partition count
- DLQ event rate with anomaly thresholds
- Flink checkpoint duration

### Alerting Rules

Three alert groups covering the critical failure modes:

| Alert | Condition | Severity |
|-------|-----------|----------|
| KafkaHighProducerLatency | P99 > 10ms for 2m | Warning |
| KafkaUnderReplicatedPartitions | > 0 for 1m | Critical |
| KafkaOfflinePartitions | > 0 for 1m | Critical |
| KafkaNoActiveController | 0 controllers for 1m | Critical |
| FlinkCheckpointFailed | Failures in 5m window | Critical |
| FlinkCheckpointDurationHigh | > 60s for 5m | Warning |
| DLQEventsDetected | DLQ receiving events for 5m | Warning |
| DLQHighRate | > 10 events/sec for 2m | Critical |

## Local Development

All components run via `docker-compose.yml`. The Flink job JAR is mounted from local Maven output. Prometheus and Grafana start automatically. DLQ services run under Docker Compose profiles (`dlq`, `connect`).
