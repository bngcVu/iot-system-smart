package com.iot_system.util;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;

/**
 * Utility class for date/time parsing operations
 */
public class DateTimeUtils {
    
    private static final Logger log = LoggerFactory.getLogger(DateTimeUtils.class);
    
    /**
     * Parse string date/time thành LocalDateTime với các định dạng được hỗ trợ
     * Hỗ trợ: dd-MM-yyyy HH:mm:ss, dd-MM-yyyy HH:mm, dd-MM-yyyy, ddMMyyyy, dd/MM/yyyy, ddMMyy
     */
    public static DateTimeParseResult parseDateTime(String input) {
        try {
            // 1. dd-MM-yyyy HH:mm:ss (format chính từ application.properties - tìm kiếm chính xác theo giây)
            if (input.matches("\\d{2}-\\d{2}-\\d{4} \\d{2}:\\d{2}:\\d{2}")) {
                LocalDateTime exactTime = LocalDateTime.parse(input, DateTimeFormatter.ofPattern("dd-MM-yyyy HH:mm:ss"));
                return new DateTimeParseResult(exactTime, exactTime.plusSeconds(1), true);
            }
            
            // 2. dd-MM-yyyy HH:mm (tìm kiếm trong phút)
            if (input.matches("\\d{2}-\\d{2}-\\d{4} \\d{2}:\\d{2}")) {
                LocalDateTime minuteTime = LocalDateTime.parse(input, DateTimeFormatter.ofPattern("dd-MM-yyyy HH:mm"));
                return new DateTimeParseResult(minuteTime, minuteTime.plusMinutes(1), false);
            }
            
            // 3. dd-MM-yyyy (tìm kiếm theo ngày)
            if (input.matches("\\d{2}-\\d{2}-\\d{4}")) {
                LocalDate date = LocalDate.parse(input, DateTimeFormatter.ofPattern("dd-MM-yyyy"));
                return new DateTimeParseResult(date.atStartOfDay(), date.plusDays(1).atStartOfDay(), false);
            }
            
            // 4. ddMMyyyy 
            if (input.matches("\\d{8}")) {
                LocalDate date = LocalDate.parse(input, DateTimeFormatter.ofPattern("ddMMyyyy"));
                return new DateTimeParseResult(date.atStartOfDay(), date.plusDays(1).atStartOfDay(), false);
            }

            // 5. dd/MM/yyyy
            if (input.matches("\\d{2}/\\d{2}/\\d{4}")) {
                LocalDate date = LocalDate.parse(input, DateTimeFormatter.ofPattern("dd/MM/yyyy"));
                return new DateTimeParseResult(date.atStartOfDay(), date.plusDays(1).atStartOfDay(), false);
            }

            // 6. ddMMyy
            if (input.matches("\\d{6}")) {
                LocalDate date = LocalDate.parse(input, DateTimeFormatter.ofPattern("ddMMyy"));
                return new DateTimeParseResult(date.atStartOfDay(), date.plusDays(1).atStartOfDay(), false);
            }
            
        } catch (Exception e) {
            log.warn("Lỗi phân tích ngày/giờ: {} - {}", input, e.getMessage());
        }
        return null;
    }
    
    /**
     * Inner class để lưu kết quả parse datetime
     */
    public static class DateTimeParseResult {
        private final LocalDateTime start;
        private final LocalDateTime end;
        private final boolean exactMatch;

        public DateTimeParseResult(LocalDateTime start, LocalDateTime end, boolean exactMatch) {
            this.start = start;
            this.end = end;
            this.exactMatch = exactMatch;
        }

        public LocalDateTime getStart() { return start; }
        public LocalDateTime getEnd() { return end; }
        public boolean isExactMatch() { return exactMatch; }
    }
}
