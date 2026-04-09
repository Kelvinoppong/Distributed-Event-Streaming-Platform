"use client";

import useSWR from "swr";
import { REFRESH_INTERVAL } from "@/lib/constants";
import { MetricCard } from "@/components/metric-card";
import { TimeSeriesChart } from "@/components/time-series-chart";
import { AlertsPanel } from "@/components/alerts-panel";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function DLQPage() {
  const { data } = useSWR("/api/metrics/dlq", fetcher, {
    refreshInterval: REFRESH_INTERVAL,
  });

  const current = data?.current ?? {};
  const series = data?.series ?? {};
  const alerts = data?.alerts ?? [];

  const firing = alerts.filter((a: { state: string }) => a.state === "firing");
  const pending = alerts.filter((a: { state: string }) => a.state === "pending");

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dead Letter Queue</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Monitor poison pill events, retry rates, and DLQ alerts
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <MetricCard
          label="DLQ Event Rate"
          value={current.eventRate ?? 0}
          unit="events/s"
        />
        <MetricCard
          label="DLQ Messages Total"
          value={current.messagesTotal ?? 0}
          unit="msg/s"
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <TimeSeriesChart
          title="DLQ Event Rate (30m)"
          data={series.eventRate ?? []}
          color="var(--destructive)"
          unit="events/s"
          height={300}
        />
        <AlertsPanel firing={firing} pending={pending} />
      </div>

      <div className="rounded-xl border border-border bg-card p-5">
        <h3 className="mb-3 text-sm font-medium text-card-foreground">
          DLQ Pipeline Architecture
        </h3>
        <div className="flex flex-wrap items-center gap-3 text-sm">
          {[
            { label: "Flink Validator", desc: "ProcessFunction" },
            { label: "Side Output", desc: "OutputTag" },
            { label: "order-events-dlq", desc: "Kafka Topic" },
            { label: "Retry Consumer", desc: "Go Service" },
            { label: "Slack Alert", desc: "Kafka Connect SMT" },
          ].map((step, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="rounded-lg border border-border bg-accent px-3 py-2">
                <p className="font-medium text-card-foreground">{step.label}</p>
                <p className="text-xs text-muted-foreground">{step.desc}</p>
              </div>
              {i < 4 && (
                <span className="text-muted-foreground">&rarr;</span>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
