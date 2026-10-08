/* データ：記録メモ・チャット・AI要約 */
/* ---------------- records ----------------
   category = "history"（経過・病歴のテンプレート用データ）は
   「今日の簡単記録」には出さないので、ここで除外する */
const RECORD_HIDDEN_CATEGORY = 'history';

async function getRecords(patientId){
  if(useSupabase){
    try{
      const res = await fetch(`${SUPABASE_URL}/rest/v1/records?patient_id=eq.${patientId}&category=neq.${RECORD_HIDDEN_CATEGORY}&order=created_at.desc`, {
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
  const all = await loadList(`records:${patientId}`);
  return all.filter(r => r.category !== RECORD_HIDDEN_CATEGORY);
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

/* ---------------- chat（看護師⇔家族 共通） ---------------- */
async function getChatMessages(patientId){
  if(useSupabase){
    try{
      const res = await fetch(`${SUPABASE_URL}/rest/v1/chat_messages?patient_id=eq.${patientId}&order=created_at.asc`, {
        headers: sbHeaders()
      });
      if(!res.ok) throw new Error(await res.text());
      const rows = await res.json();
      return rows.map(r => ({ who: r.who, name: r.name, text: r.text, time: r.time }));
    }catch(e){
      console.error(e); showToast('Supabaseからの読み込みに失敗しました');
      return [];
    }
  }
  return loadList(`chat:${patientId}`);
}
async function addChatMessage(patientId, msg){
  if(useSupabase){
    try{
      const res = await fetch(`${SUPABASE_URL}/rest/v1/chat_messages`, {
        method: "POST",
        headers: sbHeaders({ "Prefer": "return=minimal" }),
        body: JSON.stringify([{ patient_id: patientId, who: msg.who, name: msg.name, text: msg.text, time: msg.time }])
      });
      if(!res.ok) throw new Error(await res.text());
      return true;
    }catch(e){
      console.error(e); showToast('Supabaseへの保存に失敗しました');
      return false;
    }
  }
  const msgs = await loadList(`chat:${patientId}`);
  msgs.push(msg);
  return saveList(`chat:${patientId}`, msgs);
}

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
