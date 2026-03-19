package main

import (
	"encoding/json"
	"fmt"
	"math/rand"
	"time"
)

type OrderEvent struct {
	OrderID   string  `json:"order_id"`
	UserID    string  `json:"user_id"`
	Amount    float64 `json:"amount"`
	Status    string  `json:"status"`
	Timestamp int64   `json:"timestamp"`
}

var statuses = []string{"PLACED", "SHIPPED", "CANCELLED"}

const poisonPillRate = 0.02 // ~2% of events are malformed for DLQ testing

func GenerateOrderEvent() OrderEvent {
	if rand.Float64() < poisonPillRate {
		return generatePoisonPill()
	}
	return OrderEvent{
		OrderID:   fmt.Sprintf("ord-%d-%d", time.Now().UnixNano(), rand.Intn(100000)),
		UserID:    fmt.Sprintf("user-%d", rand.Intn(10000)),
		Amount:    float64(rand.Intn(50000)) / 100.0,
		Status:    statuses[rand.Intn(len(statuses))],
		Timestamp: time.Now().UnixMilli(),
	}
}

func generatePoisonPill() OrderEvent {
	switch rand.Intn(3) {
	case 0:
		return OrderEvent{
			OrderID: fmt.Sprintf("ord-bad-%d", time.Now().UnixNano()),
			UserID:  fmt.Sprintf("user-%d", rand.Intn(10000)),
			Amount:  -1 * float64(rand.Intn(500)),
			Status:  "PLACED",
			Timestamp: time.Now().UnixMilli(),
		}
	case 1:
		return OrderEvent{
			OrderID:   fmt.Sprintf("ord-bad-%d", time.Now().UnixNano()),
			UserID:    "",
			Amount:    float64(rand.Intn(50000)) / 100.0,
			Status:    "PLACED",
			Timestamp: time.Now().UnixMilli(),
		}
	default:
		return OrderEvent{
			OrderID:   "",
			UserID:    fmt.Sprintf("user-%d", rand.Intn(10000)),
			Amount:    float64(rand.Intn(50000)) / 100.0,
			Status:    "PLACED",
			Timestamp: time.Now().UnixMilli(),
		}
	}
}

func (e OrderEvent) ToJSON() ([]byte, error) {
	return json.Marshal(e)
}
