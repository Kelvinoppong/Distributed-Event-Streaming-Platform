package main

import (
	"context"
	"log"
	"os"
	"os/signal"
	"syscall"
)

func main() {
	cfg := LoadConfig()

	consumer, err := NewDLQConsumer(cfg)
	if err != nil {
		log.Fatalf("failed to create DLQ consumer: %v", err)
	}

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	sigCh := make(chan os.Signal, 1)
	signal.Notify(sigCh, syscall.SIGINT, syscall.SIGTERM)

	go func() {
		<-sigCh
		log.Println("shutting down...")
		cancel()
	}()

	log.Printf("dlq-retry-consumer started: group=%s  dlq=%s  retry-to=%s  max-retries=%d",
		cfg.GroupID, cfg.DLQTopic, cfg.RetryTopic, cfg.MaxRetries)

	if err := consumer.Run(ctx); err != nil {
		log.Fatalf("consumer error: %v", err)
	}

	log.Println("dlq-retry-consumer stopped")
}
