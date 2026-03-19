package com.streaming.model;

import java.io.Serializable;

public class OrderEvent implements Serializable {

    private static final long serialVersionUID = 1L;

    private String orderId;
    private String userId;
    private double amount;
    private String status;
    private long timestamp;

    public OrderEvent() {}

    public OrderEvent(String orderId, String userId, double amount, String status, long timestamp) {
        this.orderId = orderId;
        this.userId = userId;
        this.amount = amount;
        this.status = status;
        this.timestamp = timestamp;
    }

    public String getOrderId()  { return orderId; }
    public String getUserId()   { return userId; }
    public double getAmount()   { return amount; }
    public String getStatus()   { return status; }
    public long   getTimestamp() { return timestamp; }

    public void setOrderId(String orderId)   { this.orderId = orderId; }
    public void setUserId(String userId)     { this.userId = userId; }
    public void setAmount(double amount)     { this.amount = amount; }
    public void setStatus(String status)     { this.status = status; }
    public void setTimestamp(long timestamp)  { this.timestamp = timestamp; }

    @Override
    public String toString() {
        return String.format("OrderEvent{orderId='%s', userId='%s', amount=%.2f, status='%s', ts=%d}",
                orderId, userId, amount, status, timestamp);
    }
}
