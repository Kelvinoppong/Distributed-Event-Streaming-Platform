import { NextResponse } from "next/server";
import { getAlerts } from "@/lib/prometheus";
import { getDemoAlerts } from "@/lib/demo-data";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const alerts = await getAlerts();
    if (alerts.length === 0) {
      const demo = getDemoAlerts();
      return NextResponse.json(demo);
    }
    const firing = alerts.filter((a) => a.state === "firing");
    const pending = alerts.filter((a) => a.state === "pending");
    return NextResponse.json({ firing, pending, total: alerts.length });
  } catch {
    return NextResponse.json(getDemoAlerts());
  }
}
