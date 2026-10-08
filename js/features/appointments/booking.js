/* ---------------- 面談予約（UI・看護師/家族 共通） ---------------- */
async function cancelAppointmentAsFamily(apptId, createdAt){
  if(!currentFamilyPatient) return;
  if(!confirm('この面談予約を取り消します。よろしいですか？')) return;
  const ok = await deleteAppointment(currentFamilyPatient.id, apptId, createdAt);
  if(ok){
    showToast('面談予約を取り消しました');
    await refreshApptLog();
    await refreshApptTimeOptions();
  }
}

async function cancelAppointmentAsNurse(patientId, apptId, createdAt){
  if(!confirm('この面談予約を取り消します。よろしいですか？')) return;
  const ok = await deleteAppointment(patientId, apptId, createdAt);
  if(ok){
    showToast('面談予約を取り消しました');
    renderApptRequestList(await getAppointments(patientId));
    await refreshAppointmentsIndex();
    renderPatientList();
    await renderScheduleTimetable(false);
  }
}

async function submitAppointment(){
  if(!currentFamilyPatient) return;
  const template = document.getElementById('apptTemplate').value;
  const date = document.getElementById('apptDate').value;
  const time = document.getElementById('apptTime').value;
  const noteInput = document.getElementById('apptNote');
  const note = noteInput.value.trim();
  if(!date || !time){ showToast('希望日時を選択してください'); return; }

  // 送信直前にもう一度空きを確認する（表示後に他の方が予約した場合の取りこぼしを防ぐ）
  const row = await getScheduleRow(date);
  if(!row.slots.includes(time)){
    showToast('その時間は受付が終了しました。別の時間をお選びください');
    await refreshApptTimeOptions();
    return;
  }
  const booked = await getAppointmentsForDate(date);
  if(booked.filter(b => b.time === time).length >= row.capacity){
    showToast('その時間は満員になりました。別の時間をお選びください');
    await refreshApptTimeOptions();
    return;
  }

  const appt = {
    template, date, time, note,
    requestedBy: currentUser ? currentUser.name : '家族',
    createdAt: new Date().toISOString()
  };
  const ok = await addAppointment(currentFamilyPatient.id, appt);
  if(ok){
    showToast('面談を申し込みました。看護師に通知されます');
    noteInput.value = '';
    await refreshApptLog();
    await refreshApptTimeOptions();
  }
}

async function refreshApptTimeOptions(){
  const sel = document.getElementById('apptTime');
  const dateInput = document.getElementById('apptDate');
  if(!sel || !dateInput) return;
  const date = dateInput.value || todayISO();
  const prev = sel.value;
  const row = await getScheduleRow(date);
  const booked = await getAppointmentsForDate(date);
  const countByTime = {};
  booked.forEach(b => { countByTime[b.time] = (countByTime[b.time] || 0) + 1; });
  const isToday = date === todayISO();
  const nowStr = nowTimeStr();
  const available = row.slots.filter(t =>
    (countByTime[t] || 0) < row.capacity && (!isToday || t > nowStr) // 今日の場合、過ぎた時間は出さない
  );
  if(available.length === 0){
    sel.innerHTML = `<option value="">対応可能な時間がありません</option>`;
    return;
  }
  sel.innerHTML = available.map(t => `<option value="${t}">${t}</option>`).join('');
  if(available.includes(prev)) sel.value = prev; // 選択中の時間は維持する
}

async function refreshApptLog(){
  const el = document.getElementById('apptLog');
  if(!el || !currentFamilyPatient) return;
  const list = await getAppointments(currentFamilyPatient.id);
  if(list.length === 0){
    el.innerHTML = `<div style="font-size:12px; color:var(--ink-soft);">まだ申し込みはありません</div>`;
    return;
  }
  el.innerHTML = list.slice(0,5).map(a => `
    <div class="logitem">
      <span class="t">${escapeHtml(a.date)} ${escapeHtml(a.time)}</span>
      <span style="flex:1;">【${escapeHtml(a.template)}】${a.note ? escapeHtml(a.note) : ''}</span>
      <button type="button" class="appt-cancel-btn"
        onclick="cancelAppointmentAsFamily('${escapeHtml(a.id||'')}', '${escapeHtml(a.createdAt||'')}')">取り消し</button>
    </div>
  `).join('');
}

function renderApptRequestList(appts, patientId){
  const el = document.getElementById('apptRequestList');
  if(!el) return;
  if(appts.length === 0){
    el.innerHTML = `<div style="font-size:12.5px; color:var(--ink-soft);">まだ面談の申し込みはありません</div>`;
    return;
  }
  const pid = patientId != null ? patientId : currentPatientId;
  el.innerHTML = appts.map(a => `
    <div class="appt-request-item">
      <div class="appt-when">📅 ${escapeHtml(a.date)} ${escapeHtml(a.time)}</div>
      <div>【${escapeHtml(a.template)}】</div>
      ${a.note ? `<div style="margin-top:4px;">${escapeHtml(a.note)}</div>` : ''}
      <div style="margin-top:6px; display:flex; align-items:center; gap:8px;">
        <span style="color:var(--ink-soft); font-size:11.5px;">申込者：${escapeHtml(a.requestedBy||'家族')}</span>
        <button type="button" class="appt-cancel-btn" style="margin-left:auto;"
          onclick="cancelAppointmentAsNurse(${pid}, '${escapeHtml(a.id||'')}', '${escapeHtml(a.createdAt||'')}')">取り消し</button>
      </div>
    </div>
  `).join('');
}
