package main

import (
	"context"
	"log"
	"time"

	"github.com/IBM/sarama"
)

type EventProducer struct {
	producer sarama.SyncProducer
	cfg      *Config
}

func NewEventProducer(cfg *Config) (*EventProducer, error) {
	sc := sarama.NewConfig()
	sc.Version = sarama.V3_6_0_0
	sc.Producer.Idempotent = true
	sc.Producer.RequiredAcks = sarama.WaitForAll
	sc.Net.MaxOpenRequests = 1
	sc.Producer.Return.Successes = true
	sc.Producer.Retry.Max = cfg.MaxRetries
	sc.Producer.Retry.Backoff = cfg.RetryBackoff

	producer, err := sarama.NewSyncProducer(cfg.Brokers, sc)
	if err != nil {
		return nil, err
	}

	return &EventProducer{producer: producer, cfg: cfg}, nil
}

func (p *EventProducer) Run(ctx context.Context, workerID int) {
	interval := time.Second / time.Duration(p.cfg.EventsPerSecond)
	ticker := time.NewTicker(interval)
	defer ticker.Stop()

	var sent, errors int64
	for {
		select {
		case <-ctx.Done():
			log.Printf("worker %d stopping: sent=%d errors=%d", workerID, sent, errors)
			return
		case <-ticker.C:
			event := GenerateOrderEvent()
			data, err := event.ToJSON()
			if err != nil {
				errors++
				continue
			}

			msg := &sarama.ProducerMessage{
				Topic: p.cfg.Topic,
				Key:   sarama.StringEncoder(event.UserID),
				Value: sarama.ByteEncoder(data),
			}

			if _, _, err := p.producer.SendMessage(msg); err != nil {
				errors++
				if errors%100 == 0 {
					log.Printf("worker %d send error (%d total): %v", workerID, errors, err)
				}
			} else {
				sent++
				if sent%1000 == 0 {
					log.Printf("worker %d: %d events sent", workerID, sent)
				}
			}
		}
	}
}

func (p *EventProducer) Close() error {
	return p.producer.Close()
}
