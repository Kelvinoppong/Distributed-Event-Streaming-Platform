"use client";

import useSWR from "swr";
import { REFRESH_INTERVAL } from "@/lib/constants";
import { MetricCard } from "@/components/metric-card";
import { TimeSeriesChart } from "@/components/time-series-chart";
import { DataTable } from "@/components/data-table";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function KafkaPage() {
  const { data } = useSWR("/api/metrics/kafka", fetcher, {
    refreshInterval: REFRESH_INTERVAL,
  });

  const current = data?.current ?? {};
  const series = data?.series ?? {};
  const brokers = data?.brokers ?? [];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Kafka Cluster</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Broker metrics, throughput, and partition health
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <MetricCard
          label="Messages / sec"
          value={current.messagesIn ?? 0}
          unit="msg/s"
        />
        <MetricCard
          label="Bytes In"
          value={current.bytesIn ?? 0}
          unit="B/s"
        />
        <MetricCard
          label="Bytes Out"
          value={current.bytesOut ?? 0}
          unit="B/s"
        />
        <MetricCard
          label="P99 Produce"
          value={current.p99Produce ?? 0}
          unit="ms"
        />
        <MetricCard
          label="P99 Fetch"
          value={current.p99Fetch ?? 0}
          unit="ms"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <MetricCard
          label="Partitions"
          value={current.partitionCount ?? 0}
        />
        <MetricCard
          label="Under-Replicated"
          value={current.underReplicated ?? 0}
        />
        <MetricCard
          label="Offline Partitions"
          value={current.offlinePartitions ?? 0}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <TimeSeriesChart
          title="Messages In Per Second"
          data={series.messagesIn ?? []}
          color="var(--chart-1)"
          unit="msg/s"
        />
        <TimeSeriesChart
          title="Bytes In Per Second"
          data={series.bytesIn ?? []}
          color="var(--chart-2)"
          unit="B/s"
        />
      </div>

      <TimeSeriesChart
        title="Bytes Out Per Second"
        data={series.bytesOut ?? []}
        color="var(--chart-3)"
        unit="B/s"
      />

      <DataTable
        title="Per-Broker Throughput"
        columns={[
          { key: "instance", header: "Instance" },
          {
            key: "messagesIn",
            header: "Messages/sec",
            render: (v) =>
              typeof v === "number"
                ? v.toLocaleString(undefined, { maximumFractionDigits: 2 })
                : String(v),
          },
        ]}
        data={brokers}
      />
    </div>
  );
}
