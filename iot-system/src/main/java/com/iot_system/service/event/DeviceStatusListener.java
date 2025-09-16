package com.iot_system.service.event;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.iot_system.domain.entity.Device;
import com.iot_system.domain.entity.DeviceActionHistory;
import com.iot_system.domain.enums.DeviceState;
import com.iot_system.mqtt.DeviceStatusEvent;
import com.iot_system.repository.DeviceActionHistoryRepository;
import com.iot_system.repository.DeviceRepository;
import com.iot_system.service.SensorDataService;
import org.springframework.context.event.EventListener;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.HashMap;
import java.util.Map;

@Component
public class DeviceStatusListener {

    private final DeviceRepository deviceRepository;
    private final DeviceActionHistoryRepository actionHistoryRepository;
    private final SensorDataService sensorDataService;
    private final SimpMessagingTemplate wsTemplate;
    private final ObjectMapper mapper = new ObjectMapper();

    private final String actionTopic = "device_actions";
    private final String sensorTopic = "sensor/data";

    public DeviceStatusListener(DeviceRepository deviceRepository,
                                DeviceActionHistoryRepository actionHistoryRepository,
                                SensorDataService sensorDataService,
                                SimpMessagingTemplate wsTemplate) {
        this.deviceRepository = deviceRepository;
        this.actionHistoryRepository = actionHistoryRepository;
        this.sensorDataService = sensorDataService;
        this.wsTemplate = wsTemplate;
    }

    @EventListener
    public void handleDeviceEvent(DeviceStatusEvent event) {
        try {
            JsonNode json = mapper.readTree(event.getMessage());

            if (event.getTopic().equals(actionTopic + "_ack")) {
                handleAck(json);
            } else if (event.getTopic().equals(sensorTopic)) {
                handleSensor(json);
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    /** Xử lý ACK bật/tắt thiết bị */
    private void handleAck(JsonNode json) {
        try {
            int deviceId = json.get("deviceId").asInt();
            String state = json.get("state").asText();

            Device device = deviceRepository.findById((long) deviceId)
                    .orElseThrow(() -> new RuntimeException("Device not found: " + deviceId));
            device.setState(DeviceState.valueOf(state));
            deviceRepository.save(device);

            DeviceActionHistory history = new DeviceActionHistory();
            history.setDevice(device);
            history.setAction(DeviceState.valueOf(state));
            history.setExecutedAt(LocalDateTime.now());
            actionHistoryRepository.save(history);

            System.out.println("💾 Đã lưu DB (action history): deviceId=" + deviceId + " state=" + state);

            //Gửi WebSocket tới FE
            Map<String, Object> wsPayload = new HashMap<>();
            wsPayload.put("deviceId", deviceId);
            wsPayload.put("state", state);
            // Thống nhất format thời gian dd-MM-yyyy HH:mm:ss
            DateTimeFormatter fmt = DateTimeFormatter.ofPattern("dd-MM-yyyy HH:mm:ss");
            wsPayload.put("recordedAt", history.getExecutedAt().format(fmt));
            wsTemplate.convertAndSend("/topic/devices", wsPayload);

        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    /** Xử lý dữ liệu cảm biến */
    private void handleSensor(JsonNode json) {
        try {
            String deviceUid = json.has("deviceUid") ? json.get("deviceUid").asText() : null;
            Double temperature = json.has("temperature") ? json.get("temperature").asDouble() : null;
            Double humidity = json.has("humidity") ? json.get("humidity").asDouble() : null;
            Double light = json.has("light") ? json.get("light").asDouble() : null;

            if (deviceUid != null) {
                Device device = deviceRepository.findByDeviceUid(deviceUid)
                        .orElseThrow(() -> new RuntimeException("Không tìm thấy thiết bị: " + deviceUid));

                sensorDataService.saveSensorData(device, temperature, humidity, light);

                System.out.println("Đã lưu database cho deviceUid=" + deviceUid);

                //Gửi WebSocket tới FE
                Map<String, Object> wsPayload = new HashMap<>();
                wsPayload.put("deviceUid", deviceUid);
                wsPayload.put("temperature", temperature);
                wsPayload.put("humidity", humidity);
                wsPayload.put("light", light);
                DateTimeFormatter fmt = DateTimeFormatter.ofPattern("dd-MM-yyyy HH:mm:ss");
                wsPayload.put("recordedAt", LocalDateTime.now().format(fmt));
                wsTemplate.convertAndSend("/topic/sensors", wsPayload);

            } else {
                System.err.println("Thiếu deviceUid trong payload!");
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
    }
}
