/* ---------------- 経過・病歴（データ層） ----------------
   records テーブルの category = history の行に、経過1件分をJSONで保存する */
const HISTORY_CATEGORY = 'history';

async function getHistoryEntries(patientId){
  let rows;
  if(useSupabase){
    try{
      const res = await fetch(`${SUPABASE_URL}/rest/v1/records?patient_id=eq.${patientId}&category=eq.${HISTORY_CATEGORY}`, { headers: sbHeaders() });
      if(!res.ok) throw new Error(await res.text());
      rows = (await res.json()).map(r => r.memo);
    }catch(e){ console.error(e); return []; }
  } else {
    rows = (await loadList(`records:${patientId}`))
      .filter(r => r.category === HISTORY_CATEGORY)
      .map(r => r.memo);
  }
  return rows
    .map(m => { try{ return JSON.parse(m); }catch(e){ return null; } })
    .filter(Boolean)
    .sort((a,b) => String(b.date).localeCompare(String(a.date)));
}

async function addHistoryEntry(patientId, entry){
  return addRecord(patientId, {
    time: entry.date,
    category: HISTORY_CATEGORY,
    memo: JSON.stringify(entry),
    author: currentUser ? currentUser.name : '看護師'
  });
}
