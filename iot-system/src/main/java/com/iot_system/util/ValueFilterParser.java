package com.iot_system.util;

import com.iot_system.domain.enums.SensorMetric;

public class ValueFilterParser {

    public static ValueRange toRange(String valueOp, Double value, Double valueTo, Double tolerance, SensorMetric metric) {
        if (valueOp == null || valueOp.isBlank()) return null;
        String op = valueOp.trim().toLowerCase();

        if (metric == null || metric == SensorMetric.ALL) {
            throw new IllegalArgumentException("Cần chỉ định loại cảm biến khi tìm kiếm theo giá trị");
        }

        if ("between".equals(op)) {
            if (value == null || valueTo == null) {
                throw new IllegalArgumentException("Toán tử 'between' cần cả giá trị bắt đầu và giá trị kết thúc");
            }
            if (value > valueTo) {
                throw new IllegalArgumentException("Giá trị bắt đầu phải nhỏ hơn hoặc bằng giá trị kết thúc");
            }
            return new ValueRange(value, valueTo, true, true);
        }

        if ("eq".equals(op)) {
            if (value == null) throw new IllegalArgumentException("Toán tử 'eq' cần có giá trị để so sánh");
            double tol = resolveDefaultTolerance(metric, tolerance);
            return new ValueRange(value - tol, value + tol, true, true);
        }

        if ("gt".equals(op)) {
            if (value == null) throw new IllegalArgumentException("Toán tử 'gt' cần có giá trị để so sánh");
            return new ValueRange(value, Double.POSITIVE_INFINITY, false, false);
        }
        if ("gte".equals(op)) {
            if (value == null) throw new IllegalArgumentException("Toán tử 'gte' cần có giá trị để so sánh");
            return new ValueRange(value, Double.POSITIVE_INFINITY, true, false);
        }
        if ("lt".equals(op)) {
            if (value == null) throw new IllegalArgumentException("Toán tử 'lt' cần có giá trị để so sánh");
            return new ValueRange(Double.NEGATIVE_INFINITY, value, false, false);
        }
        if ("lte".equals(op)) {
            if (value == null) throw new IllegalArgumentException("Toán tử 'lte' cần có giá trị để so sánh");
            return new ValueRange(Double.NEGATIVE_INFINITY, value, false, true);
        }

        throw new IllegalArgumentException("Không hỗ trợ toán tử: " + valueOp + ". Các toán tử được hỗ trợ: eq, gt, gte, lt, lte, between");
    }

    private static double resolveDefaultTolerance(SensorMetric metric, Double tolerance) {
        if (tolerance != null && tolerance >= 0) return tolerance;
        switch (metric) {
            case TEMP: return 0.1d;
            case HUMIDITY: return 0.1d;
            case LIGHT: return 1.0d;
            default: return 0.0d;
        }
    }
}


