package com.iot_system.mqtt;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.annotation.PostConstruct;
import jakarta.annotation.PreDestroy;
import org.eclipse.paho.client.mqttv3.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.util.Map;
import java.util.UUID;

@Service
public class CommandPublisher {

    @Value("${mqtt.host}")
    private String host;

    @Value("${mqtt.port}")
    private int port;

    @Value("${mqtt.username}")
    private String username;

    @Value("${mqtt.password}")
    private String password;

    @Value("${mqtt.actionTopic}")
    private String actionTopic;

    private MqttClient mqttClient;

    @PostConstruct
    public void init() {
        try {
            String brokerUrl = "ssl://" + host + ":" + port;
            String clientId = "SpringBootPublisher-" + UUID.randomUUID();

            mqttClient = new MqttClient(brokerUrl, clientId);
            MqttConnectOptions options = new MqttConnectOptions();
            options.setUserName(username);
            options.setPassword(password.toCharArray());
            options.setAutomaticReconnect(true);
            options.setCleanSession(true);

            mqttClient.connect(options);
            System.out.println("✅ MQTT Publisher connected to " + brokerUrl);
        } catch (Exception e) {
            throw new RuntimeException("❌ Không thể kết nối MQTT broker", e);
        }
    }

    public void sendAction(int deviceId, String action) {
        try {
            ObjectMapper mapper = new ObjectMapper();
            Map<String, Object> payload = Map.of(
                    "deviceId", deviceId,
                    "action", action
            );

            String json = mapper.writeValueAsString(payload);
            MqttMessage msg = new MqttMessage(json.getBytes());
            msg.setQos(1);
            mqttClient.publish(actionTopic, msg);

            System.out.println("📤 Published to " + actionTopic + ": " + json);
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    @PreDestroy
    public void shutdown() {
        try {
            if (mqttClient != null && mqttClient.isConnected()) {
                mqttClient.disconnect();
                System.out.println("MQTT publisher disconnected");
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
    }
}
