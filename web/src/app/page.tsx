"use client";

import useSWR from "swr";
import { Database, Zap, AlertTriangle, Server } from "lucide-react";
import { REFRESH_INTERVAL } from "@/lib/constants";
import { StatusCard } from "@/components/status-card";
import { MetricCard } from "@/components/metric-card";
import { AlertsPanel } from "@/components/alerts-panel";
import { TimeSeriesChart } from "@/components/time-series-chart";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function OverviewPage() {
  const { data: health } = useSWR("/api/health", fetcher, {
    refreshInterval: REFRESH_INTERVAL,
  });
  const { data: kafka } = useSWR("/api/metrics/kafka", fetcher, {
    refreshInterval: REFRESH_INTERVAL,
  });
  const { data: alerts } = useSWR("/api/alerts", fetcher, {
    refreshInterval: REFRESH_INTERVAL,
  });
  const { data: dlq } = useSWR("/api/metrics/dlq", fetcher, {
    refreshInterval: REFRESH_INTERVAL,
  });

  const healthStatus = (ok?: boolean) =>
    ok === undefined ? "loading" : ok ? "healthy" : "down";

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Platform Overview</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Real-time health and metrics across the streaming pipeline
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatusCard
          title="Kafka Cluster"
          status={healthStatus(health?.kafka)}
          icon={Database}
          detail={kafka ? `${kafka.current?.partitionCount ?? 0} partitions` : undefined}
        />
        <StatusCard
          title="Flink Jobs"
          status={healthStatus(health?.flink)}
          icon={Zap}
        />
        <StatusCard
          title="Dead Letter Queue"
          status={
            dlq?.alerts?.some((a: { state: string }) => a.state === "firing")
              ? "degraded"
              : healthStatus(health?.kafka)
          }
          icon={AlertTriangle}
          detail={dlq ? `${dlq.current?.eventRate?.toFixed(2) ?? 0} events/sec` : undefined}
        />
        <StatusCard
          title="PostgreSQL"
          status={healthStatus(health?.postgres)}
          icon={Server}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          label="Messages / sec"
          value={kafka?.current?.messagesIn ?? 0}
          unit="msg/s"
        />
        <MetricCard
          label="Bytes In"
          value={kafka?.current?.bytesIn ?? 0}
          unit="B/s"
        />
        <MetricCard
          label="P99 Produce Latency"
          value={kafka?.current?.p99Produce ?? 0}
          unit="ms"
        />
        <MetricCard
          label="DLQ Event Rate"
          value={dlq?.current?.eventRate ?? 0}
          unit="events/s"
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <TimeSeriesChart
          title="Kafka Throughput (msg/s)"
          data={kafka?.series?.messagesIn ?? []}
          color="var(--chart-1)"
          unit="msg/s"
        />
        <AlertsPanel
          firing={alerts?.firing ?? []}
          pending={alerts?.pending ?? []}
        />
      </div>
    </div>
  );
}
