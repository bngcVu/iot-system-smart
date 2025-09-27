package com.iot_system.util;

import com.iot_system.domain.enums.SensorMetric;

public class ValueFilterParser {

    public static ValueRange toRange(String valueOp, Double value, Double valueTo, Double tolerance, SensorMetric metric) {
        if (valueOp == null || valueOp.isBlank()) return null;
        String op = valueOp.trim().toLowerCase();

        if (metric == null || metric == SensorMetric.ALL) {
            throw new IllegalArgumentException("metric is required when filtering by value");
        }

        if ("between".equals(op)) {
            if (value == null || valueTo == null) {
                throw new IllegalArgumentException("between requires value and valueTo");
            }
            if (value > valueTo) {
                throw new IllegalArgumentException("value must be <= valueTo");
            }
            return new ValueRange(value, valueTo, true, true);
        }

        if ("eq".equals(op)) {
            if (value == null) throw new IllegalArgumentException("eq requires value");
            double tol = resolveDefaultTolerance(metric, tolerance);
            return new ValueRange(value - tol, value + tol, true, true);
        }

        if ("gt".equals(op)) {
            if (value == null) throw new IllegalArgumentException("gt requires value");
            return new ValueRange(value, Double.POSITIVE_INFINITY, false, false);
        }
        if ("gte".equals(op)) {
            if (value == null) throw new IllegalArgumentException("gte requires value");
            return new ValueRange(value, Double.POSITIVE_INFINITY, true, false);
        }
        if ("lt".equals(op)) {
            if (value == null) throw new IllegalArgumentException("lt requires value");
            return new ValueRange(Double.NEGATIVE_INFINITY, value, false, false);
        }
        if ("lte".equals(op)) {
            if (value == null) throw new IllegalArgumentException("lte requires value");
            return new ValueRange(Double.NEGATIVE_INFINITY, value, false, true);
        }

        throw new IllegalArgumentException("Unsupported valueOp: " + valueOp);
    }

    private static double resolveDefaultTolerance(SensorMetric metric, Double tolerance) {
        if (tolerance != null && tolerance >= 0) return tolerance;
        switch (metric) {
            case TEMP: return 0.3d;
            case HUMIDITY: return 0.3d;
            case LIGHT: return 3.0d;
            default: return 0.0d;
        }
    }
}


