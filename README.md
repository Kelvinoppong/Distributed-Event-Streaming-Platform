# Distributed Event Streaming Platform

[![CI](https://github.com/Kelvinoppong/Distributed-Event-Streaming-Platform/actions/workflows/ci.yml/badge.svg)](https://github.com/Kelvinoppong/Distributed-Event-Streaming-Platform/actions/workflows/ci.yml)
[![Docker](https://github.com/Kelvinoppong/Distributed-Event-Streaming-Platform/actions/workflows/docker.yml/badge.svg)](https://github.com/Kelvinoppong/Distributed-Event-Streaming-Platform/actions/workflows/docker.yml)

Real-time event streaming pipeline with exactly-once delivery guarantees, stateful stream processing, dead letter queue handling, and Kubernetes-native deployment.

## Architecture

```
┌────────────────┐     ┌────────────────────────────┐     ┌──────────────────┐
│ Go Producer(s) │────►│ Kafka Cluster (3 brokers)  │────►│  Apache Flink    │
│ idempotent     │     │ KRaft · RF=3 · 12 parts    │     │  RocksDB · E2E   │
└────────────────┘     └────────────────────────────┘     └────────┬─────────┘
        │ HPA                     │ Strimzi                        │
        │ PDB                     │ PDB                            │
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
- **3-broker Kafka cluster** managed by Strimzi with pod anti-affinity across availability zones.
- **Flink stateful processing** with custom watermarks, 1-minute tumbling windows, and RocksDB state backend.
- **Dead letter queue pipeline** with Flink side outputs, exponential retry backoff, poison pill detection, and Slack alerts via custom Kafka Connect SMT.
- **Kubernetes-native** with HPA autoscaling (2–20 pods), PodDisruptionBudgets for zero-downtime upgrades, and Helm chart for parameterized deployment.
- **Full observability**: Prometheus metrics collection, Grafana dashboards (throughput, P99 latency, DLQ rate, checkpoint duration), and alerting rules for Kafka, Flink, and DLQ anomalies.
- **CooperativeStickyAssignor** for minimal consumer group rebalance disruption.

## Tech Stack

| Component | Technology |
|-----------|------------|
| Message Broker | Apache Kafka 3.6 (Strimzi on K8s / KRaft local) |
| Stream Processing | Apache Flink 1.18 (K8s Operator) |
| State Backend | RocksDB |
| Producer | Go 1.21 + IBM/Sarama |
| Sink Database | PostgreSQL 16 |
| DLQ Retry | Go consumer + exponential backoff |
| DLQ Alerts | Kafka Connect + custom Slack SMT |
| Orchestration | Kubernetes + Helm |
| Autoscaling | HPA (CPU/memory) + PDB |
| Containerization | Docker Compose (local) |
| Metrics | Prometheus + JMX Exporter |
| Dashboards | Grafana (custom streaming dashboard) |
| Alerting | Prometheus alerting rules |

## Quick Start (Local Docker)

### Prerequisites

- Docker and Docker Compose v2
- Go 1.21+ (producer / DLQ consumer)
- Java 17 + Maven 3.9+ (Flink jobs)

```bash
cp .env.example .env
chmod +x scripts/setup-local.sh
./scripts/setup-local.sh
```

```bash
cd flink-jobs && mvn clean package -DskipTests
docker compose exec flink-jobmanager flink run /opt/flink/usrlib/order-event-processor-1.0.0.jar
cd ../producer && go mod tidy && go run .
```

| Service | URL |
|---------|-----|
| Kafka UI | http://localhost:8080 |
| Flink Dashboard | http://localhost:8081 |
| Grafana | http://localhost:3000 (admin / streaming) |
| Prometheus | http://localhost:9090 |
| PostgreSQL | `localhost:5432` (streaming / streaming) |

## Kubernetes Deployment

### Prerequisites

- kubectl, kind, helm

### Deploy

```bash
chmod +x scripts/deploy-k8s.sh
./scripts/deploy-k8s.sh
```

This creates a 3-worker kind cluster (simulating 3 AZs), installs Strimzi and Flink operators, deploys the Kafka cluster, PostgreSQL, Flink job, producer with HPA/PDB, and the DLQ retry consumer.

### Deploy via Helm

```bash
helm install streaming-platform ./helm/streaming-platform \
  --namespace streaming \
  --create-namespace \
  --values helm/streaming-platform/values.yaml
```

### Key Kubernetes Features

- **HorizontalPodAutoscaler**: Producer scales 2–20 replicas based on CPU (70%) and memory (80%) utilization with stabilization windows.
- **PodDisruptionBudgets**: Producer maintains min 2 available pods; Kafka allows max 1 unavailable broker during rolling upgrades.
- **Pod Anti-Affinity**: Kafka brokers spread across nodes via `requiredDuringSchedulingIgnoredDuringExecution`.
- **Strimzi Topic/User Operators**: Topics and ACLs managed declaratively via CRDs.

## Project Structure

```
├── docker-compose.yml              # Local dev infrastructure
├── producer/                       # Go event producer
├── flink-jobs/                     # Apache Flink stream processing
├── dlq-retry-consumer/             # DLQ retry service (Go)
├── kafka-connect/                  # Kafka Connect + Slack SMT
├── k8s/                            # Kubernetes manifests
│   ├── namespace.yaml
│   ├── kind-config.yaml            # 3-worker kind cluster (3 AZs)
│   ├── kafka/
│   │   ├── kafka-cluster.yaml      # Strimzi Kafka CRD
│   │   ├── kafka-topics.yaml       # Topic CRDs
│   │   ├── kafka-users.yaml        # User ACL CRDs
│   │   └── kafka-metrics-config.yaml
│   ├── flink/
│   │   ├── flink-deployment.yaml   # Flink K8s Operator CRD
│   │   ├── flink-job.yaml          # FlinkSessionJob CRD
│   │   └── flink-rbac.yaml
│   ├── producer/
│   │   ├── deployment.yaml
│   │   ├── hpa.yaml                # HPA: 2–20 replicas
│   │   └── pdb.yaml                # PDB: min 2 available
│   ├── dlq/
│   │   └── dlq-retry-deployment.yaml
│   ├── postgres/
│   │   └── postgres-deployment.yaml
│   └── monitoring/
│       ├── prometheus.yaml
│       ├── prometheus-alerts.yaml
│       ├── prometheus-rbac.yaml
│       ├── grafana.yaml
│       ├── grafana-dashboards-configmap.yaml
│       └── dashboards/kafka-overview.json
├── helm/streaming-platform/        # Helm chart
│   ├── Chart.yaml
│   ├── values.yaml
│   └── templates/
├── monitoring/                      # Local Prometheus + Grafana config
│   ├── prometheus.yml
│   ├── alerts/                      # Alert rules (Kafka, Flink, DLQ)
│   └── grafana/provisioning/        # Datasource + dashboard providers
├── load-test/                       # k6 load test scripts
│   ├── load_test.js                 # Main test with custom metrics + summary
│   └── config/                      # low, high, stress profiles
├── scripts/
│   ├── setup-local.sh
│   ├── deploy-k8s.sh
│   ├── run-load-test.sh
│   ├── run-integration-tests.sh
│   └── init-postgres.sql
├── .github/workflows/
│   ├── ci.yml                       # Build + test + lint + integration
│   └── docker.yml                   # Container image builds (GHCR)
└── docs/
    ├── architecture.md
    └── benchmarks.md
```

## Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `KAFKA_BROKERS` | `localhost:29092,...` | Kafka bootstrap servers |
| `KAFKA_TOPIC` | `order-events` | Target Kafka topic |
| `NUM_WORKERS` | `4` | Producer goroutines |
| `EVENTS_PER_SECOND` | `100` | Events/sec per worker |
| `MAX_RETRIES` | `5` | DLQ retry attempts |
| `BASE_BACKOFF_SECONDS` | `1` | Initial retry backoff |
| `SLACK_WEBHOOK_URL` | _(empty)_ | Slack webhook for DLQ alerts |

## Load Testing

Load tests use [k6](https://k6.io/) with the [xk6-kafka](https://github.com/mostafa/xk6-kafka) extension.

```bash
# Default profile (ramp to 1,000 VUs over 10 min)
./scripts/run-load-test.sh

# Available profiles: low, default, high, stress
./scripts/run-load-test.sh high
```

| Profile | Peak VUs | Duration | Purpose |
|---------|----------|----------|---------|
| `low` | 10 | 1 min | Smoke test |
| `default` | 1,000 | 10 min | Standard benchmark |
| `high` | 2,000 | 9 min | Sustained high throughput |
| `stress` | 5,000 | 12 min | Break point analysis |

Results and methodology: [docs/benchmarks.md](docs/benchmarks.md)

## Design Decisions

See [docs/architecture.md](docs/architecture.md) for details on exactly-once guarantees, DLQ pipeline design, Kubernetes deployment strategy, and component interactions.

## License

MIT
