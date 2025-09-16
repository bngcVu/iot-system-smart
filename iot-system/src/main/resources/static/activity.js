const API_BASE = "http://localhost:8081";
const ACTION_API = `${API_BASE}/api/device-actions/search`;

const state = {
  page: 0, size: 15, totalPages: 1,
  date: '', fromDate: '', toDate: '', deviceName: '', action: '', sort: 'desc'
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
    if(m){ const[,dd,MM,yyyy,hh,mm,ss]=m; const d=new Date(Number(yyyy),Number(MM)-1,Number(dd),Number(hh),Number(mm),Number(ss)); return isNaN(d)?null:d; }
  }
  return null;
}
function fmtDateTime(ts){
  const d=parseDateTime(ts);
  if(!d) return '--';
  return `${pad(d.getDate())}-${pad(d.getMonth()+1)}-${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

function normalizeDate(input){
  if(!input) return '';
  const raw = input.trim();
  if(/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(raw)){
    const [d,m,y] = raw.split('/');
    return `${pad(Number(d))}${pad(Number(m))}${y}`;
  }
  if(/^\d{7,8}$/.test(raw)){
    if(raw.length===7){
      const d=raw.slice(0,1), m=raw.slice(1,2), y=raw.slice(2);
      return `${pad(Number(d))}${pad(Number(m))}${y}`;
    }
    return raw;
  }
  return '';
}

async function fetchData(){
  const params=new URLSearchParams();
  params.set('page', state.page);
  params.set('size', state.size);
  params.set('sort', state.sort);
  // Ưu tiên khoảng ngày nếu có; nếu không thì dùng 1 ngày
  const hasRange = !!(state.fromDate || state.toDate);
  if(hasRange){
    if(state.fromDate) params.set('fromDate', normalizeDate(state.fromDate));
    if(state.toDate) params.set('toDate', normalizeDate(state.toDate));
  } else if(state.date){
    params.set('date', normalizeDate(state.date));
  }
  if(state.deviceName){ params.set('deviceName', state.deviceName); }
  if(state.action){ params.set('action', state.action); }
  const res=await fetch(`${ACTION_API}?${params.toString()}`);
  return res.json();
}

function renderRows(items){
  const tbody=document.querySelector('#historyTable tbody');
  tbody.innerHTML='';
  if(!items.length){
    tbody.innerHTML='<tr><td colspan="4" class="muted">Không có dữ liệu</td></tr>';
    return;
  }
  items.forEach(r=>{
    const tr=document.createElement('tr');
    tr.innerHTML=`
      <td>${r.stt??'--'}</td>
      <td>${fmtDateTime(r.executedAt)}</td>
      <td>${r.deviceName??'--'}</td>
      <td>${r.action??'--'}</td>`;
    tbody.appendChild(tr);
  });
}

function renderPager(totalPages){
  document.getElementById('pageInfo').textContent=`Trang ${state.page+1} / ${totalPages}`;
  document.getElementById('prevBtn').disabled=state.page<=0;
  document.getElementById('nextBtn').disabled=state.page>=totalPages-1;
}

async function loadPage(goTo=null){
  if(goTo!=null) state.page=goTo;
  const resp=await fetchData();
  const items=resp.data??[];
  state.totalPages=resp.totalPages??1;
  renderRows(items);
  renderPager(state.totalPages);
}

window.addEventListener('DOMContentLoaded',()=>{
  if(window.flatpickr){
    flatpickr('#date',{
      locale: window.flatpickr.l10ns.vn,
      dateFormat:'d/m/Y',
      allowInput:true,
      onChange:(sel, str)=>{ state.date = str; }
    });
    const fromPicker = flatpickr('#fromDate',{
      locale: window.flatpickr.l10ns.vn,
      dateFormat:'d/m/Y', clickOpens:false, allowInput:true,
      onChange:(sel, str)=>{ state.fromDate = str; }
    });
    const toPicker = flatpickr('#toDate',{
      locale: window.flatpickr.l10ns.vn,
      dateFormat:'d/m/Y', clickOpens:false, allowInput:true,
      onChange:(sel, str)=>{ state.toDate = str; }
    });
    const fromBtn=document.getElementById('fromDateBtn'); if(fromBtn) fromBtn.onclick=()=>fromPicker.open();
    const toBtn=document.getElementById('toDateBtn'); if(toBtn) toBtn.onclick=()=>toPicker.open();
  }
  $('deviceName').oninput=e=>state.deviceName=e.target.value;
  $('action').onchange=e=>state.action=e.target.value;
  $('pageSize').onchange=e=>{ state.size=+e.target.value; loadPage(0); };
  const sortSelect=document.getElementById('sortOrder');
  if(sortSelect){
    sortSelect.value=state.sort;
    sortSelect.onchange=e=>{ state.sort=e.target.value; state.page=0; loadPage(0); };
  }

  $('btnApply').onclick=()=>loadPage(0);
  $('btnReset').onclick=()=>{
    state.page=0; state.size=15;
    state.date=''; state.fromDate=''; state.toDate='';
    state.deviceName=''; state.action='';
    $('date').value=''; $('fromDate').value=''; $('toDate').value='';
    $('deviceName').value=''; $('action').value='';
    $('pageSize').value=15;
    loadPage(0);
  };

  $('prevBtn').onclick=()=>loadPage(state.page-1);
  $('nextBtn').onclick=()=>loadPage(state.page+1);

  loadPage(0);
});


