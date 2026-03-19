package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"log"
	"math"
	"net/http"
	"strconv"
	"time"

	"github.com/IBM/sarama"
)

type Retrier struct {
	cfg *Config
}

func NewRetrier(cfg *Config) *Retrier {
	return &Retrier{cfg: cfg}
}

func (r *Retrier) Handle(event OrderEvent, retryCount int, producer sarama.SyncProducer, topic string) {
	if retryCount >= r.cfg.MaxRetries {
		log.Printf("PERMANENT FAILURE: order=%s user=%s amount=%.2f after %d retries",
			event.OrderID, event.UserID, event.Amount, retryCount)
		r.sendSlackAlert(event, retryCount)
		return
	}

	backoff := r.cfg.BaseBackoff * time.Duration(math.Pow(2, float64(retryCount)))
	log.Printf("retrying order=%s attempt=%d/%d backoff=%v",
		event.OrderID, retryCount+1, r.cfg.MaxRetries, backoff)

	time.Sleep(backoff)

	data, err := json.Marshal(event)
	if err != nil {
		log.Printf("failed to marshal event for retry: %v", err)
		return
	}

	msg := &sarama.ProducerMessage{
		Topic: topic,
		Key:   sarama.StringEncoder(event.UserID),
		Value: sarama.ByteEncoder(data),
		Headers: []sarama.RecordHeader{
			{
				Key:   []byte("retry-count"),
				Value: []byte(strconv.Itoa(retryCount + 1)),
			},
		},
	}

	if _, _, err := producer.SendMessage(msg); err != nil {
		log.Printf("failed to produce retry for order=%s: %v", event.OrderID, err)
	}
}

func (r *Retrier) sendSlackAlert(event OrderEvent, retryCount int) {
	if r.cfg.SlackWebhook == "" {
		return
	}

	payload := map[string]string{
		"text": fmt.Sprintf(
			":red_circle: *DLQ Permanent Failure*\nOrder `%s` by user `%s` failed after %d retries\nAmount: $%.2f | Status: %s",
			event.OrderID, event.UserID, retryCount, event.Amount, event.Status),
	}

	body, err := json.Marshal(payload)
	if err != nil {
		log.Printf("failed to marshal Slack payload: %v", err)
		return
	}

	resp, err := http.Post(r.cfg.SlackWebhook, "application/json", bytes.NewReader(body))
	if err != nil {
		log.Printf("failed to send Slack alert: %v", err)
		return
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		log.Printf("Slack webhook returned %d", resp.StatusCode)
	}
}
