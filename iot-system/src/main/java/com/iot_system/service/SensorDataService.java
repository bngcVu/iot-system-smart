package com.iot_system.service;

import com.iot_system.domain.dto.PagedResponse;
import com.iot_system.domain.dto.SensorReadingDTO;
import com.iot_system.domain.entity.Device;
import com.iot_system.domain.entity.SensorData;
import com.iot_system.domain.enums.SensorMetric;
import com.iot_system.repository.SensorDataRepository;
import com.iot_system.util.DateTimeUtils;
import com.iot_system.exception.InvalidDateFormatException;
import com.iot_system.util.ResponseUtils;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.data.jpa.domain.Specification;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.time.LocalDateTime;
import com.iot_system.util.ValueRange;
import com.iot_system.util.ValueFilterParser;
import jakarta.persistence.criteria.Predicate;

@Service
public class SensorDataService {

    private static final Logger log = LoggerFactory.getLogger(SensorDataService.class);

    private final SensorDataRepository sensorRepo;

    public SensorDataService(SensorDataRepository sensorRepo) {
        this.sensorRepo = sensorRepo;
    }

    /**
     * Lưu dữ liệu cảm biến vào DB
     */
    public SensorData saveSensorData(Device device, Double temperature, Double humidity, Double light) {
        SensorData data = new SensorData();
        data.setDevice(device);
        data.setTemperature(temperature);
        data.setHumidity(humidity);
        data.setLight(light);
        data.setRecordedAt(LocalDateTime.now());
        return sensorRepo.save(data);
    }

    /**
     * Tìm kiếm dữ liệu cảm biến theo ngày/giờ với nhiều định dạng, có phân trang
     * Hỗ trợ: HH:mm:ss dd/MM/yyyy, dd-MM-yyyy HH:mm:ss, dd-MM-yyyy HH:mm, ddMMyyyy, dd/MM/yyyy, ddMMyy
     */
    public PagedResponse<SensorReadingDTO> search(String dateStr, SensorMetric metric, int page, int size, String sort) {
        LocalDateTime start = null;
        LocalDateTime end = null;
        String searchMessage = "";

        if (dateStr != null && !dateStr.isBlank()) {
            // Thử parse theo các định dạng khác nhau
            DateTimeUtils.DateTimeParseResult parseResult = DateTimeUtils.parseDateTime(dateStr);
            
            if (parseResult != null) {
                if (parseResult.isExactMatch()) {
                    // Tìm kiếm chính xác theo giây
                    start = parseResult.getStart();
                    end = parseResult.getEnd();
                    searchMessage = "Tìm thấy kết quả chính xác cho " + dateStr;
                } else {
                    // Tìm kiếm theo phút (trong khoảng 1 phút)
                    start = parseResult.getStart();
                    end = parseResult.getEnd();
                    searchMessage = "Tìm thấy kết quả trong phút " + dateStr;
                }
            } else {
                throw new InvalidDateFormatException("Hỗ trợ: dd-MM-yyyy HH:mm:ss, dd-MM-yyyy HH:mm, dd-MM-yyyy, ddMMyyyy, dd/MM/yyyy, ddMMyy");
            }
        }

        // Dùng JPQL search(...) + Sort từ Pageable
        Page<SensorData> sensorPage = sensorRepo.search(start, end, metric != null ? metric.name() : "ALL", PageRequest.of(page, size,
                ("asc".equalsIgnoreCase(sort))
                        ? Sort.by("recordedAt").ascending()
                        : Sort.by("recordedAt").descending()
        ));

        int startIndex = page * size;
        return ResponseUtils.mapToPagedResponse(sensorPage, page, size,
                (start != null)
                        ? searchMessage + " (" + sensorPage.getContent().size() + " kết quả)"
                        : "Tìm thấy " + sensorPage.getContent().size() + " kết quả.",
                data -> {
                    int index = sensorPage.getContent().indexOf(data);
                    return SensorReadingDTO.from(data, startIndex + index + 1);
                },
                "Không tìm thấy dữ liệu cảm biến.");
    }

