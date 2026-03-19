# Distributed Event Streaming Platform

Real-time event streaming pipeline with exactly-once delivery guarantees, stateful stream processing, dead letter queue handling, and Kubernetes-ready deployment.

## Architecture

```
┌────────────────┐     ┌────────────────────────────┐     ┌──────────────────┐
│ Go Producer(s) │────►│ Kafka Cluster (3 brokers)  │────►│  Apache Flink    │
│ idempotent     │     │ KRaft · RF=3 · 12 parts    │     │  RocksDB · E2E   │
└────────────────┘     └────────────────────────────┘     └────────┬─────────┘
                                                                   │
                                                       ┌───────────┴──────────┐
                                                       ▼                      ▼
                                              ┌──────────────┐     ┌──────────────────┐
                                              │  PostgreSQL   │     │  DLQ Topic       │
                                              │  JDBC upsert  │     │  order-events-dlq│
                                              └──────────────┘     └────────┬─────────┘
                                                                            │
                                                                ┌───────────┴──────────┐
                                                                ▼                      ▼
                                                       ┌──────────────┐     ┌──────────────────┐
                                                       │ Retry        │     │ Kafka Connect     │
                                                       │ Consumer     │     │ + Slack SMT       │
                                                       │ (exp backoff)│     │                   │
                                                       └──────────────┘     └──────────────────┘
```

### Highlights

- **Exactly-once semantics** end-to-end: idempotent Kafka producer, Flink EXACTLY_ONCE checkpointing, and PostgreSQL upsert sink.
- **3-broker KRaft cluster** with `min.insync.replicas=2`, 12 partitions, and 7-day retention.
- **Flink stateful processing** with custom watermarks, 1-minute tumbling windows, and RocksDB state backend.
- **Dead letter queue pipeline** with Flink side outputs, exponential retry backoff, poison pill detection, and Slack alerts via custom Kafka Connect SMT.
- **CooperativeStickyAssignor** for minimal consumer group rebalance disruption.

## Tech Stack

| Component | Technology |
|-----------|------------|
| Message Broker | Apache Kafka 3.6 (KRaft mode) |
| Stream Processing | Apache Flink 1.18 |
| State Backend | RocksDB |
| Producer | Go 1.21 + IBM/Sarama |
| Sink Database | PostgreSQL 16 |
| DLQ Retry | Go consumer + exponential backoff |
| DLQ Alerts | Kafka Connect + custom Slack SMT |
| Containerization | Docker Compose |
| Monitoring | Kafka UI (Redpanda Console) |

## Quick Start

### Prerequisites

- Docker and Docker Compose v2
- Go 1.21+ (producer / DLQ consumer)
- Java 17 + Maven 3.9+ (Flink jobs)

### 1. Start Infrastructure

```bash
cp .env.example .env
chmod +x scripts/setup-local.sh
./scripts/setup-local.sh
```

This brings up Kafka (3 brokers, KRaft mode), PostgreSQL, Flink (job manager + task manager), and Kafka UI, then creates the required topics.

### 2. Build the Flink Job

```bash
cd flink-jobs
mvn clean package -DskipTests
```

### 3. Submit the Flink Job

```bash
docker compose exec flink-jobmanager flink run \
  /opt/flink/usrlib/order-event-processor-1.0.0.jar
```

### 4. Start the Producer

```bash
cd producer
go mod tidy
go run .
```

The producer emits ~2% poison pill events (negative amounts, empty user/order IDs) to exercise the DLQ pipeline.

### 5. Start DLQ Services (optional)

```bash
# DLQ retry consumer with exponential backoff
docker compose --profile dlq up -d

# Kafka Connect with Slack SMT (set SLACK_WEBHOOK_URL in .env first)
docker compose --profile connect up -d
```

### 6. Observe

| Service | URL |
|---------|-----|
| Kafka UI | http://localhost:8080 |
| Flink Dashboard | http://localhost:8081 |
| Kafka Connect REST | http://localhost:8083 |
| PostgreSQL | `localhost:5432` (streaming / streaming) |

## Project Structure

```
├── docker-compose.yml              # Local dev infrastructure
├── .env.example                    # Environment variable defaults
├── producer/                       # Go event producer
│   ├── main.go                     # Entrypoint + worker orchestration
│   ├── config.go                   # Environment-based configuration
│   ├── event.go                    # OrderEvent model + generator + poison pills
│   ├── producer.go                 # Sarama idempotent producer
│   └── Dockerfile
├── flink-jobs/                     # Apache Flink stream processing
│   ├── pom.xml                     # Maven build + shade plugin
│   ├── Dockerfile
│   └── src/main/java/com/streaming/
│       ├── OrderEventJob.java      # Main Flink job + DLQ side output
│       ├── model/
│       │   ├── OrderEvent.java
│       │   ├── UserOrderStats.java
│       │   └── OrderAccumulator.java
│       ├── watermark/
│       │   └── OrderWatermarkStrategy.java
│       ├── aggregator/
│       │   └── OrderWindowAggregator.java
│       └── serialization/
│           ├── OrderEventDeserializer.java
│           └── OrderEventKafkaSerializer.java
├── dlq-retry-consumer/             # DLQ retry service
│   ├── main.go
│   ├── config.go
│   ├── consumer.go                 # Sarama consumer group handler
│   ├── retry.go                    # Exponential backoff + Slack alerts
│   └── Dockerfile
├── kafka-connect/                  # Kafka Connect + custom SMT
│   ├── Dockerfile
│   ├── connectors/
│   │   └── dlq-connector.json      # DLQ Slack alert connector config
│   └── smt/
│       ├── pom.xml
│       └── src/.../SlackAlertTransform.java
├── scripts/
│   ├── setup-local.sh              # One-command local bootstrap
│   └── init-postgres.sql           # Database schema
└── docs/
    └── architecture.md             # Detailed design documentation
```

## Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `KAFKA_BROKERS` | `localhost:29092,...` | Kafka bootstrap servers |
| `KAFKA_TOPIC` | `order-events` | Target Kafka topic |
| `NUM_WORKERS` | `4` | Producer goroutines |
| `EVENTS_PER_SECOND` | `100` | Events/sec per worker |
| `MAX_RETRIES` | `5` | DLQ retry attempts before permanent failure |
| `BASE_BACKOFF_SECONDS` | `1` | Initial retry backoff (doubles each attempt) |
| `SLACK_WEBHOOK_URL` | _(empty)_ | Slack webhook for DLQ alerts |
| `POSTGRES_DB` | `streaming` | PostgreSQL database |
| `POSTGRES_USER` | `streaming` | PostgreSQL user |
| `POSTGRES_PASSWORD` | `streaming` | PostgreSQL password |

## Design Decisions

See [docs/architecture.md](docs/architecture.md) for details on exactly-once guarantees, DLQ pipeline design, watermark strategy, and component interactions.

## License

MIT
