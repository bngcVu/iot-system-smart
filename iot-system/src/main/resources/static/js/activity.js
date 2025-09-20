class ActivityManager {
    constructor() {
        this.currentPage = 0;
        this.pageSize = 15;
        this.totalPages = 0;
        this.totalElements = 0;
        this.currentData = [];
        this.isLoading = false;
        
        this.initializeElements();
        this.bindEvents();
        this.loadData();
    }

    initializeElements() {
        this.searchInput = document.getElementById('searchInput');
        this.sortSelect = document.getElementById('sortSelect');
        this.deviceFilter = document.getElementById('deviceFilter');
        this.searchBtn = document.getElementById('searchBtn');
        this.pageSizeSelect = document.getElementById('pageSizeSelect');
        this.table = document.getElementById('activityDataTable');
        this.tbody = this.table.querySelector('tbody');
        this.recordCount = document.getElementById('recordCount');
        
        // Bottom pagination controls
        this.prevPageBtn = document.getElementById('prevPageBottom');
        this.nextPageBtn = document.getElementById('nextPageBottom');
        this.pageNumbers = document.getElementById('pageNumbersBottom');
        this.toast = document.getElementById('toast');
    }

    bindEvents() {
        this.searchBtn.addEventListener('click', () => this.handleSearch());
        this.searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.handleSearch();
        });
        
        this.sortSelect.addEventListener('change', () => this.handleSearch());
        this.deviceFilter.addEventListener('change', () => this.handleSearch());
        this.pageSizeSelect.addEventListener('change', () => this.handlePageSizeChange());
        
        this.prevPageBtn.addEventListener('click', () => this.goToPreviousPage());
        this.nextPageBtn.addEventListener('click', () => this.goToNextPage());
        
        // No need for alignment fix with history table CSS
        
    }

    async loadData() {
        if (this.isLoading) return;
        
        this.isLoading = true;
        this.showLoading();
        
        try {
            // Wait for 2 seconds to show loading effect
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            const params = new URLSearchParams({
                page: this.currentPage,
                size: this.pageSize,
                sort: this.sortSelect.value
            });

            const searchValue = this.searchInput.value.trim();
            if (searchValue) {
                params.append('dateStr', searchValue);
            }

            const deviceValue = this.deviceFilter.value;
            if (deviceValue) {
                params.append('deviceName', deviceValue);
            }

            const response = await fetch(`/api/device-actions/search?${params}`);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            this.handleDataResponse(data);
            
        } catch (error) {
            console.error('Error loading activity data:', error);
            this.showToast('Lỗi khi tải dữ liệu: ' + error.message, 'error');
            this.renderEmptyTable();
        } finally {
            this.isLoading = false;
            this.hideLoading();
        }
    }

    handleDataResponse(data) {
        this.currentData = data.data || [];
        this.totalElements = data.totalElements || 0;
        this.totalPages = data.totalPages || 0;
        
        // Debug: Log first item to see the data structure
        if (this.currentData.length > 0) {
            console.log('First activity item:', this.currentData[0]);
            console.log('ExecutedAt value:', this.currentData[0].executedAt);
            console.log('ExecutedAt type:', typeof this.currentData[0].executedAt);
        }
        
        this.updatePaginationInfo();
        this.renderTable();
        this.updatePaginationButtons();
        
        // No need for alignment fix with history table CSS
    }

    renderTable() {
        this.tbody.innerHTML = '';
        
        if (this.currentData.length === 0) {
            this.renderEmptyTable();
            return;
        }

        this.currentData.forEach((item, index) => {
            const row = this.createTableRow(item, index);
            this.tbody.appendChild(row);
        });
        
        // Smooth animation for table rows
        this.animateTableRows();
    }

    animateTableRows() {
        const rows = document.querySelectorAll('#activityDataTable tbody tr');
        
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

    createTableRow(item, index) {
        const row = document.createElement('tr');
        row.className = 'activity-row';
        
        const stt = this.currentPage * this.pageSize + index + 1;
        const actionClass = this.getActionClass(item.action);
        const actionText = this.getActionText(item.action);
        const formattedTime = this.formatDateTime(item.executedAt);
        
        row.innerHTML = `
            <td>${stt}</td>
            <td>
                <div class="device-name">
                    <span class="device-icon">${this.getDeviceIcon(item.deviceName)}</span>
                    ${item.deviceName}
                </div>
            </td>
            <td>
                <span class="action-badge ${actionClass}">${actionText}</span>
            </td>
            <td>
                <div class="time-info">
                    <div class="time-main">${formattedTime}</div>
                </div>
            </td>
        `;
        
        return row;
    }

    getDeviceIcon(deviceName) {
        const icons = {
            'LIGHT': '💡',
            'FAN': '🌀',
            'AIR': '❄️'
        };
        return icons[deviceName] || '📱';
    }

    getActionClass(action) {
        const classes = {
            'ON': 'action-on',
            'OFF': 'action-off'
        };
        return classes[action] || 'action-unknown';
    }

    getActionText(action) {
        const texts = {
            'ON': 'BẬT',
            'OFF': 'TẮT'
        };
        return texts[action] || action;
    }

    formatDateTime(dateTimeStr) {
        if (!dateTimeStr) return '--:--:--';
        
        console.log('Formatting date:', dateTimeStr, 'Type:', typeof dateTimeStr);
        
        try {
            // Handle dd-MM-yyyy HH:mm:ss format from backend (expected format)
            if (typeof dateTimeStr === 'string' && dateTimeStr.includes('-')) {
                const parts = dateTimeStr.split(' ');
                if (parts.length === 2) {
                    const datePart = parts[0].split('-');
                    const timePart = parts[1].split(':');
                    
                    if (datePart.length === 3 && timePart.length === 3) {
                        // Create date: year-month-day hour:minute:second
                        const year = datePart[2];
                        const month = datePart[1];
                        const day = datePart[0];
                        const hour = timePart[0];
                        const minute = timePart[1];
                        const second = timePart[2];
                        
                        const isoString = `${year}-${month}-${day}T${hour}:${minute}:${second}`;
                        console.log('Created ISO string:', isoString);
                        
                        const date = new Date(isoString);
                        console.log('Parsed date:', date);
                        
                        if (!isNaN(date.getTime())) {
                            // Return in the same format as backend: dd-MM-yyyy HH:mm:ss
                            const formatted = `${day}-${month}-${year} ${hour}:${minute}:${second}`;
                            console.log('Formatted result:', formatted);
                            return formatted;
                        }
                    }
                }
            }
            
            // Handle HH:mm:ss dd/MM/yyyy format (if backend returns this format)
            if (typeof dateTimeStr === 'string' && dateTimeStr.includes('/')) {
                const parts = dateTimeStr.split(' ');
                if (parts.length === 2) {
                    const timePart = parts[0].split(':');
                    const datePart = parts[1].split('/');
                    
                    if (timePart.length === 3 && datePart.length === 3) {
                        const year = datePart[2];
                        const month = datePart[1];
                        const day = datePart[0];
                        const hour = timePart[0];
                        const minute = timePart[1];
                        const second = timePart[2];
                        
                        const isoString = `${year}-${month}-${day}T${hour}:${minute}:${second}`;
                        const date = new Date(isoString);
                        
                        if (!isNaN(date.getTime())) {
                            // Convert to dd-MM-yyyy HH:mm:ss format
                            return `${day}-${month}-${year} ${hour}:${minute}:${second}`;
                        }
                    }
                }
            }
            
            // Fallback to standard Date parsing
            const date = new Date(dateTimeStr);
            console.log('Fallback parsed date:', date);
            
            if (!isNaN(date.getTime())) {
                // Format as dd-MM-yyyy HH:mm:ss
                const day = String(date.getDate()).padStart(2, '0');
                const month = String(date.getMonth() + 1).padStart(2, '0');
                const year = date.getFullYear();
                const hour = String(date.getHours()).padStart(2, '0');
                const minute = String(date.getMinutes()).padStart(2, '0');
                const second = String(date.getSeconds()).padStart(2, '0');
                
                const formatted = `${day}-${month}-${year} ${hour}:${minute}:${second}`;
                console.log('Fallback formatted result:', formatted);
                return formatted;
            }
            
            // If all parsing fails, return original string
            console.log('All parsing failed, returning original:', dateTimeStr);
            return dateTimeStr;
        } catch (error) {
            console.error('Error formatting date:', dateTimeStr, error);
            return dateTimeStr;
        }
    }

    renderEmptyTable() {
        this.tbody.innerHTML = `
            <tr>
                <td colspan="4" class="no-data">
                    <div style="text-align: center; padding: 2rem;">
                        <div style="font-size: 3rem; margin-bottom: 1rem;">📋</div>
                        <div>Không có dữ liệu lịch sử hoạt động</div>
                        <div style="font-size: 0.9rem; color: var(--text-secondary); margin-top: 0.5rem;">
                            Thử thay đổi bộ lọc hoặc tìm kiếm
                        </div>
                    </div>
                </td>
            </tr>
        `;
    }

    updatePaginationInfo() {
        const start = this.currentPage * this.pageSize + 1;
        const end = Math.min(start + this.currentData.length - 1, this.totalElements);
        this.recordCount.textContent = `Hiển thị ${start}-${end} trong ${this.totalElements} bản ghi (trang ${this.currentPage + 1}/${this.totalPages})`;
    }

    updatePaginationButtons() {
        this.prevPageBtn.disabled = this.currentPage === 0;
        this.nextPageBtn.disabled = this.currentPage >= this.totalPages - 1;
        
        this.renderPageNumbers();
    }

    renderPageNumbers() {
        this.pageNumbers.innerHTML = '';
        
        const maxVisiblePages = 5;
        let startPage = Math.max(0, this.currentPage - Math.floor(maxVisiblePages / 2));
        let endPage = Math.min(this.totalPages - 1, startPage + maxVisiblePages - 1);
        
        if (endPage - startPage + 1 < maxVisiblePages) {
            startPage = Math.max(0, endPage - maxVisiblePages + 1);
        }
        
        for (let i = startPage; i <= endPage; i++) {
            const pageBtn = document.createElement('button');
            pageBtn.className = `page-number ${i === this.currentPage ? 'active' : ''}`;
            pageBtn.textContent = i + 1;
            pageBtn.addEventListener('click', () => this.goToPage(i));
            
            this.pageNumbers.appendChild(pageBtn);
        }
    }

    goToPage(page) {
        if (page >= 0 && page < this.totalPages && page !== this.currentPage) {
            this.currentPage = page;
            this.loadData();
        }
    }

    goToPreviousPage() {
        if (this.currentPage > 0) {
            this.goToPage(this.currentPage - 1);
        }
    }

    goToNextPage() {
        if (this.currentPage < this.totalPages - 1) {
            this.goToPage(this.currentPage + 1);
        }
    }

    handleSearch() {
        this.currentPage = 0;
        this.loadData();
    }

    handlePageSizeChange() {
        this.pageSize = parseInt(this.pageSizeSelect.value);
        this.currentPage = 0;
        this.loadData();
    }

    showLoading() {
        this.searchBtn.classList.add('loading');
        this.searchBtn.querySelector('.btn-text').style.display = 'none';
        this.searchBtn.querySelector('.btn-loading').style.display = 'inline';
        
        // Clear table body
        this.tbody.innerHTML = '';
        
        // Show SweetAlert2 loading for 2 seconds only
        Swal.fire({
            title: 'Đang tải dữ liệu...',
            text: 'Vui lòng chờ trong giây lát',
            allowOutsideClick: false,
            allowEscapeKey: false,
            showConfirmButton: false,
            timer: 800, // Auto close after 2 seconds
            timerProgressBar: true,
            didOpen: () => {
                Swal.showLoading();
            }
        });
    }

    hideLoading() {
        this.searchBtn.classList.remove('loading');
        this.searchBtn.querySelector('.btn-text').style.display = 'inline';
        this.searchBtn.querySelector('.btn-loading').style.display = 'none';
        
        // Close SweetAlert2 loading
        Swal.close();
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

document.addEventListener('DOMContentLoaded', () => {
    new ActivityManager();
});
