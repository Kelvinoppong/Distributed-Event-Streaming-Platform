export const REFRESH_INTERVAL = 5000;

export const PROM_QUERIES = {
  kafkaMessagesIn:
    "sum(kafka_server_broker_topic_metrics_messages_in_per_sec)",
  kafkaBytesIn:
    "sum(kafka_server_broker_topic_metrics_bytes_in_per_sec)",
  kafkaBytesOut:
    "sum(kafka_server_broker_topic_metrics_bytes_out_per_sec)",
  kafkaP99Produce:
    "kafka_network_request_metrics_produce_total_time_ms_p99",
  kafkaP99Fetch:
    "kafka_network_request_metrics_fetch_total_time_ms_p99",
  kafkaUnderReplicated:
    "sum(kafka_server_replica_manager_under_replicated_partitions)",
  kafkaPartitionCount:
    "sum(kafka_server_replica_manager_partition_count)",
  kafkaActiveController:
    "sum(kafka_controller_active_controller_count)",
  kafkaOfflinePartitions:
    "sum(kafka_controller_offline_partitions_count)",
  kafkaMessagesInPerBroker:
    "kafka_server_broker_topic_metrics_messages_in_per_sec",
  dlqEventRate:
    'sum(rate(kafka_server_broker_topic_metrics_messages_in_per_sec{topic="order-events-dlq"}[5m]))',
  dlqMessagesTotal:
    'sum(kafka_server_broker_topic_metrics_messages_in_per_sec{topic="order-events-dlq"})',
  flinkCheckpointDuration:
    "flink_jobmanager_job_lastCheckpointDuration",
  flinkCheckpointsFailed:
    "increase(flink_jobmanager_job_numberOfFailedCheckpoints[5m])",
  flinkCheckpointsCompleted:
    "flink_jobmanager_job_numberOfCompletedCheckpoints",
} as const;

export type PromQueryKey = keyof typeof PROM_QUERIES;
