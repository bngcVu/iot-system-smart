package com.iot_system.service;

import com.iot_system.domain.dto.ActionHistoryDTO;
import com.iot_system.domain.dto.PagedResponse;
import com.iot_system.domain.entity.DeviceActionHistory;
import com.iot_system.domain.enums.DeviceState;
import com.iot_system.repository.DeviceActionHistoryRepository;
import com.iot_system.repository.DeviceRepository;
import jakarta.transaction.Transactional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.stream.IntStream;

@Service
public class ActionHistoryService {

    private final DeviceActionHistoryRepository historyRepo;
    private final DeviceRepository deviceRepo;

    public ActionHistoryService(DeviceActionHistoryRepository historyRepo, DeviceRepository deviceRepo) {
        this.historyRepo = historyRepo;
        this.deviceRepo = deviceRepo;
    }

    @Transactional
    public void logAction(Long deviceId, DeviceState action) {
        var device = deviceRepo.findById(deviceId)
                .orElseThrow(() -> new IllegalArgumentException("Thiết bị không tồn tại"));

        DeviceActionHistory history = new DeviceActionHistory();
        history.setDevice(device);
        history.setAction(action);

        historyRepo.save(history);
    }

    public PagedResponse<ActionHistoryDTO> search(String dateStr, String fromDateStr, String toDateStr,
                                                  String deviceName, DeviceState action,
                                                  int page, int size, String sort) {
        LocalDateTime start = null;
        LocalDateTime end = null;

        if (fromDateStr != null && toDateStr != null && !fromDateStr.isBlank() && !toDateStr.isBlank()) {
            LocalDate from = parseDate(fromDateStr);
            LocalDate to = parseDate(toDateStr);
            if (from == null || to == null) {
                return new PagedResponse<>("Sai định dạng ngày, hãy nhập ddMMyyyy hoặc dd/MM/yyyy",
                        List.of(), page, size, 0, 0);
            }
            start = from.atStartOfDay();
            end = to.plusDays(1).atStartOfDay();
        } else if (dateStr != null && !dateStr.isBlank()) {
            LocalDate date = parseDate(dateStr);
            if (date == null) {
                return new PagedResponse<>("Sai định dạng ngày, hãy nhập ddMMyyyy hoặc dd/MM/yyyy",
                        List.of(), page, size, 0, 0);
            }
            start = date.atStartOfDay();
            end = start.plusDays(1);
        }

        Pageable pageable = PageRequest.of(page, size,
                ("asc".equalsIgnoreCase(sort))
                        ? org.springframework.data.domain.Sort.by("executedAt").ascending()
                        : org.springframework.data.domain.Sort.by("executedAt").descending()
        );
        Page<DeviceActionHistory> historyPage = historyRepo.search(deviceName, action, start, end, pageable);

        int startIndex = page * size;
        List<ActionHistoryDTO> results = IntStream.range(0, historyPage.getContent().size())
                .mapToObj(i -> ActionHistoryDTO.from(historyPage.getContent().get(i), startIndex + i + 1))
                .toList();

        if (results.isEmpty()) {
            String msg = (start != null)
                    ? "Không có dữ liệu cho ngày " + dateStr
                    : "Không tìm thấy lịch sử hoạt động nào phù hợp.";
            return new PagedResponse<>(msg, results, page, size, historyPage.getTotalElements(), historyPage.getTotalPages());
        }

        return new PagedResponse<>("Tìm thấy " + results.size() + " kết quả.", results,
                page, size, historyPage.getTotalElements(), historyPage.getTotalPages());
    }

    private LocalDate parseDate(String input) {
        try {
            if (input.matches("\\d{8}")) {
                DateTimeFormatter f = DateTimeFormatter.ofPattern("ddMMyyyy");
                return LocalDate.parse(input, f);
            }
            if (input.matches("\\d{2}/\\d{2}/\\d{4}")) {
                DateTimeFormatter f = DateTimeFormatter.ofPattern("dd/MM/yyyy");
                return LocalDate.parse(input, f);
            }
        } catch (Exception ignored) {}
        return null;
    }
}