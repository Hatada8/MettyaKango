/* ---------------- 面談予約（データ層） ---------------- */
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
