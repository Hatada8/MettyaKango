/* 家族画面：面談予約のカレンダー
   ・日付ごとに「予約できる時間の数」を表示（満員・受付なし・過去日はグレー）
   ・日付をタップ → その日の空き時間がボタンで並ぶ → 時間をタップして選択
   選んだ日時は非表示の #apptDate / #apptTime に入り、submitAppointment() が使います。 */
let calMonth = null;          // { y, m(0-11) } 表示中の月
let calData = { map:{}, booked:[] };
let calFirstLoadDone = false;

const CAL_WEEK = ['日','月','火','水','木','金','土'];
function calPad(n){ return String(n).padStart(2,'0'); }
function calYmd(y, m, d){ return `${y}-${calPad(m+1)}-${calPad(d)}`; }
function calLabel(dateStr){
  const [y,m,d] = dateStr.split('-').map(Number);
  return `${m}月${d}日（${CAL_WEEK[new Date(y, m-1, d).getDay()]}）`;
}

/* その日に予約できる時間（満員の枠・過ぎた時間は除く） */
function calAvailableTimes(dateStr){
  const today = todayISO();
  if(dateStr < today) return [];
  const entry = calData.map[dateStr];
  if(!entry || !entry.slots || entry.slots.length === 0) return [];
  const cap = entry.capacity || 1;
  const count = {};
  calData.booked.filter(b => b.date === dateStr).forEach(b => { count[b.time] = (count[b.time] || 0) + 1; });
  const nowStr = nowTimeStr();
  return entry.slots.filter(t => (count[t] || 0) < cap && (dateStr !== today || t > nowStr));
}

async function refreshApptTimeOptions(){
  const dateInput = document.getElementById('apptDate');
  if(!dateInput || !document.getElementById('calGrid')) return;
  if(!calMonth){
    const t = new Date();
    calMonth = { y:t.getFullYear(), m:t.getMonth() };
  }
  const { y, m } = calMonth;
  const last = new Date(y, m+1, 0).getDate();
  const [map, booked] = await Promise.all([
    fetchScheduleMap(),
    getAppointmentsInRange(calYmd(y,m,1), calYmd(y,m,last))
  ]);
  calData = { map, booked };

  // 初回だけ：今日に空きがなければ、今月で一番近い空き日を自動で選ぶ
  if(!calFirstLoadDone){
    calFirstLoadDone = true;
    const today = todayISO();
    if(calAvailableTimes(today).length === 0){
      for(let d = 1; d <= last; d++){
        const ds = calYmd(y,m,d);
        if(ds > today && calAvailableTimes(ds).length > 0){ dateInput.value = ds; break; }
      }
    }
  }
  renderCalendar();
  renderCalTimes();
}

function renderCalendar(){
  const { y, m } = calMonth;
  const today = todayISO();
  const selected = document.getElementById('apptDate').value;
  document.getElementById('calTitle').textContent = `${y}年${m+1}月`;
  const nowD = new Date();
  document.getElementById('calPrev').disabled = (y === nowD.getFullYear() && m === nowD.getMonth());

  const firstDow = new Date(y, m, 1).getDay();
  const last = new Date(y, m+1, 0).getDate();
  let html = '';
  for(let i = 0; i < firstDow; i++) html += '<div class="cal-cell blank"></div>';
  for(let d = 1; d <= last; d++){
    const ds = calYmd(y,m,d);
    const entry = calData.map[ds];
    const hasSlots = entry && entry.slots && entry.slots.length > 0;
    const n = calAvailableTimes(ds).length;
    let cls = 'none', mark = '', clickable = false;
    if(ds < today){ cls = 'past'; }
    else if(!hasSlots){ cls = 'none'; }
    else if(n === 0){ cls = 'full'; mark = '満'; }
    else { cls = 'open'; mark = String(n); clickable = true; }
    if(ds === today) cls += ' today';
    if(ds === selected) cls += ' selected';
    html += clickable
      ? `<button type="button" class="cal-cell ${cls}" onclick="calSelectDate('${ds}')" aria-label="${calLabel(ds)} 予約できる時間${n}件"><span class="d">${d}</span><span class="m">${mark}</span></button>`
      : `<div class="cal-cell ${cls}"><span class="d">${d}</span><span class="m">${mark}</span></div>`;
  }
  document.getElementById('calGrid').innerHTML = html;
}

function renderCalTimes(){
  const date = document.getElementById('apptDate').value;
  const timeInput = document.getElementById('apptTime');
  const title = document.getElementById('calTimesTitle');
  const box = document.getElementById('calTimeChips');
  if(!date){
    title.textContent = 'カレンダーから日にちを選んでください';
    box.innerHTML = '';
    return;
  }
  const times = calAvailableTimes(date);
  if(!times.includes(timeInput.value)) timeInput.value = ''; // 埋まった時間は選択を解除
  if(times.length === 0){
    title.textContent = `${calLabel(date)}`;
    box.innerHTML = '<div class="cal-empty">この日は予約できる時間がありません。別の日をお選びください。</div>';
    return;
  }
  title.textContent = timeInput.value
    ? `選択中：${calLabel(date)} ${timeInput.value}`
    : `${calLabel(date)} の空き時間`;
  box.innerHTML = times.map(t =>
    `<button type="button" class="cal-time-chip ${t === timeInput.value ? 'selected' : ''}" onclick="calSelectTime('${t}')">${t}</button>`
  ).join('');
}

function calSelectDate(ds){
  document.getElementById('apptDate').value = ds;
  document.getElementById('apptTime').value = '';
  renderCalendar();
  renderCalTimes();
}
function calSelectTime(t){
  document.getElementById('apptTime').value = t;
  renderCalTimes();
}
function calShiftMonth(delta){
  const d = new Date(calMonth.y, calMonth.m + delta, 1);
  calMonth = { y:d.getFullYear(), m:d.getMonth() };
  refreshApptTimeOptions();
}
