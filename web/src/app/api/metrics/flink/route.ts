import { NextResponse } from "next/server";
import { queryInstant, queryRange } from "@/lib/prometheus";
import * as flink from "@/lib/flink";
import { PROM_QUERIES } from "@/lib/constants";

export const dynamic = "force-dynamic";

export async function GET() {
  const now = Math.floor(Date.now() / 1000);
  const fifteenMinAgo = now - 900;

  const [overview, jobs, checkpointDuration, checkpointsFailed, checkpointsCompleted, durationRange] =
    await Promise.all([
      flink.getOverview(),
      flink.getJobs(),
      queryInstant(PROM_QUERIES.flinkCheckpointDuration),
      queryInstant(PROM_QUERIES.flinkCheckpointsFailed),
      queryInstant(PROM_QUERIES.flinkCheckpointsCompleted),
      queryRange(PROM_QUERIES.flinkCheckpointDuration, fifteenMinAgo, now, 15),
    ]);

  const val = (r: typeof checkpointDuration) =>
    r.length > 0 ? parseFloat(r[0].value[1]) : 0;

  let checkpoints = null;
  const runningJobs = jobs.filter((j) => j.state === "RUNNING");
  if (runningJobs.length > 0) {
    checkpoints = await flink.getCheckpointStats(runningJobs[0].id);
  }

  return NextResponse.json({
    overview,
    jobs: jobs.map((j) => ({
      id: j.id,
      name: j.name,
      state: j.state,
      startTime: j["start-time"],
      duration: j.duration,
    })),
    metrics: {
      checkpointDuration: val(checkpointDuration),
      checkpointsFailed: val(checkpointsFailed),
      checkpointsCompleted: val(checkpointsCompleted),
    },
    checkpoints,
    series: {
      checkpointDuration:
        durationRange.length > 0
          ? durationRange[0].values.map(([ts, v]) => ({
              time: new Date(ts * 1000).toLocaleTimeString(),
              value: parseFloat(v),
            }))
          : [],
    },
  });
}
