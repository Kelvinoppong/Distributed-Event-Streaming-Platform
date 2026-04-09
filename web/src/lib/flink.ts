const FLINK_URL =
  process.env.FLINK_URL || "http://flink-jobmanager:8081";

export interface FlinkOverview {
  taskmanagers: number;
  "slots-total": number;
  "slots-available": number;
  "jobs-running": number;
  "jobs-finished": number;
  "jobs-cancelled": number;
  "jobs-failed": number;
  "flink-version": string;
}

export interface FlinkJob {
  id: string;
  name: string;
  state: string;
  "start-time": number;
  "end-time": number;
  duration: number;
}

export interface FlinkCheckpointStats {
  count: number;
  latest?: {
    completed?: {
      id: number;
      duration: number;
      state_size: number;
      end_to_end_duration: number;
    };
    failed?: {
      id: number;
      failure_timestamp: number;
    };
  };
}

export async function getOverview(): Promise<FlinkOverview | null> {
  try {
    const res = await fetch(`${FLINK_URL}/overview`, {
      next: { revalidate: 0 },
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export async function getJobs(): Promise<FlinkJob[]> {
  try {
    const res = await fetch(`${FLINK_URL}/jobs/overview`, {
      next: { revalidate: 0 },
    });
    if (!res.ok) return [];
    const json = await res.json();
    return json?.jobs ?? [];
  } catch {
    return [];
  }
}

export async function getCheckpointStats(
  jobId: string
): Promise<FlinkCheckpointStats | null> {
  try {
    const res = await fetch(
      `${FLINK_URL}/jobs/${jobId}/checkpoints`,
      { next: { revalidate: 0 } }
    );
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export async function checkHealth(): Promise<boolean> {
  try {
    const res = await fetch(`${FLINK_URL}/overview`, {
      next: { revalidate: 0 },
    });
    return res.ok;
  } catch {
    return false;
  }
}
