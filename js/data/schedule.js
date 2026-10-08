/* ---------------- nurse: 面談タイムテーブル（データ層） ---------------- */
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
function scheduleDate(){
  const el = document.getElementById('scheduleDateInput');
  return (el && el.value) || todayISO();
}
