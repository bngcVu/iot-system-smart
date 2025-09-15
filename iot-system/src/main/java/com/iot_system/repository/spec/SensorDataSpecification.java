
package com.iot_system.repository.spec;

import com.iot_system.domain.entity.SensorData;
import org.springframework.data.jpa.domain.Specification;

import java.time.LocalDateTime;

public class SensorDataSpecification {

    public static Specification<SensorData> hasDevice(Long deviceId) {
        return (root, query, cb) ->
                deviceId == null ? null : cb.equal(root.get("device").get("id"), deviceId);
    }

    public static Specification<SensorData> recordedBetween(LocalDateTime from, LocalDateTime to) {
        return (root, query, cb) ->
                (from == null || to == null) ? null : cb.between(root.get("recordedAt"), from, to);
    }

    public static Specification<SensorData> temperatureGreaterThan(Double value) {
        return (root, query, cb) ->
                value == null ? null : cb.greaterThan(root.get("temperature"), value);
    }
}
