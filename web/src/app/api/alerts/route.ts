import { NextResponse } from "next/server";
import { getAlerts } from "@/lib/prometheus";

export const dynamic = "force-dynamic";

export async function GET() {
  const alerts = await getAlerts();
  const firing = alerts.filter((a) => a.state === "firing");
  const pending = alerts.filter((a) => a.state === "pending");

  return NextResponse.json({ firing, pending, total: alerts.length });
}
