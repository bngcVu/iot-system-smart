const API_BASE = "http://localhost:8081";
const SENSOR_API = `${API_BASE}/api/sensor-data/search`;

const state = {
  page: 0, size: 15, totalPages: 1,
  fromDate: '', toDate: '',
  searchDate: '',
  sort: 'desc',
  lastData: []
};

function $(id){ return document.getElementById(id); }
function pad(n){ return String(n).padStart(2,'0'); }
function parseDateTime(ts){
  if(!ts && ts!==0) return null;
  if(ts instanceof Date) return isNaN(ts)?null:ts;
  if(typeof ts==='number'){ const d=new Date(ts); return isNaN(d)?null:d; }
  if(typeof ts==='string'){
    const iso=new Date(ts);
    if(!isNaN(iso)) return iso;
    const m=ts.match(/^(\d{2})-(\d{2})-(\d{4})\s+(\d{2}):(\d{2}):(\d{2})$/);
    if(m){
      const[,dd,MM,yyyy,hh,mm,ss]=m;
      const d=new Date(Number(yyyy),Number(MM)-1,Number(dd),Number(hh),Number(mm),Number(ss));
      return isNaN(d)?null:d;
    }
  }
  return null;
}
function fmtDateTime(ts){
  const d=parseDateTime(ts);
  if(!d) return '--';
  return `${pad(d.getDate())}-${pad(d.getMonth()+1)}-${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}
function toApiDate(yyyyMmDd){
  if(!yyyyMmDd) return null;
  const [y,m,d] = yyyyMmDd.split('-');
  return `${pad(d)}${pad(m)}${y}`;
}

async function fetchData(){
  const params = new URLSearchParams();
  params.set('page', state.page);
  params.set('size', state.size);
  params.set('sort', state.sort);
  // Ưu tiên khoảng ngày nếu người dùng nhập; nếu không thì dùng 1 ngày (searchDate)
  const norm = normalizeSearchDate(state.searchDate);
  const hasRange = !!(state.fromDate || state.toDate);
  if(hasRange){
    if(state.fromDate) params.set('fromDate', toApiDate(state.fromDate));
    if(state.toDate) params.set('toDate', toApiDate(state.toDate));
  } else if(norm){
    params.set('date', norm);
  }
  const res = await fetch(`${SENSOR_API}?${params.toString()}`);
  return res.json();
}

// No FE-only filtering; backend controls the result set

function renderRows(items){
  const tbody=document.querySelector('#sensorTable tbody');
  tbody.innerHTML='';
  if(!items.length){
    const colspan = 1 + getVisibleColumns().length; // +1 for STT
    tbody.innerHTML=`<tr><td colspan="${colspan}" class="muted">Không có dữ liệu</td></tr>`;
    return;
  }
  const cols = getVisibleColumns();
  items.forEach((r, idx)=>{
    const tr=document.createElement('tr');
    const stt = state.page * state.size + idx + 1;
    const cells = [`<td>${stt}</td>`].concat(cols.map(c=>{
      if(c==='time') return `<td>${fmtDateTime(r.recordedAt)}</td>`;
      if(c==='temperature') return `<td>${r.temperature??'--'}</td>`;
      if(c==='humidity') return `<td>${r.humidity??'--'}</td>`;
      if(c==='light') return `<td>${r.light??'--'}</td>`;
      return '';
    })).join('');
    tr.innerHTML = cells;
    tbody.appendChild(tr);
  });
}

function renderPager(totalPages){
  $('pageInfo').textContent=`Trang ${state.page+1} / ${totalPages}`;
  $('prevBtn').disabled=state.page<=0;
  $('nextBtn').disabled=state.page>=totalPages-1;
}

function getVisibleColumns(){
  return ['time','temperature','humidity','light'];
}

function renderTableHead(){
  const thead=document.querySelector('#sensorTable thead');
  const cols = getVisibleColumns();
  const headerMap = {
    stt: 'STT',
    time: 'Thời gian',
    temperature: 'Nhiệt độ (°C)',
    humidity: 'Độ ẩm (%)',
    light: 'Ánh sáng (Lux)'
  };
  const ths = ['stt'].concat(cols).map(c=>`<th>${headerMap[c]}</th>`).join('');
  thead.innerHTML = `<tr>${ths}</tr>`;
}

// No chart rendering. We only display the table.

function normalizeSearchDate(input){
  if(!input) return '';
  const raw = input.trim();
  // dd/mm/yyyy -> ddMMyyyy
  const slash = raw.match(/^\d{1,2}\/\d{1,2}\/\d{4}$/);
  if(slash){
    const [d,m,y] = raw.split('/');
    const dd = pad(Number(d));
    const mm = pad(Number(m));
    return `${dd}${mm}${y}`;
  }
  // ddMMyyyy (7-8 chars with possible leading 0)
  const compact = raw.match(/^\d{7,8}$/);
  if(compact){
    // ensure dd and mm have leading zeros when needed
    if(raw.length===7){
      // e.g., 1092025 (1/09/2025) -> 01092025
      const d = raw.slice(0,1);
      const m = raw.slice(1,2);
      const y = raw.slice(2);
      return `${pad(Number(d))}${pad(Number(m))}${y}`;
    }
    if(raw.length===8){
      return raw;
    }
  }
  return '';
}

async function loadPage(goTo=null){
  if(goTo!=null) state.page=goTo;
  const resp=await fetchData();
  const items=resp.data??[];
  state.totalPages=resp.totalPages??1;
  // Reset buffer for realtime when reloading a page with possibly different order
  state.lastData = items.slice(0, state.size);
  renderTableHead();
  renderRows(items);
  renderPager(state.totalPages);
}

function connectWS(){
  const socket=new SockJS(`${API_BASE}/ws`);
  const client=Stomp.over(socket);
  client.connect({},()=>{
    client.subscribe('/topic/sensors',msg=>{
      // Chỉ cập nhật realtime khi đang xem trang đầu và sắp xếp Mới nhất (desc)
      if(!(state.sort==='desc' && state.page===0)){
        return;
      }
      const d=JSON.parse(msg.body);
      const row={
        recordedAt:d.time, temperature:d.temperature,
        humidity:d.humidity, light:d.light
      };
      state.lastData.unshift(row);
      state.lastData=state.lastData.slice(0,state.size);
      renderRows(state.lastData);
      const firstRow=document.querySelector('#sensorTable tbody tr');
      if(firstRow) firstRow.classList.add('new');
    });
  });
}

window.addEventListener('DOMContentLoaded',()=>{
  if(window.flatpickr){
    const fromPicker = flatpickr('#fromDate', {
      locale: window.flatpickr.l10ns.vn,
      dateFormat: 'Y-m-d',
      altInput: true,
      altFormat: 'd/m/Y',
      clickOpens: false,
      allowInput: true,
      onChange: (sel)=>{ state.fromDate = sel[0] ? formatYmd(sel[0]) : ''; }
    });
    const toPicker = flatpickr('#toDate', {
      locale: window.flatpickr.l10ns.vn,
      dateFormat: 'Y-m-d',
      altInput: true,
      altFormat: 'd/m/Y',
      clickOpens: false,
      allowInput: true,
      onChange: (sel)=>{ state.toDate = sel[0] ? formatYmd(sel[0]) : ''; }
    });
    const fromBtn=$('fromDateBtn'); if(fromBtn) fromBtn.onclick=()=>fromPicker.open();
    const toBtn=$('toDateBtn'); if(toBtn) toBtn.onclick=()=>toPicker.open();
  } else {
    $('fromDate').onchange=e=>state.fromDate=e.target.value;
    $('toDate').onchange=e=>state.toDate=e.target.value;
  }
  const searchInput = $('searchDate');
  if(searchInput){
    searchInput.oninput=e=>state.searchDate=e.target.value;
  }
  // Removed unsupported metric/min-max filters
  $('pageSize').onchange=e=>{state.size=+e.target.value; loadPage(0);};
  const sortSelect = $('sortOrder');
  if(sortSelect){
    // Đồng bộ UI với state ban đầu
    sortSelect.value = state.sort;
    sortSelect.onchange=e=>{
      state.sort = e.target.value;
      state.page = 0;
      state.lastData = [];
      loadPage(0);
    };
  }

  $('btnApply').onclick=()=>loadPage(0);
  $('btnReset').onclick=()=>{
    state.page=0; state.size=15;
    state.fromDate=state.toDate=state.searchDate='';
    state.sort='desc';
    $('fromDate').value=$('toDate').value='';
    if(searchInput) searchInput.value='';
    $('pageSize').value=15;
    if(sortSelect) sortSelect.value='desc';
    loadPage(0);
  };

  $('prevBtn').onclick=()=>loadPage(state.page-1);
  $('nextBtn').onclick=()=>loadPage(state.page+1);

  loadPage(0);
  connectWS();
});

function formatYmd(d){
  const yyyy = d.getFullYear();
  const mm = pad(d.getMonth()+1);
  const dd = pad(d.getDate());
  return `${yyyy}-${mm}-${dd}`;
}
