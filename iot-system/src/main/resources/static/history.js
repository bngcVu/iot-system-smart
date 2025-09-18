// Trang Dữ liệu cảm biến: khởi tạo DataTable, gọi API, realtime WebSocket, highlight hàng mới
// -------- Configuration --------
const API_BASE = 'http://localhost:8081';
const SENSOR_API = `${API_BASE}/api/sensor-data`;

// -------- Global Variables --------
// Biến toàn cục cho DataTable và mốc thời gian mới nhất để so sánh realtime
let sensorDataTable = null;
let minDate = null;
let maxDate = null;
let latestTimestamp = null;

// -------- Utility Functions --------
// Trợ giúp: lấy phần tử theo id
function select(id) {
  return document.getElementById(id);
}

// Định dạng chuỗi thời gian từ API thành dd-MM-yyyy HH:mm:ss
function formatDateTime(dateTimeStr) {
  if (!dateTimeStr) return '--:--:--';
  
  try {
    let date;
    if (dateTimeStr.includes('T')) {
      date = new Date(dateTimeStr);
    } else if (dateTimeStr.includes('-')) {
      const parts = dateTimeStr.split(' ');
      if (parts.length === 2) {
        const datePart = parts[0].split('-');
        const timePart = parts[1].split(':');
        date = new Date(
          parseInt(datePart[2]), // year
          parseInt(datePart[1]) - 1, // month (0-based)
          parseInt(datePart[0]), // day
          parseInt(timePart[0]), // hour
          parseInt(timePart[1]), // minute
          parseInt(timePart[2]) // second
        );
      }
    } else {
      date = new Date(dateTimeStr);
    }
    
    if (!date || isNaN(date)) {
      console.log('Invalid date:', dateTimeStr);
      return '--:--:--';
    }
    
    const day = pad2(date.getDate());
    const month = pad2(date.getMonth() + 1);
    const year = date.getFullYear();
    const hours = pad2(date.getHours());
    const minutes = pad2(date.getMinutes());
    const seconds = pad2(date.getSeconds());
    
    const formatted = `${day}-${month}-${year} ${hours}:${minutes}:${seconds}`;
    console.log('Formatted date:', formatted);
    return formatted;
  } catch (e) {
    console.error('Error formatting date:', dateTimeStr, e);
    return '--:--:--';
  }
}

// Định dạng giá trị cảm biến theo đơn vị hiển thị
function formatValue(value, unit = '') {
  if (value === null || value === undefined || isNaN(value)) return '--';
  if (unit === 'Lux') return Math.round(value).toString();
  return value.toFixed(1);
}

// Bổ sung số 0 phía trước cho số < 10
function pad2(num) {
  return num.toString().padStart(2, '0');
}

// Chuyển đổi input ngày người dùng (dd/mm/yyyy, ddmmyyyy, ddmmyy) thành ddMMyyyy
function parseDateInput(dateStr) {
  if (!dateStr) return null;
  
  dateStr = dateStr.trim();
  
  if (dateStr.includes('/')) {
    const parts = dateStr.split('/');
    if (parts.length === 3) {
      const day = parts[0].padStart(2, '0');
      const month = parts[1].padStart(2, '0');
      const year = parts[2];
      return `${day}${month}${year}`;
    }
  }
  
  if (dateStr.length === 8 && /^\d{8}$/.test(dateStr)) {
    return dateStr;
  }
  
  if (dateStr.length === 6 && /^\d{6}$/.test(dateStr)) {
    const day = dateStr.substring(0, 2);
    const month = dateStr.substring(2, 4);
    const year = '20' + dateStr.substring(4, 6);
    return `${day}${month}${year}`;
  }
  
  return null;
}

// Đảm bảo overlay loading tồn tại trong vùng bảng
function ensureLoadingOverlay() {
  const container = document.querySelector('.table-container');
  if (!container) return null;
  let overlay = document.getElementById('table-loading');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'table-loading';
    overlay.className = 'loading-overlay';
    overlay.innerHTML = '<div class="spinner"></div>';
    container.appendChild(overlay);
  }
  return overlay;
}

// Bật/tắt trạng thái loading: khóa nút tìm kiếm + overlay bảng
function setLoading(isLoading) {
  const btn = select('search-btn');
  const overlay = ensureLoadingOverlay();
  if (btn) {
    btn.disabled = isLoading;
    btn.classList.toggle('loading', isLoading);
    btn.textContent = isLoading ? 'Đang tải...' : 'Tìm kiếm';
  }
  if (overlay) {
    overlay.style.display = isLoading ? 'flex' : 'none';
  }
}

