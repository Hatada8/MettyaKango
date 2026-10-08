/* ---------------- nurse: 面談タイムテーブル（UI） ---------------- */
async function addScheduleSlot(){
  const startInput = document.getElementById('scheduleStartInput');
  const endInput = document.getElementById('scheduleEndInput');
  const start = startInput.value;
  const end = endInput.value;
  if(!start || !end){ showToast('開始と終了の時間を選択してください'); return; }
  const startSnap = snapToHalfHour(start);
  const endSnap = snapToHalfHour(end);
  if(startSnap >= endSnap){ showToast('終了時間は開始時間より後にしてください（30分単位）'); return; }
  const date = scheduleDate();
  const row = await getScheduleRow(date);
  const range = HALF_HOUR_SLOTS.filter(t => t >= startSnap && t < endSnap);
  row.slots = Array.from(new Set([...row.slots, ...range])).sort();
  const ok = await saveScheduleRow(date, row);
  if(ok){ startInput.value = ''; endInput.value = ''; }
  await renderScheduleTimetable();
}
async function removeScheduleSlot(time){
  const date = scheduleDate();
  const row = await getScheduleRow(date);
  row.slots = row.slots.filter(t => t !== time);
  await saveScheduleRow(date, row);
  await renderScheduleTimetable();
}
async function toggleScheduleSlot(time, isAvailable){
  if(isAvailable){
    await removeScheduleSlot(time);
    return;
  }
  const date = scheduleDate();
  const row = await getScheduleRow(date);
  if(!row.slots.includes(time)){
    row.slots.push(time);
    row.slots.sort();
    await saveScheduleRow(date, row);
  }
  await renderScheduleTimetable();
}
async function saveScheduleCapacity(){
  const input = document.getElementById('scheduleCapacityInput');
  const capacity = Math.max(1, parseInt(input.value, 10) || 1);
  input.value = capacity;
  const date = scheduleDate();
  const row = await getScheduleRow(date);
  row.capacity = capacity;
  const ok = await saveScheduleRow(date, row);
  if(ok) showToast('同時面談可能人数を更新しました');
  await renderScheduleTimetable();
}
async function renderScheduleTimetable(scrollToDefault){
  const el = document.getElementById('scheduleTimetable');
  if(!el) return;
  const date = scheduleDate();
  const row = await getScheduleRow(date);
  const capInput = document.getElementById('scheduleCapacityInput');
  if(capInput && document.activeElement !== capInput) capInput.value = row.capacity;
  const bookings = await getAppointmentsForDate(date);
  const byTime = {};
  bookings.forEach(b => { (byTime[b.time] = byTime[b.time] || []).push(b); });

  el.innerHTML = HALF_HOUR_SLOTS.map(t => {
    const isAvailable = row.slots.includes(t);
    const bs = byTime[t] || [];
    const isFull = isAvailable && bs.length >= row.capacity;
    const bars = bs.map(b => {
      const p = patients.find(x => x.id === b.patientId);
      const label = p ? p.name : '患者';
      return `<span class="timetable-bar" title="${escapeHtml(label)}">${escapeHtml(label)}</span>`;
    }).join('');
    const remaining = isAvailable ? Math.max(0, row.capacity - bs.length) : 0;
    const hint = isAvailable
      ? (remaining > 0 ? `<span class="timetable-empty-hint">空き${remaining}</span>` : '')
      : (bs.length === 0 ? `<span class="timetable-empty-hint">クリックで空きに</span>` : '');
    const rowClass = isAvailable ? (isFull ? 'full' : 'available') : '';
    const clickable = bs.length === 0;
    return `
      <div class="timetable-row ${rowClass}" data-time="${t}" ${clickable ? `onclick="toggleScheduleSlot('${t}', ${isAvailable})"` : ''}>
        <span class="timetable-time">${t}</span>
        <span class="timetable-bars">${bars}${hint}</span>
      </div>
    `;
  }).join('');

  if(scrollToDefault){
    const target = el.querySelector('[data-time="08:00"]');
    if(target) el.scrollTop = target.getBoundingClientRect().top - el.getBoundingClientRect().top + el.scrollTop;
  }
}
