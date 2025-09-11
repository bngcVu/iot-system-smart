package com.iot_system.controller;

import com.iot_system.domain.dto.PagedResponse;
import com.iot_system.domain.dto.SensorReadingDTO;
import com.iot_system.service.SensorDataService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/sensor-data")
public class SensorDataController {

    private final SensorDataService sensorDataService;

    public SensorDataController(SensorDataService sensorDataService) {
        this.sensorDataService = sensorDataService;
    }

    @GetMapping("/search")
    public PagedResponse<SensorReadingDTO> search(
            @RequestParam(required = false) String date,   // ddMMyyyy hoặc dd/MM/yyyy
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "15") int size
    ) {
        return sensorDataService.search(date, page, size);
    }

    // Nếu muốn gọi trực tiếp /api/sensor-data mà không có /search
    @GetMapping
    public PagedResponse<SensorReadingDTO> getAll(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "15") int size
    ) {
        return sensorDataService.search(null, page, size);
    }
}
