const API = {
  search: '/api/sensor-data/search',
};

let state = {
  page: 0,
  size: 20,
  totalPages: 1,
  totalItems: 0,
  fromDate: null,
  toDate: null,
};

async function fetchJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error('HTTP ' + res.status);
  return res.json();
}

function pad(n) { return String(n).padStart(2, '0'); }

// dd/MM/yyyy -> ddMMyyyy
function toApiDate(ddMmYyyy) {
  if (!ddMmYyyy) return null;
  const [d, m, y] = ddMmYyyy.split('/');
  return `${pad(d)}${pad(m)}${y}`;
}

function buildUrl() {
  const params = new URLSearchParams();
  params.append("page", state.page);
  params.append("size", state.size);

  if (state.fromDate && state.toDate) {
    params.append("fromDate", toApiDate(state.fromDate));
    params.append("toDate", toApiDate(state.toDate));
  } else if (state.fromDate) {
    params.append("date", toApiDate(state.fromDate));
  } else if (state.toDate) {
    params.append("date", toApiDate(state.toDate));
  }

  return `${API.search}?${params.toString()}`;
}

async function loadData() {
  try {
    const data = await fetchJson(buildUrl());
    state.totalPages = data.totalPages;
    state.totalItems = data.totalItems;
    renderTable(data.data);
    renderPagination();
  } catch (e) {
    console.error("Load data error:", e);
  }
}

function renderTable(items) {
  const tbody = document.getElementById("sensorTableBody");
  tbody.innerHTML = "";
  if (!items || items.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5">Không có dữ liệu</td></tr>`;
    return;
  }
  items.forEach((r, i) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${state.page * state.size + i + 1}</td>
      <td>${r.temperature ?? '--'}</td>
      <td>${r.humidity ?? '--'}</td>
      <td>${r.light ?? '--'}</td>
      <td>${r.recordedAt}</td>
    `;
    tbody.appendChild(tr);
  });
}

function renderPagination() {
  document.getElementById("pageInfo").textContent =
    `Trang ${state.page + 1} / ${state.totalPages || 1}`;
  document.getElementById("prevPage").disabled = state.page <= 0;
  document.getElementById("nextPage").disabled = state.page >= state.totalPages - 1;
}

function bindEvents() {
  document.getElementById("btnSearch").addEventListener("click", () => {
    state.fromDate = document.getElementById("fromDate").value;
    state.toDate = document.getElementById("toDate").value;
    state.size = parseInt(document.getElementById("pageSize").value);
    state.page = 0;
    loadData();
  });

  document.getElementById("pageSize").addEventListener("change", () => {
    state.size = parseInt(document.getElementById("pageSize").value);
    state.page = 0;
    loadData();
  });

  document.getElementById("prevPage").addEventListener("click", () => {
    if (state.page > 0) {
      state.page--;
      loadData();
    }
  });

  document.getElementById("nextPage").addEventListener("click", () => {
    if (state.page < state.totalPages - 1) {
      state.page++;
      loadData();
    }
  });
}

window.addEventListener("DOMContentLoaded", () => {
  // Khởi tạo Flatpickr tiếng Việt
  flatpickr("#fromDate", {
    dateFormat: "d/m/Y",
    locale: "vn"
  });
  flatpickr("#toDate", {
    dateFormat: "d/m/Y",
    locale: "vn"
  });

  bindEvents();
  loadData();
});
