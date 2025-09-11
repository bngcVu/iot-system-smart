package com.iot_system.mqtt;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.iot_system.domain.entity.Device;
import com.iot_system.domain.entity.DeviceActionHistory;
import com.iot_system.domain.enums.DeviceState;
import com.iot_system.service.SensorDataService;
import com.iot_system.repository.DeviceActionHistoryRepository;
import com.iot_system.repository.DeviceRepository;
import jakarta.annotation.PostConstruct;
import org.eclipse.paho.client.mqttv3.*;
import org.eclipse.paho.client.mqttv3.persist.MemoryPersistence;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.util.UUID;

@Component
public class CommandSubscriber {

    private final DeviceRepository deviceRepository;
    private final DeviceActionHistoryRepository actionHistoryRepository;
    private final SensorDataService sensorDataService;

    @Value("${mqtt.host}")
    private String host;

    @Value("${mqtt.port}")
    private int port;

    @Value("${mqtt.username}")
    private String username;

    @Value("${mqtt.password}")
    private String password;

    @Value("${mqtt.telemetryTopic}")
    private String actionTopic;

    @Value("${mqtt.telemetryTopic}")
    private String sensorTopic;

    private MqttClient mqttClient;

    public CommandSubscriber(DeviceRepository deviceRepository,
                             DeviceActionHistoryRepository actionHistoryRepository,
                             SensorDataService sensorDataService) {
        this.deviceRepository = deviceRepository;
        this.actionHistoryRepository = actionHistoryRepository;
        this.sensorDataService = sensorDataService;
    }

    @PostConstruct
    public void init() {
        try {
            String brokerUrl = "ssl://" + host + ":" + port;
            String clientId = "SpringBootSubscriber-" + UUID.randomUUID();

            mqttClient = new MqttClient(brokerUrl, clientId, new MemoryPersistence());
            MqttConnectOptions options = new MqttConnectOptions();
            options.setUserName(username);
            options.setPassword(password.toCharArray());
            options.setCleanSession(true);

            mqttClient.connect(options);
            System.out.println("✅ MQTT Subscriber connected to HiveMQ Cloud");

            // Sub tới ACK từ ESP32 (bật/tắt thiết bị)
            mqttClient.subscribe(actionTopic + "_ack", this::handleAckMessage);

            // Sub tới sensor data từ ESP32
            mqttClient.subscribe(sensorTopic, this::handleSensorMessage);

        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    /**
     * Xử lý ACK bật/tắt thiết bị
     */
    private void handleAckMessage(String topic, MqttMessage message) {
        try {
            String payload = new String(message.getPayload());
            System.out.println("📥 ACK từ ESP32: " + payload);

            ObjectMapper mapper = new ObjectMapper();
            JsonNode json = mapper.readTree(payload);

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

        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    /**
     * Xử lý dữ liệu cảm biến
     */
    private void handleSensorMessage(String topic, MqttMessage message) {
        try {
            String payload = new String(message.getPayload());
            System.out.println("📥 Sensor data từ ESP32: " + payload);

            ObjectMapper mapper = new ObjectMapper();
            JsonNode json = mapper.readTree(payload);

            String deviceUid = json.has("deviceUid") ? json.get("deviceUid").asText() : null;
            Double temperature = json.has("temperature") ? json.get("temperature").asDouble() : null;
            Double humidity = json.has("humidity") ? json.get("humidity").asDouble() : null;
            Double light = json.has("light") ? json.get("light").asDouble() : null;

            if (deviceUid != null) {
                Device device = deviceRepository.findByDeviceUid(deviceUid)
                        .orElseThrow(() -> new RuntimeException("Device not found: " + deviceUid));

                sensorDataService.saveSensorData(device, temperature, humidity, light);

                System.out.println("💾 Đã lưu DB (sensor data) cho deviceUid=" + deviceUid);
            } else {
                System.err.println("❌ Thiếu deviceUid trong payload: " + payload);
            }

        } catch (Exception e) {
            e.printStackTrace();
        }
    }
}
