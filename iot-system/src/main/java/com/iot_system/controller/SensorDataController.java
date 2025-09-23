package com.iot_system.controller;

import com.iot_system.domain.dto.PagedResponse;
import com.iot_system.domain.dto.SensorReadingDTO;
import com.iot_system.domain.enums.SensorMetric;
import com.iot_system.service.SensorDataService;
 
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/sensor-data")
public class SensorDataController {

    private final SensorDataService sensorDataService;

    public SensorDataController(SensorDataService sensorDataService) {
        this.sensorDataService = sensorDataService;
    }

    @GetMapping("/search")
    public PagedResponse<SensorReadingDTO> search(
            @RequestParam(required = false) String date,
            @RequestParam(defaultValue = "ALL") SensorMetric metric,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "15") int size,
            @RequestParam(defaultValue = "desc") String sort
    ) {
        return sensorDataService.search(date, metric, page, size, sort);
    }

    @GetMapping
    public PagedResponse<SensorReadingDTO> getAll(
            @RequestParam(required = false) String dateStr,
            @RequestParam(defaultValue = "ALL") SensorMetric metric,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "15") int size,
            @RequestParam(defaultValue = "desc") String sort
    ) {
        if (dateStr == null || dateStr.trim().isEmpty()) {
            return sensorDataService.getAllData(metric, page, size, sort);
        }
        return sensorDataService.search(dateStr, metric, page, size, sort);
    }
}
