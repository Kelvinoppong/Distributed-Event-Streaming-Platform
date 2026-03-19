package main

import (
	"context"
	"encoding/json"
	"log"
	"strconv"

	"github.com/IBM/sarama"
)

type OrderEvent struct {
	OrderID   string  `json:"order_id"`
	UserID    string  `json:"user_id"`
	Amount    float64 `json:"amount"`
	Status    string  `json:"status"`
	Timestamp int64   `json:"timestamp"`
}

type DLQConsumer struct {
	cfg      *Config
	client   sarama.ConsumerGroup
	producer sarama.SyncProducer
	retrier  *Retrier
}

func NewDLQConsumer(cfg *Config) (*DLQConsumer, error) {
	sc := sarama.NewConfig()
	sc.Version = sarama.V3_6_0_0
	sc.Consumer.Group.Rebalance.GroupStrategies = []sarama.BalanceStrategy{
		sarama.NewBalanceStrategySticky(),
	}
	sc.Consumer.Offsets.Initial = sarama.OffsetOldest

	client, err := sarama.NewConsumerGroup(cfg.Brokers, cfg.GroupID, sc)
	if err != nil {
		return nil, err
	}

	prodCfg := sarama.NewConfig()
	prodCfg.Version = sarama.V3_6_0_0
	prodCfg.Producer.RequiredAcks = sarama.WaitForAll
	prodCfg.Producer.Idempotent = true
	prodCfg.Net.MaxOpenRequests = 1
	prodCfg.Producer.Return.Successes = true

	producer, err := sarama.NewSyncProducer(cfg.Brokers, prodCfg)
	if err != nil {
		client.Close()
		return nil, err
	}

	return &DLQConsumer{
		cfg:      cfg,
		client:   client,
		producer: producer,
		retrier:  NewRetrier(cfg),
	}, nil
}

func (c *DLQConsumer) Run(ctx context.Context) error {
	handler := &dlqHandler{consumer: c}
	for {
		if err := c.client.Consume(ctx, []string{c.cfg.DLQTopic}, handler); err != nil {
			return err
		}
		if ctx.Err() != nil {
			return nil
		}
	}
}

func (c *DLQConsumer) Close() {
	c.producer.Close()
	c.client.Close()
}

type dlqHandler struct {
	consumer *DLQConsumer
}

func (h *dlqHandler) Setup(sarama.ConsumerGroupSession) error   { return nil }
func (h *dlqHandler) Cleanup(sarama.ConsumerGroupSession) error { return nil }

func (h *dlqHandler) ConsumeClaim(session sarama.ConsumerGroupSession,
	claim sarama.ConsumerGroupClaim) error {

	for msg := range claim.Messages() {
		var event OrderEvent
		if err := json.Unmarshal(msg.Value, &event); err != nil {
			log.Printf("failed to unmarshal DLQ message at offset %d: %v", msg.Offset, err)
			session.MarkMessage(msg, "")
			continue
		}

		retryCount := extractRetryCount(msg.Headers)
		h.consumer.retrier.Handle(event, retryCount, h.consumer.producer, h.consumer.cfg.RetryTopic)
		session.MarkMessage(msg, "")
	}
	return nil
}

func extractRetryCount(headers []*sarama.RecordHeader) int {
	for _, h := range headers {
		if string(h.Key) == "retry-count" {
			if count, err := strconv.Atoi(string(h.Value)); err == nil {
				return count
			}
		}
	}
	return 0
}
