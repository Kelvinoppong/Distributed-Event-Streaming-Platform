#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

echo "=== Integration Tests ==="
echo ""

PASS=0
FAIL=0

assert() {
    local desc="$1"
    local cmd="$2"
    if eval "$cmd" &>/dev/null; then
        echo "  PASS  $desc"
        PASS=$((PASS + 1))
    else
        echo "  FAIL  $desc"
        FAIL=$((FAIL + 1))
    fi
}

# --- Kafka health ---
echo "[Kafka]"
assert "Broker kafka-1 is reachable" \
    "docker compose exec -T kafka-1 kafka-topics --bootstrap-server kafka-1:9092 --list"

assert "Topic order-events exists" \
    "docker compose exec -T kafka-1 kafka-topics --bootstrap-server kafka-1:9092 --describe --topic order-events"

assert "Topic order-events-dlq exists" \
    "docker compose exec -T kafka-1 kafka-topics --bootstrap-server kafka-1:9092 --describe --topic order-events-dlq"

assert "order-events has 12 partitions" \
    "docker compose exec -T kafka-1 kafka-topics --bootstrap-server kafka-1:9092 --describe --topic order-events | grep 'PartitionCount: 12'"

assert "order-events has RF=3" \
    "docker compose exec -T kafka-1 kafka-topics --bootstrap-server kafka-1:9092 --describe --topic order-events | grep 'ReplicationFactor: 3'"

# --- PostgreSQL health ---
echo ""
echo "[PostgreSQL]"
assert "PostgreSQL is accepting connections" \
    "docker compose exec -T postgres pg_isready -U streaming"

assert "user_order_stats table exists" \
    "docker compose exec -T postgres psql -U streaming -d streaming -c '\\d user_order_stats'"

# --- Flink health ---
echo ""
echo "[Flink]"
assert "Flink JobManager is running" \
    "docker compose exec -T flink-jobmanager curl -sf http://localhost:8081/overview"

# --- Producer smoke test ---
echo ""
echo "[Producer Smoke Test]"
cd "$PROJECT_DIR/producer"

if command -v go &>/dev/null; then
    assert "Producer binary builds" "go build -o /tmp/event-producer-test ."
    rm -f /tmp/event-producer-test
else
    echo "  SKIP  Producer build (Go not installed)"
fi

# --- Summary ---
echo ""
echo "=== Results: $PASS passed, $FAIL failed ==="
echo ""

if [ "$FAIL" -gt 0 ]; then
    exit 1
fi
