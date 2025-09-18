package com.iot_system.service;

import com.iot_system.domain.dto.PagedResponse;
import com.iot_system.domain.dto.SensorReadingDTO;
import com.iot_system.domain.entity.Device;
import com.iot_system.domain.entity.SensorData;
import com.iot_system.repository.SensorDataRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.stream.IntStream;

@Service
public class SensorDataService {

    private static final Logger log = LoggerFactory.getLogger(SensorDataService.class);

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
    // Tìm kiếm theo 1 ngày; hỗ trợ sắp xếp asc/desc theo recordedAt
    public PagedResponse<SensorReadingDTO> search(String dateStr, int page, int size, String sort) {
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

        // Dùng JPQL search(...) + Sort từ Pageable (giữ 1 hướng duy nhất)
        Page<SensorData> sensorPage = sensorRepo.search(start, end, PageRequest.of(page, size,
                ("asc".equalsIgnoreCase(sort))
                        ? Sort.by("recordedAt").ascending()
                        : Sort.by("recordedAt").descending()
        ));

        return mapToPagedResponse(sensorPage, page, size,
                (start != null)
                        ? "Tìm thấy " + sensorPage.getContent().size() + " kết quả cho ngày " + dateStr
                        : "Tìm thấy " + sensorPage.getContent().size() + " kết quả.");
    }

    /**
     * Tìm kiếm dữ liệu cảm biến theo khoảng ngày (ddMMyyyy hoặc dd/MM/yyyy), có phân trang
     */
    // Tìm kiếm theo khoảng ngày; hỗ trợ sắp xếp asc/desc theo recordedAt
    public PagedResponse<SensorReadingDTO> searchRange(String fromDateStr, String toDateStr, int page, int size, String sort) {
        LocalDate fromDate = parseDate(fromDateStr);
        LocalDate toDate = parseDate(toDateStr);

        if (fromDate == null || toDate == null) {
            return new PagedResponse<>("Sai định dạng ngày, hãy nhập ddMMyyyy hoặc dd/MM/yyyy",
                    List.of(), page, size, 0, 0);
        }

        LocalDateTime start = fromDate.atStartOfDay();
        LocalDateTime end = toDate.plusDays(1).atStartOfDay(); // lấy đến hết ngày toDate

        Page<SensorData> sensorPage = sensorRepo.search(start, end, PageRequest.of(page, size,
                ("asc".equalsIgnoreCase(sort))
                        ? Sort.by("recordedAt").ascending()
                        : Sort.by("recordedAt").descending()
        ));

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
     * Parse string date thành LocalDate (ddMMyyyy, dd/MM/yyyy hoặc ddMMyy)
     */
    private LocalDate parseDate(String input) {
        try {
            if (input.matches("\\d{8}")) {
                return LocalDate.parse(input, DateTimeFormatter.ofPattern("ddMMyyyy"));
            }
            if (input.matches("\\d{2}/\\d{2}/\\d{4}")) {
                return LocalDate.parse(input, DateTimeFormatter.ofPattern("dd/MM/yyyy"));
            }
            if (input.matches("\\d{6}")) {
                // Handle ddmmyy format (assume 20xx)
                String day = input.substring(0, 2); // dd
                String month = input.substring(2, 4); // mm
                String year = "20" + input.substring(4, 6); // 20yy
                String fullInput = day + month + year; // ddmm20yy
                return LocalDate.parse(fullInput, DateTimeFormatter.ofPattern("ddMMyyyy"));
            }
        } catch (Exception e) {
            log.warn("[SERVICE] Lỗi phân tích ngày: {} - {}", input, e.getMessage());
        }
        return null;
    }


    
}
