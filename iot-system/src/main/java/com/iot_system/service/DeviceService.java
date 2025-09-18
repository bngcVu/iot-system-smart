package com.iot_system.service;

import com.iot_system.domain.dto.DeviceControlDTO;
import com.iot_system.domain.dto.DeviceStatusDTO;
import com.iot_system.domain.entity.Device;
import com.iot_system.domain.enums.DeviceState;
import com.iot_system.mqtt.CommandPublisher;
import com.iot_system.repository.DeviceRepository;
import jakarta.transaction.Transactional;
import org.springframework.stereotype.Service;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Service cho bảng Device
 * - Gửi lệnh (publish MQTT)
 * - Cập nhật trạng thái khi có ACK
 * - Trả về danh sách Device dưới dạng DTO
 */
@Service
public class DeviceService {

    private final DeviceRepository deviceRepo;
    private final CommandPublisher commandPublisher;

    private static final Logger log = LoggerFactory.getLogger(DeviceService.class);

    public DeviceService(DeviceRepository deviceRepo, CommandPublisher commandPublisher) {
        this.deviceRepo = deviceRepo;
        this.commandPublisher = commandPublisher;
    }

    public List<DeviceStatusDTO> getAllDevices() {
        return deviceRepo.findAll().stream()
                .map(d -> new DeviceStatusDTO(
                        d.getId(),
                        d.getName(),
                        d.getDeviceUid(),
                        d.getType(),
                        d.getState(),
                        d.getLastSeenAt()
                ))
                .toList();
    }

    /**
     * Publish lệnh xuống MQTT (chưa update DB, chờ ACK từ ESP32)
     */
    @Transactional
    public void sendCommand(DeviceControlDTO dto) {
        Device device = deviceRepo.findById(dto.deviceId())
                .orElseThrow(() -> new IllegalArgumentException("Thiết bị không tồn tại"));

        // ✅ dùng helper method thay vì build JSON thủ công
        commandPublisher.sendAction(device.getId().intValue(), dto.action().toString());

        log.info("[SERVICE] Đã gửi lệnh -> deviceId={}, hành động={}", device.getId(), dto.action());
    }

    /**
     * Cập nhật state khi nhận ACK từ ESP32
     */
    @Transactional
    public DeviceStatusDTO updateStateFromAck(Long deviceId, DeviceState newState) {
        Device device = deviceRepo.findById(deviceId)
                .orElseThrow(() -> new IllegalArgumentException("Thiết bị không tồn tại"));

        device.setState(newState);
        device.setLastSeenAt(LocalDateTime.now());
        deviceRepo.save(device);

        return new DeviceStatusDTO(
                device.getId(),
                device.getName(),
                device.getDeviceUid(),
                device.getType(),
                device.getState(),
                device.getLastSeenAt()
        );
    }
}
