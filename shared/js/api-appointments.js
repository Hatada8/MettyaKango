/* データ：面談予約と面談枠（タイムテーブル） */
async function getAppointments(patientId){
  if(useSupabase){
    try{
      const res = await fetch(`${SUPABASE_URL}/rest/v1/appointments?patient_id=eq.${patientId}&order=created_at.desc`, { headers: sbHeaders() });
      if(!res.ok) throw new Error(await res.text());
      const rows = await res.json();
      return rows.map(r => ({ id:r.id, template:r.template, date:r.date, time:r.time, note:r.note, requestedBy:r.requested_by, createdAt:r.created_at }));
    }catch(e){ console.error(e); return []; }
  }
  return loadList(`appointments:${patientId}`);
}

/* 面談予約の取り消し（看護師・家族どちらからでも） */
async function deleteAppointment(patientId, apptId, createdAt){
  if(useSupabase){
    try{
      const res = await fetch(`${SUPABASE_URL}/rest/v1/appointments?id=eq.${encodeURIComponent(apptId)}`, {
        method: "DELETE", headers: sbHeaders()
      });
      if(!res.ok) throw new Error(await res.text());
      return true;
    }catch(e){ console.error(e); showToast('予約の取り消しに失敗しました'); return false; }
  }
  const list = await loadList(`appointments:${patientId}`);
  return saveList(`appointments:${patientId}`, list.filter(a => a.createdAt !== createdAt));
}

async function addAppointment(patientId, appt){
  if(useSupabase){
    try{
      const res = await fetch(`${SUPABASE_URL}/rest/v1/appointments`, {
        method: "POST",
        headers: sbHeaders({ "Prefer": "return=minimal" }),
        body: JSON.stringify([{ patient_id:patientId, template:appt.template, date:appt.date, time:appt.time, note:appt.note, requested_by:appt.requestedBy }])
      });
      if(!res.ok) throw new Error(await res.text());
      return true;
    }catch(e){ console.error(e); showToast('予約の送信に失敗しました'); return false; }
  }
  const list = await loadList(`appointments:${patientId}`);
  list.unshift(appt);
  return saveList(`appointments:${patientId}`, list);
}

const SCHEDULE_SLOT_SENTINEL_ID = 0; // watch_status の患者IDには使われない予約枠専用の番号
const HALF_HOUR_SLOTS = Array.from({length:48}, (_,i) => {
  const h = Math.floor(i/2), m = (i%2)*30;
  return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`;
});
function snapToHalfHour(time){
  const [h, m] = time.split(':').map(Number);
  return `${String(h).padStart(2,'0')}:${m >= 30 ? '30' : '00'}`;
}
/* 面談枠は「日付 -> { slots, capacity }」のマップとして1行にまとめて保存する。
   旧形式（1日分の配列）で保存されていた場合は読み込み時に変換する。 */
function parseScheduleMap(moodRaw, legacyDate, legacyCapacity){
  let parsed;
  try{ parsed = JSON.parse(moodRaw || '{}'); }catch(e){ return {}; }
  if(Array.isArray(parsed)){
    if(!legacyDate) return {};
    return { [legacyDate]: { slots: parsed, capacity: parseInt(legacyCapacity, 10) || 1 } };
  }
  return (parsed && typeof parsed === 'object') ? parsed : {};
}
async function fetchScheduleMap(){
  if(useSupabase){
    try{
      const res = await fetch(`${SUPABASE_URL}/rest/v1/watch_status?patient_id=eq.${SCHEDULE_SLOT_SENTINEL_ID}`, { headers: sbHeaders() });
      if(!res.ok) throw new Error(await res.text());
      const rows = await res.json();
      if(!rows[0]) return {};
      return parseScheduleMap(rows[0].mood, rows[0].last_active, rows[0].battery);
    }catch(e){ console.error(e); return {}; }
  }
  try{
    const raw = localStorage.getItem('scheduleMap');
    return raw ? JSON.parse(raw) : {};
  }catch(e){ return {}; }
}
async function saveScheduleMap(map){
  const today = todayISO();
  const pruned = {};
  Object.keys(map).forEach(d => { if(d >= today) pruned[d] = map[d]; }); // 過ぎた日の枠は持ち越さない
  if(useSupabase){
    try{
      const res = await fetch(`${SUPABASE_URL}/rest/v1/watch_status?on_conflict=patient_id`, {
        method: "POST",
        headers: sbHeaders({ "Prefer": "resolution=merge-duplicates" }),
        body: JSON.stringify([{ patient_id:SCHEDULE_SLOT_SENTINEL_ID, last_active:'multi', battery:'', mood:JSON.stringify(pruned) }])
      });
      if(!res.ok) throw new Error(await res.text());
      return true;
    }catch(e){ console.error(e); showToast('面談枠の保存に失敗しました'); return false; }
  }
  localStorage.setItem('scheduleMap', JSON.stringify(pruned));
  return true;
}
async function getScheduleRow(dateStr){
  const map = await fetchScheduleMap();
  const entry = map[dateStr];
  return { slots: (entry && entry.slots) || [], capacity: (entry && entry.capacity) || 1 };
}
async function saveScheduleRow(dateStr, row){
  const map = await fetchScheduleMap();
  map[dateStr] = { slots: row.slots, capacity: row.capacity };
  return saveScheduleMap(map);
}

async function getAppointmentsForDate(dateStr){
  if(useSupabase){
    try{
      const res = await fetch(`${SUPABASE_URL}/rest/v1/appointments?date=eq.${dateStr}`, { headers: sbHeaders() });
      if(!res.ok) throw new Error(await res.text());
      const rows = await res.json();
      return rows.map(r => ({ time:r.time, patientId:r.patient_id }));
    }catch(e){ console.error(e); return []; }
  }
  const all = [];
  for(const p of patients){
    const list = await getAppointments(p.id);
    all.push(...list.filter(a => a.date === dateStr).map(a => ({ ...a, patientId:p.id })));
  }
  return all;
}

/* 指定した期間（両端を含む）の面談予約をまとめて取得する（家族画面のカレンダー用） */
async function getAppointmentsInRange(startStr, endStr){
  if(useSupabase){
    try{
      const res = await fetch(`${SUPABASE_URL}/rest/v1/appointments?date=gte.${startStr}&date=lte.${endStr}`, { headers: sbHeaders() });
      if(!res.ok) throw new Error(await res.text());
      const rows = await res.json();
      return rows.map(r => ({ date:r.date, time:r.time, patientId:r.patient_id }));
    }catch(e){ console.error(e); return []; }
  }
  const all = [];
  for(const p of patients){
    const list = await getAppointments(p.id);
    all.push(...list.filter(a => a.date >= startStr && a.date <= endStr).map(a => ({ date:a.date, time:a.time, patientId:p.id })));
  }
  return all;
}
