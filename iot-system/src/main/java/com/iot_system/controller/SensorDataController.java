package com.iot_system.controller;

import com.iot_system.domain.dto.ApiResponse;
import com.iot_system.domain.dto.PagedResponse;
import com.iot_system.domain.dto.SensorReadingDTO;
import com.iot_system.domain.entity.SensorData;
import com.iot_system.repository.spec.SensorDataSpecification;
import com.iot_system.service.SensorDataService;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.IntStream;

@RestController
@RequestMapping("/api/sensor-data")
public class SensorDataController {

    private final SensorDataService sensorDataService;

    public SensorDataController(SensorDataService sensorDataService) {
        this.sensorDataService = sensorDataService;
    }

    /**
     * API cũ: tìm theo ngày hoặc khoảng ngày (có phân trang)
     */
    @GetMapping("/search")
    public PagedResponse<SensorReadingDTO> search(
            @RequestParam(required = false) String date,
            @RequestParam(required = false) String fromDate,
            @RequestParam(required = false) String toDate,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "15") int size
    ) {
        if (fromDate != null && toDate != null) {
            return sensorDataService.searchRange(fromDate, toDate, page, size);
        }
        return sensorDataService.search(date, page, size);
    }

    /**
     * API mặc định: lấy tất cả hoặc theo 1 ngày (có phân trang)
     */
    @GetMapping
    public PagedResponse<SensorReadingDTO> getAll(
            @RequestParam(required = false) String dateStr,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "15") int size
    ) {
        return sensorDataService.search(dateStr, page, size);
    }

    /**
     * API mới: tìm kiếm nâng cao bằng Specification
     */
    @GetMapping("/search-advanced")
    public ResponseEntity<ApiResponse<List<SensorReadingDTO>>> searchAdvanced(
            @RequestParam(required = false) Long deviceId,
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime from,
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime to,
            @RequestParam(required = false) Double minTemp
    ) {
        List<SensorData> entities = sensorDataService.searchWithSpec(
                Specification.where(SensorDataSpecification.hasDevice(deviceId))
                        .and(SensorDataSpecification.recordedBetween(from, to))
                        .and(SensorDataSpecification.temperatureGreaterThan(minTemp))
        );

        // Map sang DTO
        List<SensorReadingDTO> results = 
                IntStream.range(0, entities.size())
                        .mapToObj(i -> SensorReadingDTO.from(entities.get(i), i + 1))
                        .toList();

        return ResponseEntity.ok(ApiResponse.success("Kết quả tìm kiếm nâng cao", results));
}

}
