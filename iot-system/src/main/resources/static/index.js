// -------- Config --------
const API_BASE = 'http://localhost:8081';
const DEVICES_API = `${API_BASE}/api/devices`;
const DEVICE_CMD_API = `${API_BASE}/api/devices/command`;
const SENSOR_API = `${API_BASE}/api/sensor-data`;
const WS_ENDPOINT = `${API_BASE}/ws`;
const TOPIC_SENSORS = `/topic/sensors`;

// -------- State --------
const windowSizes = {
  temperature: 15,
  humidity: 15,
  light: 15,
};

let charts = { temperature: null, humidity: null, light: null };
let deviceIdByToggleIndex = [null, null, null];

// -------- Utils --------
function pad2(n){ return n < 10 ? `0${n}` : `${n}`; }
function parseDateTime(ts) {
  if (!ts && ts !== 0) return null;
  if (ts instanceof Date) return isNaN(ts) ? null : ts;
  if (typeof ts === 'number') { const d = new Date(ts); return isNaN(d) ? null : d; }
  if (typeof ts === 'string') {
    // Try ISO first
    const iso = new Date(ts);
    if (!isNaN(iso)) return iso;
    // Try HH:mm:ss (assume today)
    const hm = ts.match(/^(\d{2}):(\d{2}):(\d{2})$/);
    if (hm) {
      const now = new Date();
      const [ , hh, mm, ss ] = hm;
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate(), Number(hh), Number(mm), Number(ss));
      return isNaN(d) ? null : d;
    }
    // Try dd-MM-yyyy HH:mm:ss
    const m = ts.match(/^(\d{2})-(\d{2})-(\d{4})\s+(\d{2}):(\d{2}):(\d{2})$/);
    if (m) {
      const [ , dd, MM, yyyy, hh, mm, ss ] = m;
      const d = new Date(
        Number(yyyy),
        Number(MM) - 1,
        Number(dd),
        Number(hh),
        Number(mm),
        Number(ss)
      );
      return isNaN(d) ? null : d;
    }
  }
  return null;
}
function fmtTime(ts) {
  const d = parseDateTime(ts);
  if (!d) return '--:--:--';
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`;
}
function select(id) { return document.getElementById(id); }
function highlightValue(el) {
  if (!el) return;
  el.classList.remove('updated');
  // reflow to restart animation
  // eslint-disable-next-line no-unused-expressions
  void el.offsetWidth;
  el.classList.add('updated');
}

// -------- Devices --------
async function loadDevices() {
  try {
    const res = await fetch(DEVICES_API);
    if (!res.ok) {
      throw new Error(`HTTP error! status: ${res.status}`);
    }
    const devices = await res.json();
    const firstThree = devices.slice(0, 3);

    firstThree.forEach((d, idx) => {
      deviceIdByToggleIndex[idx] = d.id;
      const toggle = select(`led${idx}-toggle`);
      if (toggle) {
        toggle.checked = d.state === 'ON';
        toggle.onchange = async (e) => {
          const action = e.target.checked ? 'ON' : 'OFF';
          try {
            const cmdRes = await fetch(DEVICE_CMD_API, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ deviceId: d.id, action })
            });
            if (!cmdRes.ok) {
              throw new Error(`Command failed: ${cmdRes.status}`);
            }
            console.log(`Device ${d.id} command sent: ${action}`);
          } catch (err) {
            console.error('Send command failed', err);
            // Revert toggle state on error
            e.target.checked = !e.target.checked;
          }
        };
      }
    });
  } catch (e) {
    console.error('Failed to load devices:', e);
  }
}

// -------- Charts --------
function createLineChart(ctx, label, color) {
  return new Chart(ctx, {
    type: 'line',
    data: { labels: [], datasets: [{
      label,
      data: [],
      tension: 0.35,
      borderColor: color,
      backgroundColor: color + '33',
      pointRadius: 2,
      fill: true,
    }] },
    options: {
      maintainAspectRatio: false,
      responsive: true,
      interaction: { intersect: false, mode: 'index' },
      plugins: { legend: { display: false } },
      scales: {
        x: {
          grid: { display: false },
          ticks: {
            autoSkip: true,
            maxRotation: 0,
            callback: function(value, index, ticks) {
              const lbl = this.getLabelForValue(value);
              // keep only time HH:mm:ss if label is full date
              const d = parseDateTime(lbl);
              return d ? `${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}` : lbl;
            }
          }
        },
        y: {
          beginAtZero: true,
          grid: { color: 'rgba(0,0,0,0.06)' }
        }
      }
    }
  });
}

function initCharts() {
  charts.temperature = createLineChart(select('tempChart'), 'Nhiệt độ (°C)', '#ef4444');
  charts.humidity = createLineChart(select('humChart'), 'Độ ẩm (%)', '#06b6d4');
  charts.light = createLineChart(select('lightChart'), 'Ánh sáng (Lux)', '#22c55e');
}

function updateSensorCards(latest) {
  if (!latest) return;
  // Normalize timestamp field across different payloads
  const ts = latest.recordedAt ?? latest.time ?? latest.timestamp ?? latest.createdAt;
  const withTs = { ...latest, recordedAt: ts };
  
  if (typeof latest.temperature === 'number' && !isNaN(latest.temperature)) {
    const el = select('box-temp');
    el.textContent = latest.temperature.toFixed(1);
    highlightValue(el);
    select('box-temp-time').textContent = fmtTime(withTs.recordedAt);
  } else {
    select('box-temp').textContent = '--';
    select('box-temp-time').textContent = fmtTime(withTs.recordedAt);
  }
  
  if (typeof latest.humidity === 'number' && !isNaN(latest.humidity)) {
    const el = select('box-hum');
    el.textContent = latest.humidity.toFixed(1);
    highlightValue(el);
    select('box-hum-time').textContent = fmtTime(withTs.recordedAt);
  } else {
    select('box-hum').textContent = '--';
    select('box-hum-time').textContent = fmtTime(withTs.recordedAt);
  }
  
  if (typeof latest.light === 'number' && !isNaN(latest.light)) {
    const el = select('box-light');
    el.textContent = `${Math.round(latest.light)}`;
    highlightValue(el);
    select('box-light-time').textContent = fmtTime(withTs.recordedAt);
  } else {
    select('box-light').textContent = '--';
    select('box-light-time').textContent = fmtTime(withTs.recordedAt);
  }
}

function fillChartsFromList(list) {
  // list newest-first -> make oldest-first
  const ordered = [...list].reverse();
  const labels = ordered.map(r => fmtTime(r.recordedAt));
  const temps = ordered.map(r => r.temperature);
  const hums = ordered.map(r => r.humidity);
  const lights = ordered.map(r => r.light);

  function apply(chart, labelsArr, dataArr, limit) {
    chart.data.labels = labelsArr.slice(-limit);
    chart.data.datasets[0].data = dataArr.slice(-limit);
    chart.update();
  }

  apply(charts.temperature, labels, temps, windowSizes.temperature);
  apply(charts.humidity, labels, hums, windowSizes.humidity);
  apply(charts.light, labels, lights, windowSizes.light);
}

async function loadInitialSensorData() {
  const maxSize = Math.max(windowSizes.temperature, windowSizes.humidity, windowSizes.light);
  try {
    const res = await fetch(`${SENSOR_API}?page=0&size=${maxSize}`);
    if (!res.ok) {
      throw new Error(`Sensor data fetch failed: ${res.status}`);
    }
    const paged = await res.json();
    const list = Array.isArray(paged.data) ? paged.data : [];
    fillChartsFromList(list);
    if (list[0]) {
      updateSensorCards(list[0]);
    } else {
      // Nếu không có dữ liệu, hiển thị thời gian hiện tại thay vì --:--:--
      const now = new Date();
      const fake = { recordedAt: now, temperature: NaN, humidity: NaN, light: NaN };
      updateSensorCards(fake);
    }
  } catch (e) {
    console.error('Failed to load initial sensor data:', e);
    // Show current time even on error
    const now = new Date();
    const fake = { recordedAt: now, temperature: NaN, humidity: NaN, light: NaN };
    updateSensorCards(fake);
  }
}

function appendRealtimePoint(msg) {
  const ts = msg.recordedAt ?? msg.time ?? msg.timestamp ?? msg.createdAt;
  const label = fmtTime(ts);
  const { temperature, humidity, light } = msg;

  function push(chart, value, limit) {
    const labels = chart.data.labels;
    const data = chart.data.datasets[0].data;
    labels.push(label);
    data.push(value);
    while (labels.length > limit) labels.shift();
    while (data.length > limit) data.shift();
    chart.update();
  }

  if (typeof temperature === 'number') push(charts.temperature, temperature, windowSizes.temperature);
  if (typeof humidity === 'number') push(charts.humidity, humidity, windowSizes.humidity);
  if (typeof light === 'number') push(charts.light, light, windowSizes.light);

  updateSensorCards({ ...msg, recordedAt: ts });
}

// -------- WebSocket --------
let stompClient = null;
function connectWS() {
  try {
    const sock = new SockJS(WS_ENDPOINT);
    stompClient = Stomp.over(sock);
    stompClient.debug = () => {};
    stompClient.connect({}, () => {
      console.log('WebSocket connected successfully');
      stompClient.subscribe(TOPIC_SENSORS, (frame) => {
        try { 
          appendRealtimePoint(JSON.parse(frame.body)); 
        } catch (e) { 
          console.warn('Bad WS payload', e); 
        }
      });
    }, (err) => {
      console.error('WS connection error', err);
      // Retry connection after 5 seconds
      setTimeout(connectWS, 5000);
    });
  } catch (error) {
    console.error('Failed to create WebSocket connection', error);
    // Retry connection after 5 seconds
    setTimeout(connectWS, 5000);
  }
}

// -------- UI bindings --------
function bindWindowSelectors() {
  select('temp-window').addEventListener('change', async (e) => {
    windowSizes.temperature = parseInt(e.target.value, 10);
    await loadInitialSensorData();
  });
  select('hum-window').addEventListener('change', async (e) => {
    windowSizes.humidity = parseInt(e.target.value, 10);
    await loadInitialSensorData();
  });
  select('light-window').addEventListener('change', async (e) => {
    windowSizes.light = parseInt(e.target.value, 10);
    await loadInitialSensorData();
  });
}

// -------- Bootstrap --------
window.addEventListener('DOMContentLoaded', async () => {
  initCharts();
  bindWindowSelectors();
  await Promise.all([loadDevices(), loadInitialSensorData()]);
  connectWS();
});
