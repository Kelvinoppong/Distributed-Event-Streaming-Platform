package com.streaming.model;

import java.io.Serializable;

public class OrderAccumulator implements Serializable {

    private static final long serialVersionUID = 1L;

    public String userId;
    public long count;
    public double totalAmount;
}
