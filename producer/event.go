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

func GenerateOrderEvent() OrderEvent {
	return OrderEvent{
		OrderID:   fmt.Sprintf("ord-%d-%d", time.Now().UnixNano(), rand.Intn(100000)),
		UserID:    fmt.Sprintf("user-%d", rand.Intn(10000)),
		Amount:    float64(rand.Intn(50000)) / 100.0,
		Status:    statuses[rand.Intn(len(statuses))],
		Timestamp: time.Now().UnixMilli(),
	}
}

func (e OrderEvent) ToJSON() ([]byte, error) {
	return json.Marshal(e)
}