// -------- API Calls --------
// Lấy dữ liệu cảm biến mới nhất (mặc định sort=desc ở backend)
async function fetchAllSensorData(sort = 'desc') {
  try {
    console.log('Fetching all sensor data...');
    const response = await fetch(`${SENSOR_API}?page=0&size=1000&sort=${encodeURIComponent(sort)}`);
    console.log('Response status:', response.status);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    console.log('Sensor data response:', data);
    return data.data || [];
  } catch (error) {
    console.error('Error fetching sensor data:', error);
    throw error;
  }
}

// -------- DataTables Functions --------
// Khởi tạo DataTable: cấu hình cột, ngôn ngữ, phân trang, nút xuất, ColVis
    function initializeDataTable() {
      if (sensorDataTable) {
        sensorDataTable.destroy();
      }

      sensorDataTable = $('#sensor-data-table').DataTable({
        data: [],
        columns: [
          { 
            title: 'STT',
            data: 'stt',
            className: 'stt-cell',
            width: '60px',
            orderable: false,
            visible: true
          },
          { 
            title: 'Nhiệt độ (°C)',
            data: 'temperature',
            className: 'temp-cell',
            orderable: false,
            visible: true,
            render: function(data) {
              return formatValue(data, '°C');
            }
          },
          { 
            title: 'Độ ẩm (%)',
            data: 'humidity',
            className: 'hum-cell',
            orderable: false,
            visible: true,
            render: function(data) {
              return formatValue(data, '%');
            }
          },
          { 
            title: 'Ánh sáng (Lux)',
            data: 'light',
            className: 'light-cell',
            orderable: false,
            visible: true,
            render: function(data) {
              return formatValue(data, 'Lux');
            }
          },
          { 
            title: 'Thời gian',
            data: 'recordedAt',
            className: 'time-cell',
            orderable: false,
            visible: true,
            render: function(data) {
              return formatDateTime(data);
            }
          }
        ],
        language: {
          url: '//cdn.datatables.net/plug-ins/1.13.7/i18n/vi.json'
        },
        pageLength: 15,
        lengthMenu: [[10, 15, 25, 50, 100, 200, 500], [10, 15, 25, 50, 100, 200, 500]],
        dom: '<"dt-header"<"dt-left"B><"dt-right"l>>rt<"dt-footer"ip>',
        buttons: [
          {
            extend: 'colvis',
            text: 'Chọn cột hiển thị',
            className: 'btn btn-primary',
            columns: [1, 2, 3]
          },
          {
            extend: 'excel',
            text: 'Xuất Excel',
            className: 'btn btn-success'
          },
          {
            extend: 'pdf',
            text: 'Xuất PDF',
            className: 'btn btn-danger'
          },
          {
            extend: 'print',
            text: 'In',
            className: 'btn btn-info'
          }
        ],
        responsive: true,
        processing: true,
        serverSide: false,
        searching: false,
        ordering: false,
        info: true,
        paging: true,
        pagingType: 'full_numbers'
      });

    }

// -------- Data Loading --------
// Tải toàn bộ dữ liệu, cập nhật STT và latestTimestamp
async function loadData() {
  try {
    setLoading(true);
    console.log('Loading sensor data...');
    const data = await fetchAllSensorData('desc');
    
    // Add STT to each item
    const dataWithStt = data.map((item, index) => ({
      ...item,
      stt: index + 1
    }));
    
    console.log('Loaded data with STT:', dataWithStt);
    
    if (sensorDataTable) {
      sensorDataTable.clear();
      sensorDataTable.rows.add(dataWithStt);
      sensorDataTable.draw();
    }
    
    updateTotalCount(dataWithStt.length);

    // Update latest timestamp after full load
    if (dataWithStt.length > 0) {
      latestTimestamp = getTimestampMillis(dataWithStt[0].recordedAt);
    }
  } catch (error) {
    console.error('Error loading data:', error);
    showError('Không thể tải dữ liệu. Vui lòng thử lại.');
  } finally {
    setLoading(false);
  }
}

