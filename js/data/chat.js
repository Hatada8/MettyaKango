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
