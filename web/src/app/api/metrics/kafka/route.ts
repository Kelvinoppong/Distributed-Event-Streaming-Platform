import { NextResponse } from "next/server";
import { queryInstant, queryRange } from "@/lib/prometheus";
import { PROM_QUERIES } from "@/lib/constants";

export const dynamic = "force-dynamic";

export async function GET() {
  const now = Math.floor(Date.now() / 1000);
  const fifteenMinAgo = now - 900;
  const step = 15;

  const [
    messagesIn,
    bytesIn,
    bytesOut,
    p99Produce,
    p99Fetch,
    underReplicated,
    partitionCount,
    activeController,
    offlinePartitions,
    messagesInRange,
    bytesInRange,
    bytesOutRange,
    perBroker,
  ] = await Promise.all([
    queryInstant(PROM_QUERIES.kafkaMessagesIn),
    queryInstant(PROM_QUERIES.kafkaBytesIn),
    queryInstant(PROM_QUERIES.kafkaBytesOut),
    queryInstant(PROM_QUERIES.kafkaP99Produce),
    queryInstant(PROM_QUERIES.kafkaP99Fetch),
    queryInstant(PROM_QUERIES.kafkaUnderReplicated),
    queryInstant(PROM_QUERIES.kafkaPartitionCount),
    queryInstant(PROM_QUERIES.kafkaActiveController),
    queryInstant(PROM_QUERIES.kafkaOfflinePartitions),
    queryRange(PROM_QUERIES.kafkaMessagesIn, fifteenMinAgo, now, step),
    queryRange(PROM_QUERIES.kafkaBytesIn, fifteenMinAgo, now, step),
    queryRange(PROM_QUERIES.kafkaBytesOut, fifteenMinAgo, now, step),
    queryInstant(PROM_QUERIES.kafkaMessagesInPerBroker),
  ]);

  const val = (r: typeof messagesIn) =>
    r.length > 0 ? parseFloat(r[0].value[1]) : 0;

  const toTimeSeries = (r: typeof messagesInRange) =>
    r.length > 0
      ? r[0].values.map(([ts, v]) => ({
          time: new Date(ts * 1000).toLocaleTimeString(),
          value: parseFloat(v),
        }))
      : [];

  return NextResponse.json({
    current: {
      messagesIn: val(messagesIn),
      bytesIn: val(bytesIn),
      bytesOut: val(bytesOut),
      p99Produce: val(p99Produce),
      p99Fetch: val(p99Fetch),
      underReplicated: val(underReplicated),
      partitionCount: val(partitionCount),
      activeController: val(activeController),
      offlinePartitions: val(offlinePartitions),
    },
    series: {
      messagesIn: toTimeSeries(messagesInRange),
      bytesIn: toTimeSeries(bytesInRange),
      bytesOut: toTimeSeries(bytesOutRange),
    },
    brokers: perBroker.map((b) => ({
      instance: b.metric.instance || "unknown",
      messagesIn: parseFloat(b.value[1]),
    })),
  });
}
