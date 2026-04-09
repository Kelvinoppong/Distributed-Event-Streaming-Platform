"use client";

import useSWR from "swr";
import { REFRESH_INTERVAL } from "@/lib/constants";
import { MetricCard } from "@/components/metric-card";
import { TimeSeriesChart } from "@/components/time-series-chart";
import { DataTable } from "@/components/data-table";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${(ms / 60000).toFixed(1)}m`;
}

export default function FlinkPage() {
  const { data } = useSWR("/api/metrics/flink", fetcher, {
    refreshInterval: REFRESH_INTERVAL,
  });

  const overview = data?.overview;
  const jobs = data?.jobs ?? [];
  const metrics = data?.metrics ?? {};
  const series = data?.series ?? {};

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Flink Jobs</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Stream processing job status and checkpoint health
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          label="Running Jobs"
          value={overview?.["jobs-running"] ?? 0}
        />
        <MetricCard
          label="Failed Jobs"
          value={overview?.["jobs-failed"] ?? 0}
        />
        <MetricCard
          label="Total Slots"
          value={overview?.["slots-total"] ?? 0}
        />
        <MetricCard
          label="Available Slots"
          value={overview?.["slots-available"] ?? 0}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <MetricCard
          label="Last Checkpoint Duration"
          value={formatDuration(metrics.checkpointDuration ?? 0)}
        />
        <MetricCard
          label="Completed Checkpoints"
          value={metrics.checkpointsCompleted ?? 0}
        />
        <MetricCard
          label="Failed Checkpoints (5m)"
          value={metrics.checkpointsFailed ?? 0}
        />
      </div>

      <TimeSeriesChart
        title="Checkpoint Duration Over Time"
        data={series.checkpointDuration ?? []}
        color="var(--chart-2)"
        unit="ms"
      />

      <DataTable
        title="Job Details"
        columns={[
          { key: "name", header: "Job Name" },
          {
            key: "state",
            header: "State",
            render: (v) => {
              const state = String(v);
              const colors: Record<string, string> = {
                RUNNING: "text-success",
                FAILED: "text-destructive",
                CANCELED: "text-warning",
                FINISHED: "text-muted-foreground",
              };
              return (
                <span className={`font-medium ${colors[state] ?? "text-foreground"}`}>
                  {state}
                </span>
              );
            },
          },
          {
            key: "duration",
            header: "Uptime",
            render: (v) => formatDuration(Number(v)),
          },
        ]}
        data={jobs}
      />

      {overview && (
        <div className="rounded-xl border border-border bg-card p-5">
          <h3 className="mb-3 text-sm font-medium text-card-foreground">
            Cluster Info
          </h3>
          <div className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
            <div>
              <p className="text-muted-foreground">Version</p>
              <p className="font-medium">{overview["flink-version"]}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Task Managers</p>
              <p className="font-medium">{overview.taskmanagers}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Jobs Finished</p>
              <p className="font-medium">{overview["jobs-finished"]}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Jobs Cancelled</p>
              <p className="font-medium">{overview["jobs-cancelled"]}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
