#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

echo "=== Distributed Event Streaming Platform — Kubernetes Deployment ==="
echo ""

for cmd in kubectl helm kind; do
    if ! command -v "$cmd" &>/dev/null; then
        echo "ERROR: $cmd is required but not installed."
        exit 1
    fi
done

# --- 1. Create kind cluster ---
echo "[1/7] Creating kind cluster with 3 worker nodes..."
if kind get clusters 2>/dev/null | grep -q streaming-platform; then
    echo "       Cluster 'streaming-platform' already exists, skipping."
else
    kind create cluster --config "$PROJECT_DIR/k8s/kind-config.yaml"
fi
kubectl cluster-info --context kind-streaming-platform

# --- 2. Create namespaces ---
echo "[2/7] Creating namespaces..."
kubectl apply -f "$PROJECT_DIR/k8s/namespace.yaml"

# --- 3. Install Strimzi operator ---
echo "[3/7] Installing Strimzi Kafka operator..."
if kubectl get deployment strimzi-cluster-operator -n kafka &>/dev/null 2>&1; then
    echo "       Strimzi already installed, skipping."
else
    kubectl create -f "https://strimzi.io/install/latest?namespace=kafka" -n kafka
    echo "       Waiting for Strimzi operator to be ready..."
    kubectl wait deployment/strimzi-cluster-operator \
        --for=condition=Available \
        --timeout=300s \
        -n kafka
fi

# --- 4. Deploy Kafka cluster ---
echo "[4/7] Deploying Kafka cluster via Strimzi CRDs..."
kubectl apply -f "$PROJECT_DIR/k8s/kafka/kafka-metrics-config.yaml"
kubectl apply -f "$PROJECT_DIR/k8s/kafka/kafka-cluster.yaml"
echo "       Waiting for Kafka cluster to be ready (this may take a few minutes)..."
kubectl wait kafka/order-streaming-cluster \
    --for=condition=Ready \
    --timeout=600s \
    -n kafka || echo "       WARNING: Kafka may still be initializing"
kubectl apply -f "$PROJECT_DIR/k8s/kafka/kafka-topics.yaml"
kubectl apply -f "$PROJECT_DIR/k8s/kafka/kafka-users.yaml"

# --- 5. Deploy PostgreSQL ---
echo "[5/7] Deploying PostgreSQL..."
kubectl apply -f "$PROJECT_DIR/k8s/postgres/postgres-deployment.yaml"
kubectl wait deployment/postgres \
    --for=condition=Available \
    --timeout=120s \
    -n streaming

# --- 6. Install Flink operator + deploy job ---
echo "[6/7] Installing Flink Kubernetes operator..."
helm repo add flink-operator-repo https://downloads.apache.org/flink/flink-kubernetes-operator-1.7.0/ 2>/dev/null || true
helm repo update
if helm list -n streaming | grep -q flink-kubernetes-operator; then
    echo "       Flink operator already installed, skipping."
else
    helm install flink-kubernetes-operator flink-operator-repo/flink-kubernetes-operator \
        --namespace streaming 2>/dev/null || echo "       Flink operator may already exist"
fi
kubectl apply -f "$PROJECT_DIR/k8s/flink/flink-rbac.yaml"
kubectl apply -f "$PROJECT_DIR/k8s/flink/flink-deployment.yaml"
kubectl apply -f "$PROJECT_DIR/k8s/flink/flink-job.yaml"

# --- 7. Deploy application components ---
echo "[7/7] Deploying application components..."
kubectl apply -f "$PROJECT_DIR/k8s/producer/deployment.yaml"
kubectl apply -f "$PROJECT_DIR/k8s/producer/hpa.yaml"
kubectl apply -f "$PROJECT_DIR/k8s/producer/pdb.yaml"
kubectl apply -f "$PROJECT_DIR/k8s/dlq/dlq-retry-deployment.yaml"

echo ""
echo "=== Deployment Complete ==="
echo ""
echo "Useful commands:"
echo "  kubectl get pods -n kafka              # Kafka broker pods"
echo "  kubectl get pods -n streaming          # Application pods"
echo "  kubectl get kafkatopics -n kafka       # Strimzi-managed topics"
echo "  kubectl port-forward svc/postgres 5432:5432 -n streaming   # Access PostgreSQL"
echo ""
echo "To deploy via Helm instead:"
echo "  helm install streaming-platform ./helm/streaming-platform \\"
echo "    --namespace streaming --create-namespace"
echo ""
