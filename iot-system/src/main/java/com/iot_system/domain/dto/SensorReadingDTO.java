package com.iot_system.domain.dto;

import com.fasterxml.jackson.annotation.JsonFormat;
import com.iot_system.domain.entity.SensorData;

import java.time.LocalDateTime;

public class SensorReadingDTO {
    private int stt;
    private Double temperature;
    private Double humidity;
    private Double light;

    @JsonFormat(pattern = "dd-MM-yyyy HH:mm:ss", timezone = "Asia/Ho_Chi_Minh")
    private LocalDateTime recordedAt;

    public SensorReadingDTO(int stt, Double temperature, Double humidity, Double light, LocalDateTime recordedAt) {
        this.stt = stt;
        this.temperature = temperature;
        this.humidity = humidity;
        this.light = light;
        this.recordedAt = recordedAt;
    }

    public static SensorReadingDTO from(SensorData e, int stt) {
        return new SensorReadingDTO(
                stt,
                e.getTemperature(),
                e.getHumidity(),
                e.getLight(),
                e.getRecordedAt()
        );
    }

    // Getter
    public int getStt() { return stt; }
    public Double getTemperature() { return temperature; }
    public Double getHumidity() { return humidity; }
    public Double getLight() { return light; }
    public LocalDateTime getRecordedAt() { return recordedAt; }
}
