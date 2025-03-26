import { NextResponse } from "next/server";
import { queryInstant, queryRange, getAlerts } from "@/lib/prometheus";
import { PROM_QUERIES } from "@/lib/constants";
import { getDemoDlqMetrics } from "@/lib/demo-data";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const now = Math.floor(Date.now() / 1000);
    const thirtyMinAgo = now - 1800;

    const [eventRate, messagesTotal, rateRange, alerts] = await Promise.all([
      queryInstant(PROM_QUERIES.dlqEventRate),
      queryInstant(PROM_QUERIES.dlqMessagesTotal),
      queryRange(PROM_QUERIES.dlqEventRate, thirtyMinAgo, now, 15),
      getAlerts(),
    ]);

    const hasData = eventRate.length > 0 || messagesTotal.length > 0;
    if (!hasData) return NextResponse.json(getDemoDlqMetrics());

    const val = (r: typeof eventRate) =>
      r.length > 0 ? parseFloat(r[0].value[1]) : 0;

    const dlqAlerts = alerts.filter(
      (a) =>
        a.labels.alertname === "DLQEventsDetected" ||
        a.labels.alertname === "DLQHighRate"
    );

    return NextResponse.json({
      current: {
        eventRate: val(eventRate),
        messagesTotal: val(messagesTotal),
      },
      series: {
        eventRate:
          rateRange.length > 0
            ? rateRange[0].values.map(([ts, v]) => ({
                time: new Date(ts * 1000).toLocaleTimeString(),
                value: parseFloat(v),
              }))
            : [],
      },
      alerts: dlqAlerts.map((a) => ({
        name: a.labels.alertname,
        state: a.state,
        activeAt: a.activeAt,
      })),
    });
  } catch {
    return NextResponse.json(getDemoDlqMetrics());
  }
}
