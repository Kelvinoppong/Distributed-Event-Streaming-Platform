"use client";

import useSWR from "swr";
import { Database, Zap, AlertTriangle, Server } from "lucide-react";
import { REFRESH_INTERVAL } from "@/lib/constants";
import { StatusCard } from "@/components/status-card";
import { MetricCard } from "@/components/metric-card";
import { AlertsPanel } from "@/components/alerts-panel";
import { TimeSeriesChart } from "@/components/time-series-chart";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

function latencyStatus(ms: number): "normal" | "warning" | "critical" {
  if (ms >= 10) return "critical";
  if (ms >= 6) return "warning";
  return "normal";
}

function dlqStatus(rate: number): "normal" | "warning" | "critical" {
  if (rate >= 5) return "critical";
  if (rate >= 1) return "warning";
  return "normal";
}

export default function OverviewPage() {
  const { data: health } = useSWR("/api/health", fetcher, {
    refreshInterval: REFRESH_INTERVAL,
  });
  const { data: kafka } = useSWR("/api/metrics/kafka", fetcher, {
    refreshInterval: REFRESH_INTERVAL,
  });
  const { data: flink } = useSWR("/api/metrics/flink", fetcher, {
    refreshInterval: REFRESH_INTERVAL,
  });
  const { data: alerts } = useSWR("/api/alerts", fetcher, {
    refreshInterval: REFRESH_INTERVAL,
  });
  const { data: dlq } = useSWR("/api/metrics/dlq", fetcher, {
    refreshInterval: REFRESH_INTERVAL,
  });
  const { data: analytics } = useSWR("/api/analytics/orders", fetcher, {
    refreshInterval: REFRESH_INTERVAL,
  });

  const healthStatus = (ok?: boolean) =>
    ok === undefined ? "loading" : ok ? "healthy" : "down";

  const dlqRate = dlq?.current?.eventRate ?? 0;
  const p99 = kafka?.current?.p99Produce ?? 0;
  const jobsRunning = flink?.overview?.["jobs-running"] ?? 0;
  const slotsTotal = flink?.overview?.["slots-total"] ?? 0;
  const slotsAvail = flink?.overview?.["slots-available"] ?? 0;
  const totalRows = analytics?.topUsers?.reduce(
    (s: number, u: { orderCount: number }) => s + (u.orderCount ?? 0),
    0
  ) ?? 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Platform Overview</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Real-time health and metrics across the streaming pipeline
        </p>
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatusCard
          title="Kafka Cluster"
          status={healthStatus(health?.kafka)}
          icon={Database}
          stats={[
            `${kafka?.current?.partitionCount ?? 0} partitions`,
            "3 brokers",
          ]}
        />
        <StatusCard
          title="Flink Jobs"
          status={healthStatus(health?.flink)}
          icon={Zap}
          stats={[
            `${jobsRunning} running`,
            `${slotsTotal - slotsAvail}/${slotsTotal} slots used`,
          ]}
        />
        <StatusCard
          title="Dead Letter Queue"
          status={healthStatus(health?.kafka)}
          icon={AlertTriangle}
          stats={[
            `${dlqRate.toFixed(2)} events/s`,
            `${dlq?.current?.messagesTotal ?? 0} total`,
          ]}
        />
        <StatusCard
          title="PostgreSQL"
          status={healthStatus(health?.postgres)}
          icon={Server}
          stats={[
            `${totalRows.toLocaleString()} rows written`,
          ]}
        />
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          label="Messages / sec"
          value={kafka?.current?.messagesIn ?? 0}
          unit="msg/s"
          status="normal"
        />
        <MetricCard
          label="Bytes In"
          value={kafka?.current?.bytesIn ?? 0}
          unit="B/s"
          status="normal"
        />
        <MetricCard
          label="P99 Produce Latency"
          value={p99}
          unit="ms"
          status={latencyStatus(p99)}
        />
        <MetricCard
          label="DLQ Event Rate"
          value={dlqRate}
          unit="events/s"
          status={dlqStatus(dlqRate)}
        />
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <TimeSeriesChart
          title="Kafka Throughput (msg/s)"
          data={kafka?.series?.messagesIn ?? []}
          color="var(--chart-1)"
          unit="msg/s"
        />
        <TimeSeriesChart
          title="P99 Produce Latency (ms)"
          data={kafka?.series?.p99Produce ?? []}
          color="var(--chart-4)"
          unit="ms"
        />
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <TimeSeriesChart
          title="DLQ Event Rate (events/s)"
          data={dlq?.series?.eventRate ?? []}
          color="var(--destructive)"
          unit="events/s"
        />
        <AlertsPanel
          firing={alerts?.firing ?? []}
          pending={alerts?.pending ?? []}
        />
      </div>
    </div>
  );
}