// Tải dữ liệu theo 1 ngày (search date), kèm tham số sắp xếp asc/desc
async function loadDataWithSingleDate(date) {
  try {
    setLoading(true);
    console.log('Loading sensor data with single date:', date);
    
    const sort = (select('sort-order') && select('sort-order').value) || 'desc';
    const url = `${SENSOR_API}/search?date=${date}&page=0&size=1000&sort=${encodeURIComponent(sort)}`;
    console.log('API URL:', url);
    
    const response = await fetch(url);
    console.log('Response status:', response.status);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    console.log('Sensor data response:', data);
    
    const sensorData = data.data || [];
    
    // Add STT to each item
    const dataWithStt = sensorData.map((item, index) => ({
      ...item,
      stt: index + 1
    }));
    
    console.log('Loaded data with STT:', dataWithStt);
    
    if (sensorDataTable) {
      sensorDataTable.clear();
      sensorDataTable.rows.add(dataWithStt);
      sensorDataTable.draw();
    }
    
    updateTotalCount(dataWithStt.length);

    if (dataWithStt.length > 0) {
      latestTimestamp = getTimestampMillis(dataWithStt[0].recordedAt);
    }
  } catch (error) {
    console.error('Error loading data with single date:', error);
    showError('Không thể tải dữ liệu. Vui lòng thử lại.');
  } finally {
    setLoading(false);
  }
}

// Tải dữ liệu theo khoảng ngày [fromDate, toDate], kèm tham số sắp xếp
async function loadDataWithDateRange(fromDate, toDate) {
  try {
    setLoading(true);
    console.log('Loading sensor data with date range:', fromDate, 'to', toDate);
    
    const sort = (select('sort-order') && select('sort-order').value) || 'desc';
    const url = `${SENSOR_API}/search?fromDate=${fromDate}&toDate=${toDate}&page=0&size=1000&sort=${encodeURIComponent(sort)}`;
    console.log('API URL:', url);
    
    const response = await fetch(url);
    console.log('Response status:', response.status);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    console.log('Sensor data response:', data);
    
    const sensorData = data.data || [];
    
    // Add STT to each item
    const dataWithStt = sensorData.map((item, index) => ({
      ...item,
      stt: index + 1
    }));
    
    console.log('Loaded data with STT:', dataWithStt);
    
    if (sensorDataTable) {
      sensorDataTable.clear();
      sensorDataTable.rows.add(dataWithStt);
      sensorDataTable.draw();
    }
    
    updateTotalCount(dataWithStt.length);

    if (dataWithStt.length > 0) {
      latestTimestamp = getTimestampMillis(dataWithStt[0].recordedAt);
    }
  } catch (error) {
    console.error('Error loading data with date range:', error);
    showError('Không thể tải dữ liệu. Vui lòng thử lại.');
  } finally {
    setLoading(false);
  }
}

async function loadAllWithSort(sort) {
  try {
    setLoading(true);
    const data = await fetchAllSensorData(sort);
    const dataWithStt = data.map((item, index) => ({
      ...item,
      stt: index + 1
    }));
    if (sensorDataTable) {
      sensorDataTable.clear();
      sensorDataTable.rows.add(dataWithStt);
      sensorDataTable.draw();
    }
    updateTotalCount(dataWithStt.length);
    if (dataWithStt.length > 0) {
      latestTimestamp = getTimestampMillis(dataWithStt[0].recordedAt);
    }
  } catch (error) {
    console.error('Error loading all with sort:', error);
    showError('Không thể tải dữ liệu. Vui lòng thử lại.');
  } finally {
    setLoading(false);
  }
}

// Cập nhật tổng số bản ghi hiện có trên UI
function updateTotalCount(count) {
  const totalCountElement = select('total-count');
  if (totalCountElement) {
    totalCountElement.textContent = `Tổng: ${count} bản ghi`;
  }
}

// Hiển thị thông báo ngắn (toast)
function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.innerHTML = `<span>${message}</span><span class="toast-close">✕</span>`;
  container.appendChild(el);
  const closer = el.querySelector('.toast-close');
  if (closer) closer.onclick = () => el.remove();
  setTimeout(() => el.remove(), 3500);
}

// Chuyển chuỗi thời gian thành mili giây để so sánh realtime
function getTimestampMillis(dt) {
  try {
    if (!dt) return 0;
    if (typeof dt === 'string') {
      if (dt.includes('T')) return new Date(dt).getTime();
      const m = dt.match(/(\d{2})-(\d{2})-(\d{4}) (\d{2}):(\d{2}):(\d{2})/);
      if (m) return new Date(parseInt(m[3]), parseInt(m[2]) - 1, parseInt(m[1]), parseInt(m[4]), parseInt(m[5]), parseInt(m[6])).getTime();
      return new Date(dt).getTime();
    }
    if (dt instanceof Date) return dt.getTime();
    return 0;
  } catch { return 0; }
}

// Hiển thị lỗi validate định dạng ngày trên UI (không dùng alert)
function showError(message) {
  const box = document.getElementById('history-error');
  if (box) {
    box.textContent = message;
    box.style.display = 'block';
  }
}

// Ẩn hộp lỗi
function clearError() {
  const box = document.getElementById('history-error');
  if (box) box.style.display = 'none';
}

