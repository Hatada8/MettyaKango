/* ---------------- records ---------------- */
async function getRecords(patientId){
  if(useSupabase){
    try{
      const res = await fetch(`${SUPABASE_URL}/rest/v1/records?patient_id=eq.${patientId}&order=created_at.desc`, {
        headers: sbHeaders()
      });
      if(!res.ok) throw new Error(await res.text());
      const rows = await res.json();
      return rows.map(r => ({ time: r.time, category: r.category, memo: r.memo, author: r.author }));
    }catch(e){
      console.error(e); showToast('Supabaseからの読み込みに失敗しました');
      return [];
    }
  }
  return loadList(`records:${patientId}`);
}
async function addRecord(patientId, entry){
  if(useSupabase){
    try{
      const res = await fetch(`${SUPABASE_URL}/rest/v1/records`, {
        method: "POST",
        headers: sbHeaders({ "Prefer": "return=minimal" }),
        body: JSON.stringify([{ patient_id: patientId, time: entry.time, category: entry.category, memo: entry.memo, author: entry.author }])
      });
      if(!res.ok) throw new Error(await res.text());
      return true;
    }catch(e){
      console.error(e); showToast('Supabaseへの保存に失敗しました');
      return false;
    }
  }
  const records = await loadList(`records:${patientId}`);
  records.unshift(entry);
  return saveList(`records:${patientId}`, records);
}
