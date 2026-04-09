"use client";

import useSWR from "swr";
import { REFRESH_INTERVAL } from "@/lib/constants";
import { TimeSeriesChart } from "@/components/time-series-chart";
import { DataTable } from "@/components/data-table";
import { MetricCard } from "@/components/metric-card";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function AnalyticsPage() {
  const { data } = useSWR("/api/analytics/orders", fetcher, {
    refreshInterval: REFRESH_INTERVAL,
  });

  const topUsers = data?.topUsers ?? [];
  const revenueOverTime = data?.revenueOverTime ?? [];
  const volumeOverTime = data?.volumeOverTime ?? [];

  const totalRevenue = topUsers.reduce(
    (sum: number, u: { totalAmount: number }) => sum + u.totalAmount,
    0
  );
  const totalOrders = topUsers.reduce(
    (sum: number, u: { orderCount: number }) => sum + u.orderCount,
    0
  );

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Order Analytics</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Aggregated order statistics from PostgreSQL (Flink windowed output)
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <MetricCard label="Total Revenue" value={`$${totalRevenue.toLocaleString(undefined, { maximumFractionDigits: 2 })}`} />
        <MetricCard label="Total Orders" value={totalOrders} />
        <MetricCard
          label="Avg Order Value"
          value={
            totalOrders > 0
              ? `$${(totalRevenue / totalOrders).toFixed(2)}`
              : "$0"
          }
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <TimeSeriesChart
          title="Revenue Over Time"
          data={revenueOverTime}
          color="var(--chart-1)"
          unit="$"
        />
        <TimeSeriesChart
          title="Order Volume Over Time"
          data={volumeOverTime}
          color="var(--chart-3)"
          unit="orders"
        />
      </div>

      <DataTable
        title="Top Users by Revenue"
        columns={[
          { key: "userId", header: "User ID" },
          {
            key: "orderCount",
            header: "Orders",
            render: (v) => Number(v).toLocaleString(),
          },
          {
            key: "totalAmount",
            header: "Total Amount",
            render: (v) =>
              `$${Number(v).toLocaleString(undefined, { maximumFractionDigits: 2 })}`,
          },
        ]}
        data={topUsers}
      />
    </div>
  );
}
