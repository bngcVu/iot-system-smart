package com.iot_system.controller;

import com.iot_system.domain.dto.PagedResponse;
import com.iot_system.domain.dto.SensorReadingDTO;
import com.iot_system.service.SensorDataService;
import org.springframework.web.bind.annotation.*;

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
            @RequestParam(defaultValue = "15") int size,
            // sort: "asc" | "desc"; mặc định desc (mới nhất trước) để giữ hành vi cũ
            @RequestParam(defaultValue = "desc") String sort
    ) {
        if (fromDate != null && toDate != null) {
            return sensorDataService.searchRange(fromDate, toDate, page, size, sort);
        }
        return sensorDataService.search(date, page, size, sort);
    }

    /**
     * API mặc định: lấy tất cả hoặc theo 1 ngày (có phân trang)
     */
    @GetMapping
    public PagedResponse<SensorReadingDTO> getAll(
            @RequestParam(required = false) String dateStr,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "15") int size,
            @RequestParam(defaultValue = "desc") String sort
    ) {
        return sensorDataService.search(dateStr, page, size, sort);
    }

}
