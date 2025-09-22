// Vanilla JS Sensor Data Manager
// Lịch sử cảm biến - quản lý UI và dữ liệu (module hóa nhẹ)
import { downloadCsvFromRows, sanitizeCsvField } from './utils/csv.js';
import { fetchSensorsPage } from './api/sensors.js';
import { connectStomp } from './realtime/wsClient.js';

class VanillaSensorDataManager {
    constructor() {
        this.currentPage = 0;
        this.pageSize = 15;
        this.currentSort = 'desc';
        this.currentSearch = '';
        this.currentFilter = 'all';
        this.isLoading = false;
        this.totalElements = 0;
        this.totalPages = 0;
        this.lastUpdateTime = null; // Track last update timestamp
        this.isFromAutoRefresh = false; // Flag to distinguish auto refresh from search
        this.ws = null;
        this.wsConnected = false;
        this.wsDebounce = false;
        this.pollTimerId = null;
        this.lastWsMessageAt = 0;
        
        this.init();
        this.tabulator = null;
    }

    init() {
        this.bindEvents();
        this.loadInitialData();
        this.startAutoRefresh();
        this.connectWS();
        this.startLiveMonitor();
    }

    bindEvents() {
        // Search button
        document.getElementById('searchBtn').addEventListener('click', () => {
            this.performSearch();
        });

        // Enter key in search input
        document.getElementById('searchInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.performSearch();
            }
        });

        // Sort change
        document.getElementById('sortSelect').addEventListener('change', (e) => {
            this.currentSort = e.target.value;
            this.lastUpdateTime = null; // Reset to prevent highlighting old data
            this.manualRefreshData();
        });

        // Page size change
        document.getElementById('pageSizeSelect').addEventListener('change', (e) => {
            this.pageSize = parseInt(e.target.value);
            this.currentPage = 0;
            this.lastUpdateTime = null; // Reset to prevent highlighting old data
            this.setPageSizeLoading(true);
            this.manualRefreshData();
        });

        // Column filter change
        document.getElementById('columnFilter').addEventListener('change', (e) => {
            this.currentFilter = e.target.value;
            this.applyColumnFilter();
            this.currentPage = 0;
            this.manualRefreshData();
        });


        // Pagination controls
        document.getElementById('prevPage').addEventListener('click', () => {
            if (this.currentPage > 0) {
                this.currentPage--;
                this.manualRefreshData();
            }
        });

        document.getElementById('nextPage').addEventListener('click', () => {
            if (this.currentPage < this.totalPages - 1) {
                this.currentPage++;
                this.manualRefreshData();
            }
        });

        // Page number clicks
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('page-number')) {
                const page = parseInt(e.target.dataset.page);
                if (page !== this.currentPage) {
                    this.currentPage = page;
                    this.manualRefreshData();
                }
            }
        });

        const exportBtn = document.getElementById('btn-export-csv-history');
        if (exportBtn) {
            exportBtn.addEventListener('click', () => {
                this.exportCSV();
            });
        }
    }

    connectWS() {
        try {
            this.ws = connectStomp({
                onConnected: () => {
                    this.wsConnected = true;
                    if (this.pollTimerId) { clearInterval(this.pollTimerId); this.pollTimerId = null; }
                },
                onDisconnected: () => {
                    this.wsConnected = false;
                    if (!this.pollTimerId) {
                        this.pollTimerId = setInterval(() => {
                            if (!this.isLoading) { this.refreshData(); }
                        }, 6000);
                    }
                },
                onSensors: (payload) => {
                    this.lastWsMessageAt = Date.now();
                    if (this.currentPage === 0) {
                        this.applyWsItem(payload);
                    } else {
                        // do nothing when not on first page
                    }
                }
            });
        } catch (e) {}
    }

    startLiveMonitor() {
        if (this._liveTimer) return;
        this._liveTimer = setInterval(() => {
            if (this.isLoading) return;
            if (this.currentPage !== 0) return;
            this.fetchData(true);
        }, 6000);
    }

    applyWsItem(item) {
        try {
            const normalized = {
                temperature: item.temperature !== null && item.temperature !== undefined ? parseFloat(item.temperature) : null,
                humidity: item.humidity !== null && item.humidity !== undefined ? parseFloat(item.humidity) : null,
                light: item.light !== null && item.light !== undefined ? parseFloat(item.light) : null,
                recordedAt: item.recordedAt || item.time || item.timestamp || item.createdAt
            };
            if (this.tabulator) {
                this.tabulator.addData([
                    {
                        stt: 1,
                        temperature: normalized.temperature,
                        humidity: normalized.humidity,
                        light: normalized.light,
                        recordedAt: normalized.recordedAt
                    }
                ], true);
                const data = this.tabulator.getData();
                if (data.length > this.pageSize) {
                    this.tabulator.deleteRow(data[data.length - 1].id);
                }
            }
            const ts = new Date(normalized.recordedAt).getTime();
            if (!isNaN(ts)) this.lastUpdateTime = ts;
        } catch {}
    }

    async loadInitialData() {
        this.showSkeleton();
        try {
            await this.fetchData(true);
        } catch (error) {
            console.error('Load initial data error:', error);
            this.showEmptyTable();
        }
    }

    async performSearch() {
        const searchValue = document.getElementById('searchInput').value.trim();
        
        if (searchValue && !this.isValidDateFormat(searchValue)) {
            this.renderInvalidFormatMessage();
            this.updateTableInfo({ data: [], totalElements: 0, totalPages: 0, currentPage: 0 });
            this.setPaginationLoading(false);
            this.setPageSizeLoading(false);
            return;
        }
        
        // Only update state if validation passes
        this.currentSearch = searchValue;
        this.currentPage = 0;
        
        // Reset lastUpdateTime when searching to prevent highlighting old data
        this.lastUpdateTime = null;
        
        this.setButtonLoading(true);
        try {
            this.isFromAutoRefresh = false; // Ensure this is not from auto refresh
            await this.fetchData();
        } catch (error) {
            console.error('Search error:', error);
            this.showToast('Lỗi khi tìm kiếm: ' + error.message, 'error');
        } finally {
            this.setButtonLoading(false);
        }
    }

    async fetchData(silent = false) {
        if (this.isLoading) return;
        
        this.isLoading = true;
        if (!silent) this.showTableLoading();
        
        try {
            // Wait for 800ms to show loading effect
            await new Promise(resolve => setTimeout(resolve, 800));
            
            const result = await fetchSensorsPage({
                page: this.currentPage,
                size: this.pageSize,
                sort: this.currentSort,
                metric: this.mapFilterToMetric(this.currentFilter) || 'ALL',
                date: this.currentSearch || ''
            });
            if (result && typeof result.message === 'string' && result.message.toLowerCase().includes('sai định dạng')) {
                this.renderInvalidFormatMessage();
                this.updateTableInfo({ ...result, data: [], totalElements: 0, totalPages: 0, currentPage: 0 });
                return;
            }
            if (!result.data) {
                console.warn('No data field in response:', result);
                throw new Error(result.message || 'Không có dữ liệu');
            }
            
            const sensorData = result.data || [];
            
            
            // Normalize data
            const normalizedData = sensorData.map((item, index) => ({
                stt: item.stt || (this.currentPage * this.pageSize + index + 1),
                temperature: item.temperature !== null && item.temperature !== undefined ? parseFloat(item.temperature) : null,
                humidity: item.humidity !== null && item.humidity !== undefined ? parseFloat(item.humidity) : null,
                light: item.light !== null && item.light !== undefined ? parseFloat(item.light) : null,
                recordedAt: item.recordedAt
            }));
            
            if (normalizedData.length === 0) {
                console.log('No data from API');
                this.showEmptyTable();
            } else {
                console.log(`Loading ${normalizedData.length} rows into table`);
                this.updateTable(normalizedData);
            }
            
            this.updateTableInfo(result);
            
        } catch (error) {
            console.error('Fetch error:', error);
            this.showEmptyTable();
        } finally {
            this.isLoading = false;
            if (!silent) this.hideTableLoading();
            this.setPaginationLoading(false);
            this.setPageSizeLoading(false);
        }
    }

    updateTable(data) {
        const tbody = document.querySelector('#sensorDataTable tbody');
        const table = document.getElementById('sensorDataTable');
        if (!tbody) return;
        tbody.innerHTML = '';
        if (!Array.isArray(data) || data.length === 0) {
            this.showEmptyTable();
            return;
        }
        let hasNewData = false;
        data.forEach((item) => {
            const row = document.createElement('tr');
            const isNewData = this.isNewData(item);
            if (isNewData) { row.classList.add('new-data-row'); hasNewData = true; }
            row.innerHTML = `
                <td>${item.stt}</td>
                <td>${this.formatSensorValue(item.temperature, 'temperature', isNewData)}</td>
                <td>${this.formatSensorValue(item.humidity, 'humidity', isNewData)}</td>
                <td>${this.formatSensorValue(item.light, 'light', isNewData)}</td>
                <td>${this.formatDateTime(item.recordedAt)}</td>
            `;
            tbody.appendChild(row);
        });
        if (hasNewData && table) {
            table.classList.add('has-new-data');
            setTimeout(() => table.classList.remove('has-new-data'), 3000);
        }
        this.animateTableRows();
        try {
            const newest = data.reduce((maxTs, item) => {
                const ts = new Date(item.recordedAt).getTime();
                return isNaN(ts) ? maxTs : Math.max(maxTs, ts);
            }, 0);
            if (newest > 0) this.lastUpdateTime = newest;
        } catch {}
        this.applyColumnFilter();
    }

    animateTableRows() {
        const rows = document.querySelectorAll('#sensorDataTable tbody tr');
        
        // Set initial state
        gsap.set(rows, { opacity: 0, y: 30 });
        
        // Animate rows with stagger effect
        gsap.to(rows, {
            opacity: 1,
            y: 0,
            duration: 0.6,
            stagger: 0.08,
            ease: "power2.out"
        });
    }

    isNewData(item) {
        try {
            const itemTime = new Date(item.recordedAt).getTime();
            const currentTime = new Date().getTime();
            const timeDiff = currentTime - itemTime;
            
            // Only highlight if:
            // 1. Data is recent (within last 2 minutes)
            // 2. AND we have a lastUpdateTime (meaning this is from auto refresh, not search)
            // 3. AND it's newer than our last update time
            const isRecent = timeDiff <= (2 * 60 * 1000); // 2 minutes
            const hasLastUpdateTime = this.lastUpdateTime !== null;
            const isNewer = hasLastUpdateTime && itemTime > this.lastUpdateTime;
            const shouldHighlight = isRecent && hasLastUpdateTime && isNewer;
            
            if (shouldHighlight) {
                console.log('New data detected:', {
                    itemTime: new Date(item.recordedAt).toLocaleString(),
                    timeDiff: Math.round(timeDiff / 1000) + 's',
                    isRecent: isRecent,
                    hasLastUpdateTime: hasLastUpdateTime,
                    isNewer: isNewer,
                    lastUpdateTime: this.lastUpdateTime ? new Date(this.lastUpdateTime).toLocaleString() : 'none'
                });
            }
            
            return shouldHighlight;
        } catch (error) {
            console.error('Error parsing timestamp:', error);
            return false;
        }
    }

    startAutoRefresh() {
        // disabled per user request; rely on WS prepend only
    }

    async refreshData() {
        try {
            // Only refresh if we're not currently loading and on first page
            if (this.isLoading || this.currentPage !== 0) {
                console.log('Skipping refresh - loading:', this.isLoading, 'page:', this.currentPage);
                return;
            }

            console.log('Auto refreshing data...');
            this.isFromAutoRefresh = true; // Set flag for auto refresh
            const metric = this.mapFilterToMetric(this.currentFilter) || 'ALL';
            const response = await fetch(`/api/sensor-data?page=0&size=${this.pageSize}&sort=${this.currentSort}&metric=${metric}&_=${Date.now()}`);
            const result = await response.json();
            
            if (result && result.data) {
                const hasNewData = this.lastUpdateTime ? this.checkForNewData(result.data) : true;
                if (hasNewData) {
                    console.log('New sensor data detected! Updating table...');
                    this.updateTable(result.data);
                    this.updateTableInfo(result);
                }
            }
        } catch (error) {
            console.error('Auto refresh error:', error);
        } finally {
            this.isFromAutoRefresh = false; // Reset flag
        }
    }

    checkForNewData(data) {
        if (!this.lastUpdateTime || data.length === 0) {
            return false;
        }

        // Check if any data is newer than our last update
        return data.some(item => {
            try {
                const itemTime = new Date(item.recordedAt).getTime();
                return itemTime > this.lastUpdateTime;
            } catch (error) {
                console.error('Error parsing item timestamp:', error);
                return false;
            }
        });
    }

    showToast(message, type = 'info') {
        const toast = document.getElementById('toast');
        if (toast) {
            toast.textContent = message;
            toast.className = `toast ${type}`;
            toast.classList.add('show');
            
            setTimeout(() => {
                toast.classList.remove('show');
            }, 3000);
        }
    }

    showEmptyTable(message) {
        const tbody = document.querySelector('#sensorDataTable tbody');
        if (!tbody) return;
        tbody.innerHTML = '';
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td colspan="5" style="text-align: center; padding: 2rem; color: #6b7280;">
                <div style="display: inline-flex; flex-direction: column; align-items: center; gap: 0.5rem;">
                    <div style="font-size: 1.2rem;">📊</div>
                    <div>${message || 'Không có dữ liệu cảm biến'}</div>
                    <div style="font-size: 0.8rem; color: #9ca3af;">Dữ liệu sẽ được hiển thị khi có thiết bị gửi thông tin</div>
                </div>
            </td>`;
        tbody.appendChild(tr);
    }

    renderInvalidFormatMessage() {
        const tbody = document.querySelector('#sensorDataTable tbody');
        if (!tbody) return;
        tbody.innerHTML = '';
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td colspan="5" style="text-align: center; padding: 2rem; color: #6b7280;">
                <div style="display: inline-flex; flex-direction: column; align-items: center; gap: 0.6rem;">
                    <div style="font-size: 1.4rem;">⚠️</div>
                    <div>Không có dữ liệu. Vui lòng nhập đúng định dạng</div>
                </div>
            </td>`;
        tbody.appendChild(tr);
    }

    applyColumnFilter() {
        const table = document.getElementById('sensorDataTable');
        const headers = table.querySelectorAll('thead th');
        const rows = table.querySelectorAll('tbody tr');
        
        // Hide all sensor columns first
        [1, 2, 3].forEach(colIndex => {
            headers[colIndex].style.display = 'none';
            rows.forEach(row => {
                const cell = row.cells[colIndex];
                if (cell) cell.style.display = 'none';
            });
        });
        
        // Show columns based on filter
        let visibleColumns = [0, 4]; // STT and Time always visible
        
        switch (this.currentFilter) {
            case 'all':
                visibleColumns = [0, 1, 2, 3, 4];
                break;
            case 'temperature':
                visibleColumns = [0, 1, 4];
                break;
            case 'humidity':
                visibleColumns = [0, 2, 4];
                break;
            case 'light':
                visibleColumns = [0, 3, 4];
                break;
        }
        
        // Show selected columns
        visibleColumns.forEach(colIndex => {
            headers[colIndex].style.display = '';
            rows.forEach(row => {
                const cell = row.cells[colIndex];
                if (cell) cell.style.display = '';
            });
        });
    }

    mapFilterToMetric(filter) {
        switch (filter) {
            case 'all': return 'ALL';
            case 'temperature': return 'TEMP';
            case 'humidity': return 'HUMIDITY';
            case 'light': return 'LIGHT';
            default: return 'ALL';
        }
    }

    getVisibleColumnCount() {
        switch (this.currentFilter) {
            case 'all': return 5;
            case 'temperature':
            case 'humidity':
            case 'light': return 3;
            default: return 5;
        }
    }

    formatSensorValue(value, sensorType, isNewData = false) {
        if (value === null || value === undefined) {
            return '<span class="no-data">--</span>';
        }
        
        const numValue = parseFloat(value);
        if (isNaN(numValue)) {
            return '<span class="no-data">--</span>';
        }

        // Use sensor type for color coding and add new-data class if needed
        const classes = `sensor-value ${sensorType}${isNewData ? ' new-data' : ''}`;
        return `<span class="${classes}">${numValue.toFixed(1)}</span>`;
    }

    formatDateTime(dateTimeStr) {
        if (!dateTimeStr) return '<span class="no-data">--</span>';
        
        try {
            // If already in dd-MM-yyyy HH:mm:ss format, return as is
            if (dateTimeStr.match(/^\d{2}-\d{2}-\d{4} \d{2}:\d{2}:\d{2}$/)) {
                return dateTimeStr;
            }
            
            // Handle other formats
            let date;
            if (dateTimeStr.includes('T')) {
                // ISO format
                date = new Date(dateTimeStr);
            } else if (dateTimeStr.includes('-') && dateTimeStr.includes(':')) {
                // dd-MM-yyyy HH:mm:ss format
                const [datePart, timePart] = dateTimeStr.split(' ');
                const [day, month, year] = datePart.split('-');
                const [hour, minute, second] = timePart.split(':');
                date = new Date(year, month - 1, day, hour, minute, second);
            } else {
                date = new Date(dateTimeStr);
            }
            
            if (isNaN(date.getTime())) {
                return '<span class="no-data">--</span>';
            }
            
            // Format to dd/MM/yyyy HH:mm:ss format
            const day = String(date.getDate()).padStart(2, '0');
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const year = date.getFullYear();
            const hour = String(date.getHours()).padStart(2, '0');
            const minute = String(date.getMinutes()).padStart(2, '0');
            const second = String(date.getSeconds()).padStart(2, '0');
            
            return `${day}/${month}/${year} ${hour}:${minute}:${second}`;
        } catch (error) {
            console.warn('Date parsing error:', error, 'Input:', dateTimeStr);
            return '<span class="no-data">--</span>';
        }
    }

    updateTableInfo(result) {
        if (result && result.totalElements !== undefined) {
            this.totalElements = result.totalElements;
            this.totalPages = result.totalPages;
            
            console.log(`Total elements: ${result.totalElements}, Current page: ${result.currentPage + 1}, Total pages: ${result.totalPages}`);
            
            this.updatePaginationInfo(result);
            this.updateRecordCount(result);
        }
    }

    updateRecordCount(result) {
        const actualDisplayed = result.data ? result.data.length : 0;
        const recordCountText = `Hiển thị ${actualDisplayed} bản ghi (trang ${result.currentPage + 1}/${result.totalPages})`;
        document.getElementById('recordCount').textContent = recordCountText;
    }

    exportCSV() {
        try {
            const tbody = document.querySelector('#sensorDataTable tbody');
            const trs = Array.from(tbody ? tbody.querySelectorAll('tr') : []);
            const lines = ['stt,temperature,humidity,light,recordedAt'];
            trs.forEach(r => {
                const c = r.cells;
                if (c && c.length >= 5) {
                    const stt = sanitizeCsvField((c[0].innerText || '').trim());
                    const t = sanitizeCsvField((c[1].innerText || '').trim());
                    const h = sanitizeCsvField((c[2].innerText || '').trim());
                    const l = sanitizeCsvField((c[3].innerText || '').trim());
                    const ts = sanitizeCsvField((c[4].innerText || '').trim());
                    lines.push(`${stt},${t},${h},${l},${ts}`);
                }
            });
            downloadCsvFromRows(lines, `sensor-history-${Date.now()}.csv`);
        } catch (e) {
            console.error('Export CSV error', e);
            this.showToast('Xuất CSV thất bại', 'error');
        }
    }

    updatePaginationInfo(result) {
        const prevBtn = document.getElementById('prevPage');
        const nextBtn = document.getElementById('nextPage');
        
        prevBtn.disabled = result.currentPage === 0;
        nextBtn.disabled = result.currentPage >= result.totalPages - 1;
        
        this.generatePageNumbers(result.currentPage, result.totalPages);
    }

    generatePageNumbers(currentPage, totalPages) {
        const pageNumbers = document.getElementById('pageNumbers');
        pageNumbers.innerHTML = '';
        
        const maxVisiblePages = 5;
        let startPage = Math.max(0, currentPage - Math.floor(maxVisiblePages / 2));
        let endPage = Math.min(totalPages - 1, startPage + maxVisiblePages - 1);
        
        if (endPage - startPage < maxVisiblePages - 1) {
            startPage = Math.max(0, endPage - maxVisiblePages + 1);
        }
        
        for (let i = startPage; i <= endPage; i++) {
            const pageBtn = document.createElement('button');
            pageBtn.className = `page-number ${i === currentPage ? 'active' : ''}`;
            pageBtn.dataset.page = i;
            pageBtn.textContent = i + 1;
            pageNumbers.appendChild(pageBtn);
        }
    }

    manualRefreshData() {
        this.isFromAutoRefresh = false; // Ensure this is not from auto refresh
        this.setPaginationLoading(true);
        this.fetchData(true);
    }

    setButtonLoading(loading) {
        const btn = document.getElementById('searchBtn');
        const btnText = btn.querySelector('.btn-text');
        const btnLoading = btn.querySelector('.btn-loading');
        
        if (loading) {
            btn.classList.add('loading');
            btn.disabled = true;
            btnText.style.display = 'none';
            btnLoading.style.display = 'inline';
        } else {
            btn.classList.remove('loading');
            btn.disabled = false;
            btnText.style.display = 'inline';
            btnLoading.style.display = 'none';
        }
    }

    setPaginationLoading(loading) {
        const prevBtn = document.getElementById('prevPage');
        const nextBtn = document.getElementById('nextPage');
        const pageNumbers = document.querySelectorAll('.page-number');
        
        if (loading) {
            prevBtn.disabled = true;
            nextBtn.disabled = true;
            pageNumbers.forEach(btn => btn.disabled = true);
            
            // Add loading class to pagination container
            const paginationContainer = document.querySelector('.pagination-buttons');
            if (paginationContainer) {
                paginationContainer.classList.add('loading');
            }
        } else {
            prevBtn.disabled = this.currentPage === 0;
            nextBtn.disabled = this.currentPage >= this.totalPages - 1;
            pageNumbers.forEach(btn => btn.disabled = false);
            
            // Remove loading class from pagination container
            const paginationContainer = document.querySelector('.pagination-buttons');
            if (paginationContainer) {
                paginationContainer.classList.remove('loading');
            }
        }
    }

    setPageSizeLoading(loading) {
        const pageSizeSelect = document.getElementById('pageSizeSelect');
        const pageSizeContainer = document.querySelector('.page-size-controls');
        
        if (loading) {
            pageSizeSelect.disabled = true;
            if (pageSizeContainer) {
                pageSizeContainer.classList.add('loading');
            }
        } else {
            pageSizeSelect.disabled = false;
            if (pageSizeContainer) {
                pageSizeContainer.classList.remove('loading');
            }
        }
    }

    showTableLoading() {
        // No blocking modal
    }

    hideTableLoading() {
        // No-op (no blocking modal)
    }

    showSkeleton() {
        const tbody = document.querySelector('#sensorDataTable tbody');
        if (!tbody) return;
        tbody.innerHTML = '';
        for (let i = 0; i < 5; i++) {
            const skeletonRow = document.createElement('tr');
            skeletonRow.className = 'skeleton-row';
            skeletonRow.innerHTML = `
                <td><div class="skeleton-cell"></div></td>
                <td><div class="skeleton-cell"></div></td>
                <td><div class="skeleton-cell"></div></td>
                <td><div class="skeleton-cell"></div></td>
                <td><div class="skeleton-cell"></div></td>
            `;
            tbody.appendChild(skeletonRow);
        }
    }


    isValidDateFormat(input) {
        if (!input || input.trim() === '') return true; // Empty input is valid
        
        const trimmedInput = input.trim();
        
        // Check for supported date formats
        const patterns = [
            /^\d{2}-\d{2}-\d{4}$/, // dd-MM-yyyy
            /^\d{2}-\d{2}-\d{4} \d{2}:\d{2}:\d{2}$/, // dd-MM-yyyy HH:mm:ss
            /^\d{2}-\d{2}-\d{4} \d{2}:\d{2}$/, // dd-MM-yyyy HH:mm
            /^\d{2}\/\d{2}\/\d{4}$/, // dd/MM/yyyy
            /^\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}:\d{2}$/, // dd/MM/yyyy HH:mm:ss
            /^\d{8}$/, // ddMMyyyy
            /^\d{6}$/ // ddMMyy
        ];
        
        // Check if input matches any supported pattern
        const matchesPattern = patterns.some(pattern => pattern.test(trimmedInput));
        if (!matchesPattern) return false;
        
        // Try to parse the date to ensure it's valid
        try {
            let date;
            if (trimmedInput.includes('-')) {
                // Handle dd-MM-yyyy format
                const parts = trimmedInput.split(' ');
                const datePart = parts[0];
                const timePart = parts[1] || '00:00:00';
                date = new Date(datePart.split('-').reverse().join('-') + ' ' + timePart);
            } else if (trimmedInput.includes('/')) {
                // Handle dd/MM/yyyy format
                const parts = trimmedInput.split(' ');
                const datePart = parts[0];
                const timePart = parts[1] || '00:00:00';
                const [day, month, year] = datePart.split('/');
                date = new Date(`${year}-${month}-${day} ${timePart}`);
            } else if (trimmedInput.length === 8) {
                // Handle ddMMyyyy format
                const day = trimmedInput.substring(0, 2);
                const month = trimmedInput.substring(2, 4);
                const year = trimmedInput.substring(4, 8);
                date = new Date(`${year}-${month}-${day}`);
            } else if (trimmedInput.length === 6) {
                // Handle ddMMyy format
                const day = trimmedInput.substring(0, 2);
                const month = trimmedInput.substring(2, 4);
                const year = '20' + trimmedInput.substring(4, 6);
                date = new Date(`${year}-${month}-${day}`);
            }
            
            return !isNaN(date.getTime());
        } catch (error) {
            return false;
        }
    }

    showToast(message, type = 'info') {
        // Map type to SweetAlert2 icon
        const iconMap = {
            'success': 'success',
            'error': 'error',
            'warning': 'warning',
            'info': 'info'
        };
        
        // Show SweetAlert2 toast
        const Toast = Swal.mixin({
            toast: true,
            position: 'top-end',
            showConfirmButton: false,
            timer: 3000,
            timerProgressBar: true,
            didOpen: (toast) => {
                toast.addEventListener('mouseenter', Swal.stopTimer);
                toast.addEventListener('mouseleave', Swal.resumeTimer);
            }
        });
        
        Toast.fire({
            icon: iconMap[type] || 'info',
            title: message
        });
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    new VanillaSensorDataManager();
});
