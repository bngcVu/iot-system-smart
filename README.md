
Hệ thống IoT quản lý thiết bị thông minh với giao diện web real-time, hỗ trợ điều khiển thiết bị và theo dõi dữ liệu cảm biến qua MQTT và WebSocket.

📌 Tổng quan
Xây dựng bằng Spring Boot 3.5.x (Java 21), MySQL, MQTT (HiveMQ Cloud), WebSocket/STOMP và frontend tĩnh (HTML/CSS/JS).

Tính năng chính:

⚙️ Yêu cầu
🛠️ Cấu hình
Chỉnh sửa src/main/resources/application.properties để thiết lập Database và MQTT.

Ví dụ MySQL:

jdbc:mysql://localhost:3306/iot_db
Charset/Collation: utf8mb4/utf8mb4_unicode_ci

Xem thêm hướng dẫn trong ENV_SETUP.md.

🚀 Chạy ứng dụng
Cách 1: Chạy ở chế độ dev
./mvnw.cmd spring-boot:run

Cách 2 (Windows – khuyến nghị): Console UTF‑8 + chạy JAR
Sử dụng script đã chuẩn bị để tránh lỗi font tiếng Việt và hạn chế DevTools restart:

PowerShell -ExecutionPolicy Bypass -File .\scripts\run-utf8.ps1

Nếu đã build sẵn và chỉ muốn chạy:

PowerShell -ExecutionPolicy Bypass -File .\scripts\run-utf8.ps1 -SkipBuild

Cách 3: Build JAR và chạy thủ công
./mvnw.cmd clean package -DskipTests
java -jar target/iot-system-0.0.1-SNAPSHOT.jar

Truy cập:

🔌 MQTT Topics
sensor/data: ESP32 → Backend (dữ liệu cảm biến)
device_actions: Backend → ESP32 (lệnh điều khiển)
device_actions_ack: ESP32 → Backend (phản hồi lệnh)
🧰 Công nghệ sử dụng (Backend)
Spring Boot 3.5.5 (Java 21), Maven Wrapper
🧠 Kiến thức/Thiết kế áp dụng trong Backend
Phân lớp rõ ràng: Controller → Service → Repository → Entity/DTO
