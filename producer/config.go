package main

import (
	"os"
	"strconv"
	"strings"
	"time"
)

type Config struct {
	Brokers         []string
	Topic           string
	NumWorkers      int
	EventsPerSecond int
	MaxRetries      int
	RetryBackoff    time.Duration
}

func LoadConfig() *Config {
	return &Config{
		Brokers:         strings.Split(getEnv("KAFKA_BROKERS", "localhost:29092,localhost:29093,localhost:29094"), ","),
		Topic:           getEnv("KAFKA_TOPIC", "order-events"),
		NumWorkers:      getEnvInt("NUM_WORKERS", 4),
		EventsPerSecond: getEnvInt("EVENTS_PER_SECOND", 100),
		MaxRetries:      10,
		RetryBackoff:    100 * time.Millisecond,
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
