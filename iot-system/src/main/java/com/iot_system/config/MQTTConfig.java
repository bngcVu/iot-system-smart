package com.iot_system.config;

import org.eclipse.paho.client.mqttv3.MqttClient;
import org.eclipse.paho.client.mqttv3.MqttConnectOptions;
import org.eclipse.paho.client.mqttv3.MqttException;
import org.eclipse.paho.client.mqttv3.persist.MemoryPersistence;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class MQTTConfig {

    @Value("${mqtt.host}")
    private String host;

    @Value("${mqtt.port}")
    private int port;

    @Value("${mqtt.username}")
    private String username;

    @Value("${mqtt.password}")
    private String password;

    @Value("${spring.application.name:iot-system}")
    private String appName;

    @Bean
    public MqttClient mqttClient() throws MqttException {
        // Broker URL = ssl://host:port (HiveMQ Cloud cần SSL)
        String brokerUrl = "ssl://" + host + ":" + port;
        String clientId = appName + "-" + System.currentTimeMillis();

        MqttClient client = new MqttClient(brokerUrl, clientId, new MemoryPersistence());

        MqttConnectOptions options = new MqttConnectOptions();
        options.setUserName(username);
        options.setPassword(password.toCharArray());
        options.setAutomaticReconnect(true);
        options.setCleanSession(true);

        client.connect(options);

        System.out.println("✅ MQTT client connected to " + brokerUrl);

        return client;
    }
}
