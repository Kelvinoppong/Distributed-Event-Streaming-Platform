import { NextResponse } from "next/server";
import * as prom from "@/lib/prometheus";
import * as pg from "@/lib/postgres";
import * as flink from "@/lib/flink";

export const dynamic = "force-dynamic";

export async function GET() {
  const [prometheus, postgres, flinkOk] = await Promise.all([
    prom.checkHealth(),
    pg.checkHealth(),
    flink.checkHealth(),
  ]);

  return NextResponse.json({
    prometheus,
    postgres,
    flink: flinkOk,
    kafka: prometheus,
  });
}
