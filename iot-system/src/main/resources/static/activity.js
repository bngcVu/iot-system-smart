// Trang Lịch sử hoạt động: khởi tạo DataTable, gọi API, validate bộ lọc, hiển thị badge hành động
// -------- Configuration --------
const API_BASE = 'http://localhost:8081';
const ACTIVITY_API = `${API_BASE}/api/device-actions`;

// -------- Global Variables --------
// Biến DataTable cho bảng lịch sử
let activityDataTable = null;

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

// Bổ sung số 0 phía trước cho số < 10
function pad2(num) {
  return num.toString().padStart(2, '0');
}

// Chuyển đổi input ngày (dd/mm/yyyy, ddmmyyyy, ddmmyy) thành ddMMyyyy
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
// Lấy toàn bộ lịch sử hành động (mặc định sort=desc ở backend)
async function fetchAllActivityData() {
  try {
    console.log('Fetching all activity data...');
    const response = await fetch(`${ACTIVITY_API}?page=0&size=1000&sort=desc`);
    console.log('Response status:', response.status);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    console.log('Activity data response:', data);
    return data.data || [];
  } catch (error) {
    console.error('Error fetching activity data:', error);
    throw error;
  }
}

// -------- DataTables Functions --------
// Khởi tạo DataTable: định nghĩa cột, phân trang, các nút xuất (không dùng ColVis)
function initializeDataTable() {
  if (activityDataTable) {
    activityDataTable.destroy();
  }

  activityDataTable = $('#activity-data-table').DataTable({
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
        title: 'Thiết bị',
        data: 'deviceName',
        className: 'device-cell',
        orderable: false,
        visible: true
      },
      { 
        title: 'Hành động',
        data: 'action',
        className: 'action-cell',
        orderable: false,
        visible: true,
        render: function(data) {
          const badgeClass = data === 'ON' ? 'badge-success' : 'badge-danger';
          const text = data === 'ON' ? 'Bật' : 'Tắt';
          return `<span class="badge ${badgeClass}">${text}</span>`;
        }
      },
      { 
        title: 'Thời gian thực hiện',
        data: 'executedAt',
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
    lengthMenu: [[10, 15, 25, 50, 100], [10, 15, 25, 50, 100]],
    dom: '<"dt-header"<"dt-left"B><"dt-right"l>>rt<"dt-footer"ip>',
    buttons: [
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
// Tải toàn bộ dữ liệu và cập nhật STT
async function loadData() {
  try {
    setLoading(true);
    console.log('Loading activity data...');
    const data = await fetchAllActivityData();
    
    // Add STT to each item
    const dataWithStt = data.map((item, index) => ({
      ...item,
      stt: index + 1
    }));
    
    console.log('Loaded data with STT:', dataWithStt);
    
    if (activityDataTable) {
      activityDataTable.clear();
      activityDataTable.rows.add(dataWithStt);
      activityDataTable.draw();
    }
    
    updateTotalCount(dataWithStt.length);
  } catch (error) {
    console.error('Error loading data:', error);
    showError('Không thể tải dữ liệu. Vui lòng thử lại.');
  } finally {
    setLoading(false);
  }
}

// Tải dữ liệu theo bộ lọc: tên thiết bị/hành động/khoảng ngày + sắp xếp asc/desc
async function loadDataWithFilters(deviceName, action, fromDate, toDate) {
  try {
    setLoading(true);
    console.log('Loading activity data with filters:', { deviceName, action, fromDate, toDate });
    
    const sort = (select('sort-order') && select('sort-order').value) || 'desc';
    let url = `${ACTIVITY_API}/search?page=0&size=1000&sort=${encodeURIComponent(sort)}`;
    
    if (deviceName) {
      url += `&deviceName=${encodeURIComponent(deviceName)}`;
    }
    if (action) {
      url += `&action=${action}`;
    }
    if (fromDate && toDate) {
      url += `&fromDate=${fromDate}&toDate=${toDate}`;
    }
    
    console.log('API URL:', url);
    
    const response = await fetch(url);
    console.log('Response status:', response.status);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    console.log('Activity data response:', data);
    
    const activityData = data.data || [];
    
    // Add STT to each item
    const dataWithStt = activityData.map((item, index) => ({
      ...item,
      stt: index + 1
    }));
    
    console.log('Loaded data with STT:', dataWithStt);
    
    if (activityDataTable) {
      activityDataTable.clear();
      activityDataTable.rows.add(dataWithStt);
      activityDataTable.draw();
    }
    
    updateTotalCount(dataWithStt.length);
  } catch (error) {
    console.error('Error loading data with filters:', error);
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

// Hiển thị lỗi validate định dạng ngày trên UI
function showError(message) {
  const box = document.getElementById('activity-error');
  if (box) {
    box.textContent = message;
    box.style.display = 'block';
  }
}

// Ẩn hộp lỗi
function clearError() {
  const box = document.getElementById('activity-error');
  if (box) box.style.display = 'none';
}

// -------- Event Handlers --------
// Xử lý Tìm kiếm: phân biệt chuỗi nhập là tên thiết bị hay là ngày
async function handleSearch() {
  const searchInput = select('search-input').value.trim();
  const fromDateInput = select('from-date').value;
  const toDateInput = select('to-date').value;
  const action = select('action-filter').value;
  
  console.log('Search input:', searchInput);
  console.log('From date:', fromDateInput);
  console.log('To date:', toDateInput);
  console.log('Action:', action);
  
  let deviceName = '';
  let fromDate = '';
  let toDate = '';
  
  // Handle search input
  if (searchInput) {
    const parsedDate = parseDateInput(searchInput);
    if (parsedDate) {
      // It's a date, use as date range
      fromDate = parsedDate;
      toDate = parsedDate;
    } else {
      // It's a device name
      deviceName = searchInput;
    }
  }
  
  // Handle date range inputs
  if (fromDateInput && toDateInput) {
    clearError();
    const parsedFromDate = parseDateInput(fromDateInput);
    const parsedToDate = parseDateInput(toDateInput);
    
    if (parsedFromDate && parsedToDate) {
      fromDate = parsedFromDate;
      toDate = parsedToDate;
    } else {
      showError('Định dạng ngày không hợp lệ. Vui lòng nhập theo định dạng dd/mm/yyyy hoặc ddmmyyyy');
      return;
    }
  }
  
  // Load data with filters
  await loadDataWithFilters(deviceName, action, fromDate, toDate);
}


// Xử lý Làm mới: xóa input + lỗi, tải lại tất cả
function handleReset() {
  select('search-input').value = '';
  select('from-date').value = '';
  select('to-date').value = '';
  select('action-filter').value = '';
  clearError();
  
  // Load all data
  loadData();
}

// -------- Event Binding --------
// Gắn sự kiện click và Enter cho các ô nhập
function bindEvents() {
  select('search-btn').addEventListener('click', handleSearch);
  select('reset-btn').addEventListener('click', handleReset);
  
  select('search-input').addEventListener('keypress', (e) => {
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
$(document).ready(function() {
  console.log('Activity page loaded with jQuery');
  bindEvents();
  initializeDataTable();
  loadData();
});