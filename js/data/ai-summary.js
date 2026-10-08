/* ---------------- AI要約（家族画面にも反映） ---------------- */
async function getAiSummary(patientId){
  if(useSupabase){
    try{
      const res = await fetch(`${SUPABASE_URL}/rest/v1/ai_summaries?patient_id=eq.${patientId}`, {
        headers: sbHeaders()
      });
      if(!res.ok) throw new Error(await res.text());
      const rows = await res.json();
      return rows[0] ? { summary: rows[0].summary, updatedAt: rows[0].updated_at } : null;
    }catch(e){
      console.error(e); return null;
    }
  }
  const res = await loadList(`aisummary:${patientId}`);
  return res.length ? res[0] : null;
}
async function saveAiSummary(patientId, summaryText){
  const updatedAt = new Date().toISOString();
  if(useSupabase){
    try{
      const res = await fetch(`${SUPABASE_URL}/rest/v1/ai_summaries?on_conflict=patient_id`, {
        method: "POST",
        headers: sbHeaders({ "Prefer": "resolution=merge-duplicates" }),
        body: JSON.stringify([{ patient_id: patientId, summary: summaryText, updated_at: updatedAt }])
      });
      if(!res.ok) throw new Error(await res.text());
      return true;
    }catch(e){
      console.error(e); showToast('Supabaseへの保存に失敗しました');
      return false;
    }
  }
  return saveList(`aisummary:${patientId}`, [{ summary: summaryText, updatedAt }]);
}