// -------- Event Handlers --------
// Xử lý nút Tìm kiếm: ưu tiên "Tìm kiếm" theo 1 ngày, nếu không thì theo khoảng ngày
async function handleSearch() {
  const searchDateInput = select('search-date').value;
  const fromDateInput = select('from-date').value;
  const toDateInput = select('to-date').value;
  
  console.log('Search date:', searchDateInput);
  console.log('From date:', fromDateInput);
  console.log('To date:', toDateInput);
  
  // Check if search date is provided
  if (searchDateInput) {
    clearError();
    const parsedDate = parseDateInput(searchDateInput);
    if (parsedDate) {
      // Load data with single date from API
      await loadDataWithSingleDate(parsedDate);
      return;
    } else {
      showError('Định dạng ngày không hợp lệ. Vui lòng nhập theo định dạng dd/mm/yyyy, ddmmyyyy hoặc ddmmyy');
      return;
    }
  }
  
  // Check if date range is provided
  if (fromDateInput && toDateInput) {
    clearError();
    const parsedFromDate = parseDateInput(fromDateInput);
    const parsedToDate = parseDateInput(toDateInput);
    
    if (parsedFromDate && parsedToDate) {
      // Load data with date range from API
      await loadDataWithDateRange(parsedFromDate, parsedToDate);
    } else {
      showError('Định dạng ngày không hợp lệ. Vui lòng nhập theo định dạng dd/mm/yyyy hoặc ddmmyyyy');
    }
  } else {
    clearError();
    const sort = (select('sort-order') && select('sort-order').value) || 'desc';
    await loadAllWithSort(sort);
  }
}


// Xử lý nút Làm mới: xóa input + lỗi, tải lại toàn bộ dữ liệu
function handleReset() {
  select('search-date').value = '';
  select('from-date').value = '';
  select('to-date').value = '';
  clearError();
  
  // Load all data
  loadData();
}

// -------- Event Binding --------
// Gắn sự kiện cho nút và phím Enter trong ô nhập
function bindEvents() {
  select('search-btn').addEventListener('click', handleSearch);
  select('reset-btn').addEventListener('click', handleReset);
  
  select('search-date').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  });
  
  select('from-date').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  });
  
  select('to-date').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  });
}

// -------- Bootstrap --------
// Bootstrap: khởi tạo trang + đăng ký WebSocket nhận realtime cảm biến
$(document).ready(function() {
  console.log('History page loaded with jQuery');
  bindEvents();
  initializeDataTable();
  loadData();

  // Realtime via WebSocket (same endpoint/topic with dashboard)
  const WS_ENDPOINT = `${API_BASE}/ws`;
  const TOPIC_SENSORS = `/topic/sensors`;
  try {
    const sock = new SockJS(WS_ENDPOINT);
    const stomp = Stomp.over(sock);
    stomp.debug = () => {};
    stomp.connect({}, () => {
      stomp.subscribe(TOPIC_SENSORS, (frame) => {
        try {
          const msg = JSON.parse(frame.body);
          const ts = getTimestampMillis(msg.recordedAt || msg.time || msg.timestamp || msg.createdAt);
          if (!latestTimestamp || ts > latestTimestamp) {
            showToast('Có dữ liệu cảm biến mới.', 'success');

            // Merge new item to top of current data set
            const current = sensorDataTable ? sensorDataTable.rows().data().toArray() : [];
            const newRow = { ...msg, recordedAt: msg.recordedAt || msg.time || msg.timestamp || msg.createdAt };
            const updated = [newRow, ...current];
            const withStt = updated.map((item, idx) => ({ ...item, stt: idx + 1 }));

            // Keep current page length and page
            const currentPage = sensorDataTable ? sensorDataTable.page() : 0;
            const currentLen = sensorDataTable ? sensorDataTable.page.len() : 15;
            sensorDataTable.clear();
            sensorDataTable.rows.add(withStt);
            sensorDataTable.draw(false);
            sensorDataTable.page.len(currentLen).page(currentPage).draw(false);

            // Highlight first row (newest)
            const firstRow = sensorDataTable.row(0).node();
            if (firstRow) {
              $(firstRow).addClass('row-flash');
              setTimeout(() => $(firstRow).removeClass('row-flash'), 1700);
            }

            latestTimestamp = ts;
            updateTotalCount(withStt.length);
          }
        } catch (e) {
          console.warn('WS payload error', e);
        }
      });
    }, () => {
      // auto-retry ws
      setTimeout(() => window.location.reload(), 5000);
    });
  } catch (e) {
    console.error('WS init failed', e);
  }
});