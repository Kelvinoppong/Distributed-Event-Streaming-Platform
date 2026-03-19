package com.streaming.model;

import java.io.Serializable;

public class UserOrderStats implements Serializable {

    private static final long serialVersionUID = 1L;

    private String userId;
    private long orderCount;
    private double totalAmount;
    private long windowStart;
    private long windowEnd;

    public UserOrderStats() {}

    public UserOrderStats(String userId, long orderCount, double totalAmount,
                          long windowStart, long windowEnd) {
        this.userId = userId;
        this.orderCount = orderCount;
        this.totalAmount = totalAmount;
        this.windowStart = windowStart;
        this.windowEnd = windowEnd;
    }

    public String getUserId()      { return userId; }
    public long   getOrderCount()  { return orderCount; }
    public double getTotalAmount() { return totalAmount; }
    public long   getWindowStart() { return windowStart; }
    public long   getWindowEnd()   { return windowEnd; }

    public void setUserId(String userId)         { this.userId = userId; }
    public void setOrderCount(long orderCount)   { this.orderCount = orderCount; }
    public void setTotalAmount(double totalAmount) { this.totalAmount = totalAmount; }
    public void setWindowStart(long windowStart) { this.windowStart = windowStart; }
    public void setWindowEnd(long windowEnd)     { this.windowEnd = windowEnd; }

    @Override
    public String toString() {
        return String.format("UserOrderStats{userId='%s', count=%d, total=%.2f, window=[%d..%d]}",
                userId, orderCount, totalAmount, windowStart, windowEnd);
    }
}
