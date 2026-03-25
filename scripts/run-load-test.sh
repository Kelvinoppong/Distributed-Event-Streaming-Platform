#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

PROFILE="${1:-default}"
KAFKA_BROKERS="${KAFKA_BROKERS:-localhost:29092}"
BATCH_SIZE="${BATCH_SIZE:-100}"

echo "=== Streaming Platform Load Test ==="
echo "  Profile : $PROFILE"
echo "  Brokers : $KAFKA_BROKERS"
echo "  Batch   : $BATCH_SIZE events/iteration"
echo ""

if ! command -v k6 &>/dev/null; then
    echo "ERROR: k6 is required. Install with:"
    echo "  brew install k6              # macOS"
    echo "  snap install k6              # Linux"
    echo "  docker run grafana/k6 ...    # Docker"
    echo ""
    echo "The kafka extension (xk6-kafka) is also required:"
    echo "  go install go.k6.io/xk6/cmd/xk6@latest"
    echo "  xk6 build --with github.com/mostafa/xk6-kafka@latest"
    exit 1
fi

CONFIG_FLAG=""
case "$PROFILE" in
    low)
        CONFIG_FLAG="--config $PROJECT_DIR/load-test/config/low.json"
        ;;
    high)
        CONFIG_FLAG="--config $PROJECT_DIR/load-test/config/high.json"
        ;;
    stress)
        CONFIG_FLAG="--config $PROJECT_DIR/load-test/config/stress.json"
        ;;
    default)
        ;;
    *)
        echo "Unknown profile: $PROFILE"
        echo "Available: default, low, high, stress"
        exit 1
        ;;
esac

echo "Starting load test..."
echo ""

KAFKA_BROKERS="$KAFKA_BROKERS" \
BATCH_SIZE="$BATCH_SIZE" \
k6 run $CONFIG_FLAG "$PROJECT_DIR/load-test/load_test.js"

echo ""
echo "Results saved to load-test/results.json"
echo "Update docs/benchmarks.md with the results above."
