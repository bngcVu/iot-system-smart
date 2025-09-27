package com.iot_system.util;

public class ValueRange {
    private final Double from;
    private final Double to;
    private final boolean includeFrom;
    private final boolean includeTo;

    public ValueRange(Double from, Double to, boolean includeFrom, boolean includeTo) {
        this.from = from;
        this.to = to;
        this.includeFrom = includeFrom;
        this.includeTo = includeTo;
    }

    public Double getFrom() {
        return from;
    }

    public Double getTo() {
        return to;
    }

    public boolean isIncludeFrom() {
        return includeFrom;
    }

    public boolean isIncludeTo() {
        return includeTo;
    }
}


