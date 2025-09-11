package com.iot_system.controller;

import com.iot_system.domain.dto.DeviceControlDTO;
import com.iot_system.domain.dto.DeviceStatusDTO;
import com.iot_system.service.DeviceService;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/devices")
public class DeviceController {

    private final DeviceService deviceService;

    public DeviceController(DeviceService deviceService) {
        this.deviceService = deviceService;
    }

    @GetMapping
    public List<DeviceStatusDTO> getAll() {
        return deviceService.getAllDevices();
    }

    @PostMapping("/command")
    public void sendCommand(@RequestBody DeviceControlDTO dto) {
        deviceService.sendCommand(dto);
    }
}
