const PROMETHEUS_URL =
  process.env.PROMETHEUS_URL || "http://prometheus:9090";

export interface PromInstantResult {
  metric: Record<string, string>;
  value: [number, string];
}

export interface PromRangeResult {
  metric: Record<string, string>;
  values: [number, string][];
}

export interface PromAlert {
  labels: Record<string, string>;
  annotations: Record<string, string>;
  state: "firing" | "pending" | "inactive";
  activeAt: string;
  value: string;
}

export async function queryInstant(
  query: string
): Promise<PromInstantResult[]> {
  const url = `${PROMETHEUS_URL}/api/v1/query?query=${encodeURIComponent(query)}`;
  const res = await fetch(url, { next: { revalidate: 0 } });
  if (!res.ok) return [];
  const json = await res.json();
  return json?.data?.result ?? [];
}

export async function queryRange(
  query: string,
  start: number,
  end: number,
  step: number
): Promise<PromRangeResult[]> {
  const params = new URLSearchParams({
    query,
    start: start.toString(),
    end: end.toString(),
    step: step.toString(),
  });
  const url = `${PROMETHEUS_URL}/api/v1/query_range?${params}`;
  const res = await fetch(url, { next: { revalidate: 0 } });
  if (!res.ok) return [];
  const json = await res.json();
  return json?.data?.result ?? [];
}

export async function getAlerts(): Promise<PromAlert[]> {
  const url = `${PROMETHEUS_URL}/api/v1/alerts`;
  const res = await fetch(url, { next: { revalidate: 0 } });
  if (!res.ok) return [];
  const json = await res.json();
  return json?.data?.alerts ?? [];
}

export async function checkHealth(): Promise<boolean> {
  try {
    const res = await fetch(`${PROMETHEUS_URL}/-/healthy`, {
      next: { revalidate: 0 },
    });
    return res.ok;
  } catch {
    return false;
  }
}
