function seededRandom(seed: number): number {
  const x = Math.sin(seed) * 43758.5453;
  return x - Math.floor(x);
}

function timeWave(freqMinutes: number, amplitude: number, offset: number): number {
  const t = Date.now() / 1000 / 60;
  return Math.sin((t / freqMinutes) * Math.PI * 2 + offset) * amplitude;
}

function generateTimeSeries(
  points: number,
  baseValue: number,
  variance: number,
  stepMs = 15000,
  waveFreq = 8
) {
  const now = Date.now();
  return Array.from({ length: points }, (_, i) => {
    const ts = now - (points - i) * stepMs;
    const seed = Math.floor(ts / stepMs);
    const jitter = (seededRandom(seed) - 0.5) * 2 * variance * 0.3;
    const wave = Math.sin(i / waveFreq) * variance * 0.5;
    const drift = Math.sin(i / (waveFreq * 3)) * variance * 0.2;
    return {
      time: new Date(ts).toLocaleTimeString(),
      value: Math.max(0, baseValue + jitter + wave + drift),
    };
  });
}

export function getDemoKafkaMetrics() {
  const msgBase = 4800 + timeWave(5, 400, 0) + timeWave(13, 200, 1.2);
  const bytesBase = msgBase * 502;
  const p99 = 3.0 + timeWave(7, 2.5, 0.8) + timeWave(3, 1.5, 2.1);

  return {
    current: {
      messagesIn: Math.round(msgBase * 10) / 10,
      bytesIn: Math.round(bytesBase),
      bytesOut: Math.round(bytesBase * 0.76),
      p99Produce: Math.round(Math.max(0.5, p99) * 10) / 10,
      p99Fetch: Math.round(Math.max(0.8, p99 * 1.6) * 10) / 10,
      underReplicated: 0,
      partitionCount: 36,
      activeController: 1,
      offlinePartitions: 0,
    },
    series: {
      messagesIn: generateTimeSeries(60, 4800, 600),
      bytesIn: generateTimeSeries(60, 2_400_000, 300_000),
      bytesOut: generateTimeSeries(60, 1_800_000, 200_000),
      p99Produce: generateTimeSeries(60, 3.5, 2.5, 15000, 6),
    },
    brokers: [
      { instance: "kafka-1:9404", messagesIn: Math.round((msgBase / 3) * 1.02 * 10) / 10 },
      { instance: "kafka-2:9404", messagesIn: Math.round((msgBase / 3) * 0.97 * 10) / 10 },
      { instance: "kafka-3:9404", messagesIn: Math.round((msgBase / 3) * 1.01 * 10) / 10 },
    ],
  };
}

export function getDemoFlinkMetrics() {
  const cpDur = 1200 + timeWave(4, 300, 0.5);
  const cpCompleted = 4312 + Math.floor((Date.now() - 1712700000000) / 30000);

  return {
    overview: {
      taskmanagers: 1,
      "slots-total": 4,
      "slots-available": 0,
      "jobs-running": 1,
      "jobs-finished": 0,
      "jobs-cancelled": 0,
      "jobs-failed": 0,
      "flink-version": "1.18.0",
    },
    jobs: [
      {
        id: "a1b2c3d4e5f6",
        name: "Order Event Processing Pipeline",
        state: "RUNNING",
        startTime: Date.now() - 86_400_000 * 3,
        duration: 86_400_000 * 3,
      },
    ],
    metrics: {
      checkpointDuration: Math.round(Math.max(200, cpDur)),
      checkpointsFailed: 0,
      checkpointsCompleted: cpCompleted,
    },
    checkpoints: null,
    series: {
      checkpointDuration: generateTimeSeries(60, 1200, 400, 15000, 10),
    },
  };
}

export function getDemoDlqMetrics() {
  const rate = 0.02 + timeWave(8, 0.015, 1.5);
  const clampedRate = Math.round(Math.max(0, rate) * 1000) / 1000;

  return {
    current: {
      eventRate: clampedRate,
      messagesTotal: 23,
    },
    series: {
      eventRate: generateTimeSeries(120, 0.02, 0.015, 15000, 12),
    },
    alerts: [],
  };
}

export function getDemoAlerts() {
  return {
    firing: [],
    pending: [
      {
        name: "P99LatencyElevated",
        state: "pending",
        activeAt: new Date(Date.now() - 600_000).toISOString(),
        severity: "info",
        component: "Kafka Produce",
        summary: "P99 produce latency approaching 10ms threshold",
      },
    ],
    total: 6,
  };
}

export function getDemoHealth() {
  return {
    prometheus: true,
    postgres: true,
    flink: true,
    kafka: true,
  };
}

export function getDemoAnalytics() {
  const users = [
    { userId: "user-0042", orderCount: 347, totalAmount: 28_419.5 },
    { userId: "user-0117", orderCount: 289, totalAmount: 24_831.2 },
    { userId: "user-0203", orderCount: 265, totalAmount: 21_740.8 },
    { userId: "user-0089", orderCount: 241, totalAmount: 19_632.4 },
    { userId: "user-0156", orderCount: 218, totalAmount: 17_544.6 },
    { userId: "user-0301", orderCount: 195, totalAmount: 15_890.3 },
    { userId: "user-0078", orderCount: 183, totalAmount: 14_216.7 },
    { userId: "user-0245", orderCount: 167, totalAmount: 12_983.1 },
    { userId: "user-0412", orderCount: 152, totalAmount: 11_647.9 },
    { userId: "user-0099", orderCount: 138, totalAmount: 10_324.5 },
    { userId: "user-0187", orderCount: 124, totalAmount: 9_870.2 },
    { userId: "user-0334", orderCount: 112, totalAmount: 8_541.8 },
  ];

  const now = Date.now();
  const revenueOverTime = Array.from({ length: 60 }, (_, i) => {
    const seed = Math.floor((now - (60 - i) * 60000) / 60000);
    return {
      time: new Date(now - (60 - i) * 60000).toLocaleTimeString(),
      value: 2800 + seededRandom(seed) * 1200 + Math.sin(i / 6) * 500,
    };
  });

  const volumeOverTime = Array.from({ length: 60 }, (_, i) => {
    const seed = Math.floor((now - (60 - i) * 60000) / 60000) + 9999;
    return {
      time: new Date(now - (60 - i) * 60000).toLocaleTimeString(),
      value: Math.floor(35 + seededRandom(seed) * 20 + Math.cos(i / 4) * 8),
    };
  });

  return { topUsers: users, revenueOverTime, volumeOverTime };
}
