# 🌐 IoT System

Hệ thống IoT quản lý thiết bị thông minh với giao diện web real-time, hỗ trợ điều khiển thiết bị và theo dõi dữ liệu cảm biến qua MQTT và WebSocket.

## 📌 Tổng quan dự án

Dự án IoT System là một hệ thống quản lý thiết bị thông minh được xây dựng bằng Spring Boot, cho phép:

- **Điều khiển thiết bị**: Bật/tắt LED, quạt, điều hòa thông qua giao diện web
- **Theo dõi cảm biến**: Hiển thị dữ liệu real-time từ cảm biến nhiệt độ, độ ẩm, ánh sáng
- **Lịch sử hoạt động**: Ghi lại và xem lịch sử điều khiển thiết bị
- **Biểu đồ dữ liệu**: Trực quan hóa dữ liệu cảm biến theo thời gian
- **Kết nối MQTT**: Giao tiếp với thiết bị ESP32 qua giao thức MQTT

## 🏗️ Kiến trúc tổng quan

### Backend (Spring Boot)
- **Framework**: Spring Boot 3.5.5 với Java 21
- **Database**: MySQL với JPA/Hibernate
- **MQTT**: Eclipse Paho MQTT Client (HiveMQ Cloud)
- **WebSocket**: Spring WebSocket với STOMP protocol
- **API**: RESTful APIs cho quản lý thiết bị và dữ liệu cảm biến

### Frontend (Vanilla JavaScript)
- **Giao diện**: HTML5, CSS3, JavaScript ES6+
- **Charts**: Chart.js, ECharts cho biểu đồ dữ liệu
- **Real-time**: SockJS + STOMP cho WebSocket
- **UI/UX**: Responsive design với animations

### Database Schema
- **Device**: Quản lý thông tin thiết bị (LED, FAN, AIR)
- **SensorData**: Lưu trữ dữ liệu cảm biến (nhiệt độ, độ ẩm, ánh sáng)
- **DeviceActionHistory**: Lịch sử điều khiển thiết bị

### MQTT Topics
- `sensor/data`: Nhận dữ liệu cảm biến từ ESP32
- `device_actions`: Gửi lệnh điều khiển đến thiết bị

## ⚙️ Yêu cầu môi trường

### Phần mềm cần thiết
- **Java**: 21+
- **Maven**: 3.6+
- **MySQL**: 8.0+
- **Node.js**: 16+ (cho development tools)

### Dịch vụ bên ngoài
- **MQTT Broker**: HiveMQ Cloud (hoặc Mosquitto local)
- **Database**: MySQL server

## 🚀 Cách cài đặt nhanh

### 1. Clone repository
```bash
git clone <repository-url>
cd iot-system
```

### 2. Cấu hình môi trường
```bash
# Copy file cấu hình mẫu
cp .env.example .env

# Chỉnh sửa thông tin database và MQTT
nano .env
```

### 3. Tạo database
```sql
CREATE DATABASE iot_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### 4. Chạy ứng dụng
```bash
# Development mode
mvn spring-boot:run

# Hoặc build và chạy JAR
mvn clean package
java -jar target/iot-system-0.0.1-SNAPSHOT.jar
```

### 5. Truy cập ứng dụng
- **Web Interface**: http://localhost:8081
- **API Base URL**: http://localhost:8081/api

## 📂 Cấu trúc thư mục

```
iot-system/
├── src/main/java/com/iot_system/
│   ├── config/                 # Cấu hình (CORS, MQTT, WebSocket)
│   ├── controller/             # REST Controllers
│   ├── domain/
│   │   ├── dto/               # Data Transfer Objects
│   │   ├── entity/            # JPA Entities
│   │   └── enums/             # Enumerations
│   ├── exception/             # Global Exception Handler
│   ├── mqtt/                  # MQTT Publisher/Subscriber
│   ├── repository/            # JPA Repositories
│   ├── service/               # Business Logic
│   └── util/                  # Utility Classes
├── src/main/resources/
│   ├── static/                # Frontend files
│   │   ├── css/              # Stylesheets
│   │   ├── js/               # JavaScript files
│   │   ├── img/              # Images
│   │   └── *.html            # HTML pages
│   └── application.properties # Application config
├── target/                    # Maven build output
├── pom.xml                    # Maven dependencies
├── .env.example              # Environment variables template
├── ENV_SETUP.md              # Environment setup guide
└── README.md                 # This file
```

## 🔧 Cấu hình chi tiết

### Environment Variables
Xem file `ENV_SETUP.md` để biết cách cấu hình:
- Database connection (MySQL)
- MQTT broker settings (HiveMQ Cloud)
- Application settings

### MQTT Configuration
- **Host**: HiveMQ Cloud hoặc local Mosquitto
- **Port**: 8883 (SSL) hoặc 1883 (non-SSL)
- **Topics**: 
  - `sensor/data` (incoming)
  - `device_actions` (outgoing)

### Database Configuration
- **URL**: `jdbc:mysql://localhost:3306/iot_db`
- **Timezone**: Asia/Ho_Chi_Minh
- **Encoding**: UTF-8

## 📱 Tính năng chính

### Dashboard
- Hiển thị trạng thái thiết bị real-time
- Điều khiển bật/tắt thiết bị
- Xem dữ liệu cảm biến mới nhất
- Biểu đồ dữ liệu theo thời gian

### Quản lý thiết bị
- Danh sách thiết bị (LED, FAN, AIR)
- Điều khiển trạng thái ON/OFF
- Theo dõi thời gian hoạt động cuối

### Dữ liệu cảm biến
- Nhiệt độ (°C)
- Độ ẩm (%)
- Ánh sáng (Lux)
- Lịch sử dữ liệu với phân trang

### Lịch sử hoạt động
- Ghi lại mọi thao tác điều khiển
- Thời gian thực hiện
- Trạng thái trước/sau

## 🔌 API Endpoints

### Devices
- `GET /api/devices` - Lấy danh sách thiết bị
- `POST /api/devices/command` - Gửi lệnh điều khiển

### Sensor Data
- `GET /api/sensor-data` - Lấy dữ liệu cảm biến
- `GET /api/sensor-data/latest` - Dữ liệu mới nhất

### History
- `GET /api/device-history` - Lịch sử hoạt động thiết bị

## 🛠️ Development

### Chạy tests
```bash
mvn test
```

### Build production
```bash
mvn clean package -Pproduction
```

### Debug mode
```bash
mvn spring-boot:run -Ddebug
```

## 📊 Monitoring

### Logs
- Application logs: `logs/application.log`
- MQTT logs: `logs/mqtt.log`
- Database logs: `logs/database.log`

### Health Check
- Application: http://localhost:8081/actuator/health
- Database: Tự động kiểm tra kết nối
- MQTT: Tự động reconnect khi mất kết nối


## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.

## 📞 Support

Nếu gặp vấn đề, vui lòng tạo issue trên GitHub hoặc liên hệ:
- Email: buingocvuuu@gmail.com


