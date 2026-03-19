package main

import (
	"context"
	"log"
	"os"
	"os/signal"
	"sync"
	"syscall"
)

func main() {
	cfg := LoadConfig()

	producer, err := NewEventProducer(cfg)
	if err != nil {
		log.Fatalf("failed to create producer: %v", err)
	}
	defer producer.Close()

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	sigCh := make(chan os.Signal, 1)
	signal.Notify(sigCh, syscall.SIGINT, syscall.SIGTERM)

	var wg sync.WaitGroup
	for i := 0; i < cfg.NumWorkers; i++ {
		wg.Add(1)
		go func(workerID int) {
			defer wg.Done()
			producer.Run(ctx, workerID)
		}(i)
	}

	log.Printf("producer started: workers=%d  rate=%d evt/s/worker  topic=%s  brokers=%v",
		cfg.NumWorkers, cfg.EventsPerSecond, cfg.Topic, cfg.Brokers)

	<-sigCh
	log.Println("shutting down...")
	cancel()
	wg.Wait()
	log.Println("producer stopped")
}
