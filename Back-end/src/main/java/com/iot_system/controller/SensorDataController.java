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
     * API tìm kiếm theo ngày/giờ (có phân trang)
     * Hỗ trợ: dd-MM-yyyy HH:mm:ss, dd-MM-yyyy, ddMMyyyy, dd-MM-yyyy HH:mm
     */
    @GetMapping("/search")
    public PagedResponse<SensorReadingDTO> search(
            @RequestParam(required = false) String date,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "15") int size,
            @RequestParam(defaultValue = "desc") String sort
    ) {
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
        // Nếu không có dateStr, sử dụng getAllData để tối ưu performance
        if (dateStr == null || dateStr.trim().isEmpty()) {
            return sensorDataService.getAllData(page, size, sort);
        }
        return sensorDataService.search(dateStr, page, size, sort);
    }


}
