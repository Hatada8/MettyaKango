/* 家族画面：面談の予約（送信・取り消し・申込履歴）。日時の選択はカレンダー（calendar.js） */
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
    document.getElementById('apptTime').value = '';
    await refreshApptLog();
    await refreshApptTimeOptions();
  }
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
