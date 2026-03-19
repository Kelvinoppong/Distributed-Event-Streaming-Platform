#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

echo "=== Distributed Event Streaming Platform — Local Setup ==="
echo ""

for cmd in docker; do
    if ! command -v "$cmd" &>/dev/null; then
        echo "ERROR: $cmd is required but not installed."
        exit 1
    fi
done

echo "[1/4] Starting infrastructure..."
cd "$PROJECT_DIR"
docker compose up -d kafka-1 kafka-2 kafka-3 kafka-ui postgres flink-jobmanager flink-taskmanager

echo "[2/4] Waiting for Kafka brokers to become healthy..."
for i in $(seq 1 40); do
    if docker compose exec -T kafka-1 kafka-topics --bootstrap-server kafka-1:9092 --list &>/dev/null 2>&1; then
        echo "       Kafka is ready."
        break
    fi
    if [ "$i" -eq 40 ]; then
        echo "ERROR: Kafka did not start within 80 seconds."
        docker compose logs kafka-1 --tail 30
        exit 1
    fi
    sleep 2
done

echo "[3/4] Creating topics..."
docker compose exec -T kafka-1 kafka-topics --create \
    --topic order-events \
    --partitions 12 \
    --replication-factor 3 \
    --config min.insync.replicas=2 \
    --config retention.ms=604800000 \
    --bootstrap-server kafka-1:9092 \
    2>/dev/null || echo "       order-events already exists"

docker compose exec -T kafka-1 kafka-topics --create \
    --topic order-events-dlq \
    --partitions 3 \
    --replication-factor 3 \
    --config min.insync.replicas=2 \
    --bootstrap-server kafka-1:9092 \
    2>/dev/null || echo "       order-events-dlq already exists"

docker compose exec -T kafka-1 kafka-topics --create \
    --topic order-stats \
    --partitions 6 \
    --replication-factor 3 \
    --config min.insync.replicas=2 \
    --bootstrap-server kafka-1:9092 \
    2>/dev/null || echo "       order-stats already exists"

echo ""
echo "[4/4] Verifying topic configuration..."
docker compose exec -T kafka-1 kafka-topics --describe --bootstrap-server kafka-1:9092

echo ""
echo "=== Services Ready ==="
echo "  Kafka UI        : http://localhost:8080"
echo "  Flink Dashboard : http://localhost:8081"
echo "  PostgreSQL      : localhost:5432  (streaming / streaming)"
echo ""
echo "Next steps:"
echo "  1. Build Flink job : cd flink-jobs && mvn clean package -DskipTests"
echo "  2. Submit job      : docker compose exec flink-jobmanager flink run /opt/flink/usrlib/order-event-processor-1.0.0.jar"
echo "  3. Start producer  : cd producer && go run ."
echo ""
