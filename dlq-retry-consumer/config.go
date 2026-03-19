package main

import (
	"os"
	"strconv"
	"strings"
	"time"
)

type Config struct {
	Brokers      []string
	DLQTopic     string
	RetryTopic   string
	GroupID      string
	MaxRetries   int
	BaseBackoff  time.Duration
	SlackWebhook string
}

func LoadConfig() *Config {
	return &Config{
		Brokers:      strings.Split(getEnv("KAFKA_BROKERS", "localhost:29092,localhost:29093,localhost:29094"), ","),
		DLQTopic:     getEnv("DLQ_TOPIC", "order-events-dlq"),
		RetryTopic:   getEnv("RETRY_TOPIC", "order-events"),
		GroupID:      getEnv("GROUP_ID", "dlq-retry-consumer"),
		MaxRetries:   getEnvInt("MAX_RETRIES", 5),
		BaseBackoff:  time.Duration(getEnvInt("BASE_BACKOFF_SECONDS", 1)) * time.Second,
		SlackWebhook: getEnv("SLACK_WEBHOOK_URL", ""),
	}
}

func getEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

func getEnvInt(key string, fallback int) int {
	if v := os.Getenv(key); v != "" {
		if i, err := strconv.Atoi(v); err == nil {
			return i
		}
	}
	return fallback
}