    public PagedResponse<SensorReadingDTO> searchByValue(String dateStr,
                                                         SensorMetric metric,
                                                         String valueOp,
                                                         Double value,
                                                         Double valueTo,
                                                         Double tolerance,
                                                         int page,
                                                         int size,
                                                         String sort) {
        LocalDateTime start = null;
        LocalDateTime end = null;
        if (dateStr != null && !dateStr.isBlank()) {
            DateTimeUtils.DateTimeParseResult parseResult = DateTimeUtils.parseDateTime(dateStr);
            if (parseResult == null) {
                throw new InvalidDateFormatException("Hỗ trợ: dd-MM-yyyy HH:mm:ss, dd-MM-yyyy HH:mm, dd-MM-yyyy, ddMMyyyy, dd/MM/yyyy, ddMMyy");
            }
            start = parseResult.getStart();
            end = parseResult.getEnd();
        }

        ValueRange range = ValueFilterParser.toRange(valueOp, value, valueTo, tolerance, metric);

        final LocalDateTime startTime = start;
        final LocalDateTime endTime = end;
        final SensorMetric metricFinal = metric;
        final ValueRange valueRange = range;

        Specification<SensorData> spec = (root, query, cb) -> {
            Predicate predicate = cb.conjunction();
            if (startTime != null) {
                predicate = cb.and(predicate, cb.greaterThanOrEqualTo(root.get("recordedAt"), startTime));
            }
            if (endTime != null) {
                predicate = cb.and(predicate, cb.lessThan(root.get("recordedAt"), endTime));
            }
            if (metricFinal != null && metricFinal != SensorMetric.ALL) {
                String field = resolveField(metricFinal);
                if (valueRange != null) {
                    Double from = valueRange.getFrom();
                    Double to = valueRange.getTo();
                    if (from != null && !from.isInfinite()) {
                        if (valueRange.isIncludeFrom()) {
                            predicate = cb.and(predicate, cb.greaterThanOrEqualTo(root.get(field), from));
                        } else {
                            predicate = cb.and(predicate, cb.greaterThan(root.get(field), from));
                        }
                    }
                    if (to != null && !to.isInfinite()) {
                        if (valueRange.isIncludeTo()) {
                            predicate = cb.and(predicate, cb.lessThanOrEqualTo(root.get(field), to));
                        } else {
                            predicate = cb.and(predicate, cb.lessThan(root.get(field), to));
                        }
                    }
                } else {
                    predicate = cb.and(predicate, cb.isNotNull(root.get(field)));
                }
            }
            return predicate;
        };

        Page<SensorData> sensorPage = sensorRepo.findAll(spec, PageRequest.of(page, size,
                ("asc".equalsIgnoreCase(sort))
                        ? Sort.by("recordedAt").ascending()
                        : Sort.by("recordedAt").descending()
        ));

        int startIndex = page * size;
        return ResponseUtils.mapToPagedResponse(sensorPage, page, size,
                "Tìm theo giá trị thành công",
                data -> {
                    int index = sensorPage.getContent().indexOf(data);
                    return SensorReadingDTO.from(data, startIndex + index + 1);
                },
                "Không tìm thấy dữ liệu cảm biến.");
    }

    private String resolveField(SensorMetric metric) {
        switch (metric) {
            case TEMP: return "temperature";
            case HUMIDITY: return "humidity";
            case LIGHT: return "light";
            default: return null;
        }
    }



    // Lấy tất cả dữ liệu cảm biến, có phân trang
    public PagedResponse<SensorReadingDTO> getAllData(SensorMetric metric, int page, int size, String sort) {
        log.info("Getting all sensor data - page: {}, size: {}, sort: {}", page, size, sort);
        
        Page<SensorData> sensorPage = sensorRepo.search(null, null, metric != null ? metric.name() : "ALL", PageRequest.of(page, size,
                ("asc".equalsIgnoreCase(sort))
                        ? Sort.by("recordedAt").ascending()
                        : Sort.by("recordedAt").descending()
        ));

        log.info("Found {} sensor data records, total elements: {}", 
                sensorPage.getContent().size(), sensorPage.getTotalElements());


        int startIndex = page * size;
        return ResponseUtils.mapToPagedResponse(sensorPage, page, size,
                "Tìm thấy " + sensorPage.getContent().size() + " kết quả.",
                data -> {
                    int index = sensorPage.getContent().indexOf(data);
                    return SensorReadingDTO.from(data, startIndex + index + 1);
                },
                "Không tìm thấy dữ liệu cảm biến.");
    }




    
}
