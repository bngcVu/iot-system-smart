package com.iot_system.service;

import com.iot_system.domain.dto.PagedResponse;
import com.iot_system.domain.dto.SensorReadingDTO;
import com.iot_system.domain.entity.Device;
import com.iot_system.domain.entity.SensorData;
import com.iot_system.repository.SensorDataRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.stream.IntStream;

@Service
public class SensorDataService {

    private final SensorDataRepository sensorRepo;

    public SensorDataService(SensorDataRepository sensorRepo) {
        this.sensorRepo = sensorRepo;
    }

    /**
     * Lưu dữ liệu cảm biến vào DB
     */
    public SensorData saveSensorData(Device device, Double temperature, Double humidity, Double light) {
        SensorData data = new SensorData();
        data.setDevice(device);
        data.setTemperature(temperature);
        data.setHumidity(humidity);
        data.setLight(light);
        data.setRecordedAt(LocalDateTime.now());
        return sensorRepo.save(data);
    }

    /**
     * Tìm kiếm dữ liệu cảm biến theo ngày (ddMMyyyy hoặc dd/MM/yyyy), có phân trang
     */
    public PagedResponse<SensorReadingDTO> search(String dateStr, int page, int size) {
        LocalDateTime start = null;
        LocalDateTime end = null;

        if (dateStr != null && !dateStr.isBlank()) {
            LocalDate date = parseDate(dateStr);
            if (date != null) {
                start = date.atStartOfDay();
                end = start.plusDays(1);
            } else {
                return new PagedResponse<>("Sai định dạng ngày, hãy nhập ddMMyyyy hoặc dd/MM/yyyy",
                        List.of(), page, size, 0, 0);
            }
        }

        Page<SensorData> sensorPage = sensorRepo.search(start, end, PageRequest.of(page, size));

        return mapToPagedResponse(sensorPage, page, size,
                (start != null)
                        ? "Tìm thấy " + sensorPage.getContent().size() + " kết quả cho ngày " + dateStr
                        : "Tìm thấy " + sensorPage.getContent().size() + " kết quả.");
    }

    /**
     * Tìm kiếm dữ liệu cảm biến theo khoảng ngày (ddMMyyyy hoặc dd/MM/yyyy), có phân trang
     */
    public PagedResponse<SensorReadingDTO> searchRange(String fromDateStr, String toDateStr, int page, int size) {
        LocalDate fromDate = parseDate(fromDateStr);
        LocalDate toDate = parseDate(toDateStr);

        if (fromDate == null || toDate == null) {
            return new PagedResponse<>("Sai định dạng ngày, hãy nhập ddMMyyyy hoặc dd/MM/yyyy",
                    List.of(), page, size, 0, 0);
        }

        LocalDateTime start = fromDate.atStartOfDay();
        LocalDateTime end = toDate.plusDays(1).atStartOfDay(); // lấy đến hết ngày toDate

        Page<SensorData> sensorPage = sensorRepo.search(start, end, PageRequest.of(page, size));

        return mapToPagedResponse(sensorPage, page, size,
                "Tìm thấy " + sensorPage.getContent().size()
                        + " kết quả từ " + fromDateStr + " đến " + toDateStr);
    }

    /**
     * Hàm tiện ích chuyển Page<SensorData> -> PagedResponse<SensorReadingDTO>
     */
    private PagedResponse<SensorReadingDTO> mapToPagedResponse(Page<SensorData> sensorPage,
                                                               int page, int size,
                                                               String message) {
        int startIndex = page * size;
        List<SensorReadingDTO> results = IntStream.range(0, sensorPage.getContent().size())
                .mapToObj(i -> SensorReadingDTO.from(sensorPage.getContent().get(i), startIndex + i + 1))
                .toList();

        if (results.isEmpty()) {
            return new PagedResponse<>("Không tìm thấy dữ liệu cảm biến.", results,
                    page, size, sensorPage.getTotalElements(), sensorPage.getTotalPages());
        }

        return new PagedResponse<>(message, results,
                page, size, sensorPage.getTotalElements(), sensorPage.getTotalPages());
    }

    /**
     * Parse string date thành LocalDate (ddMMyyyy hoặc dd/MM/yyyy)
     */
    private LocalDate parseDate(String input) {
        try {
            if (input.matches("\\d{8}")) {
                return LocalDate.parse(input, DateTimeFormatter.ofPattern("ddMMyyyy"));
            }
            if (input.matches("\\d{2}/\\d{2}/\\d{4}")) {
                return LocalDate.parse(input, DateTimeFormatter.ofPattern("dd/MM/yyyy"));
            }
        } catch (Exception ignored) {
        }
        return null;
    }


    /**
     * Tìm kiếm nâng cao bằng Specification
     */
    public List<SensorData> searchWithSpec(Specification<SensorData> spec) {
        return sensorRepo.findAll(spec);
}
}
