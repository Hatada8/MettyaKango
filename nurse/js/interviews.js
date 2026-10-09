/* 看護師画面：面談予定
   ・月のカレンダーに、面談の予定（時間＋患者さんの名前）を表示する
   ・日付を押すと、その日の一覧が出る → 確定・取り消し・完了、予定の追加ができる
   ・?id=患者ID で開くと、その患者さんの面談だけを表示する */
let ivPatientId = null;      // 絞り込み中の患者（なければ病棟全体）
let ivPatient = null;
let ivYear = Number(todayISO().slice(0, 4));
let ivMonth = Number(todayISO().slice(5, 7));
let ivSelected = null;
let ivMonthList = [];        // 表示中の月の面談（取り消しを除く）
let ivBooked = new Set();

async function initInterviewsPage(){
  if(!requireStaff()) return;
  $('nurseWelcome').textContent = `${session.name} さん（${session.roleName}・${session.permissionName}）としてログイン中`;

  ivPatientId = Number(new URLSearchParams(location.search).get('id')) || null;
  try{
    await loadMasters();
    if(ivPatientId){
      const d = await getPatientDetail(ivPatientId);
      if(!d){ goTo('index.html'); return; }
      ivPatient = d;
      const p = d.patient;
      const stay = d.current || d.admissions[0] || null;
      const age = calcAge(p.birth_date);
      $('subPatient').innerHTML = `
        <div class="avatar">${escapeHtml(String(p.patient_name || '？')[0])}</div>
        <div>
          <div class="sub-name">${escapeHtml(p.patient_name)}　様</div>
          <div class="sub-meta">${stay && stay.room_no ? `${escapeHtml(stay.room_no)}号室・` : ''}${age != null ? `${escapeHtml(age)}歳・` : ''}${escapeHtml(masterName('sex', p.sex_id))}</div>
        </div>`;
      $('backBtn').textContent = '← 患者プロフィールへ戻る';
      $('scopeLabel').textContent = `（${p.patient_name} さんの面談）`;
      await markRead(session.employeeId, ivPatientId, READ_TARGET.INTERVIEWS);
    }else{
      $('scopeLabel').textContent = '（病棟全体）';
    }
  }catch(e){
    showError(e, 'データベースに接続できませんでした');
    return;
  }
  await loadInterviewMonth();
}

function backFromInterviews(){
  goTo(ivPatientId ? `index.html?id=${ivPatientId}` : 'index.html');
}

async function loadInterviewMonth(){
  try{
    const range = calMonthRange(ivYear, ivMonth);
    await loadInterviewHours();
    const [list, booked, pending] = await Promise.all([
      listInterviews({ fromDate: range.from, toDate: range.to, patientId: ivPatientId }),
      bookedInterviewSlots(range.from, range.to),
      listPendingInterviews(ivPatientId)
    ]);
    ivMonthList = list;
    ivBooked = booked;
    renderPending(pending);
    renderStaffCalendar();
  }catch(e){
    console.warn(e);
    $('staffCalendar').innerHTML = '<div class="empty">面談予定を読み込めませんでした（add_interview.sql を実行しましたか？）</div>';
    $('pendingList').innerHTML = '';
  }
}

function chipClass(m){
  return m.interview_status_id === INTERVIEW_STATUS.REQUESTED ? 'req'
    : m.interview_status_id === INTERVIEW_STATUS.DONE ? 'done' : '';
}

function renderStaffCalendar(){
  const byDate = {};
  ivMonthList.forEach(m => { (byDate[interviewDate(m.start_at)] = byDate[interviewDate(m.start_at)] || []).push(m); });
  $('staffCalendar').innerHTML = calendarHtml({
    year: ivYear, month: ivMonth, selected: ivSelected,
    selectFn: 'selectStaffDay', monthFn: 'moveStaffMonth',
    cellHtml: date => {
      const items = byDate[date] || [];
      const name = m => m.patient_master ? m.patient_master.patient_name.split(/[\s　]/)[0] : '';
      const shown = items.slice(0, 3).map(m =>
        `<span class="cal-chip ${chipClass(m)}" title="${escapeHtml((m.patient_master || {}).patient_name || '')}">${interviewTime(m.start_at)} ${escapeHtml(name(m))}</span>`).join('');
      return shown + (items.length > 3 ? `<span class="cal-more">ほか${items.length - 3}件</span>` : '');
    }
  });
  renderStaffDayPanel();
}

function renderPending(list){
  $('pendingCount').textContent = list.length ? `${list.length}件` : '';
  if(!list.length){ $('pendingList').innerHTML = '<p class="muted">確認待ちの申込みはありません。</p>'; return; }
  $('pendingList').innerHTML = `<div class="iv-list">${list.map(m => interviewItemHtml(m, true)).join('')}</div>`;
}

function interviewItemHtml(m, withDate){
  const s = m.interview_status_id;
  const future = new Date(m.start_at) > new Date();
  const who = m.family_id ? `ご家族（${escapeHtml(m.family_master ? m.family_master.email : '')}）` : escapeHtml(m.employee_master ? m.employee_master.employee_name : '職員');
  return `
    <div class="iv-item">
      <span class="when">${withDate ? fmtDate(interviewDate(m.start_at)) + ' ' : ''}${interviewTime(m.start_at)}</span>
      <span class="who">${escapeHtml(m.patient_master ? m.patient_master.patient_name : '')} さん</span>
      <span class="iv-badge s${s}">${escapeHtml(masterName('interviewStatus', s))}</span>
      <span class="what">${escapeHtml(masterName('interviewType', m.interview_type_id))}${m.note ? '／' + escapeHtml(m.note) : ''}<br><small>申込み：${who}</small></span>
      <span class="acts">
        ${s === INTERVIEW_STATUS.REQUESTED ? `<button type="button" class="iv-small-btn primary" onclick="changeInterview(${m.interview_id}, ${INTERVIEW_STATUS.CONFIRMED})">確定する</button>` : ''}
        ${s === INTERVIEW_STATUS.CONFIRMED && !future ? `<button type="button" class="iv-small-btn" onclick="changeInterview(${m.interview_id}, ${INTERVIEW_STATUS.DONE})">完了にする</button>` : ''}
        ${[INTERVIEW_STATUS.REQUESTED, INTERVIEW_STATUS.CONFIRMED].includes(s) ? `<button type="button" class="iv-small-btn danger" onclick="cancelInterviewAsStaff(${m.interview_id})">取り消す</button>` : ''}
        ${!ivPatientId && m.patient_master ? `<button type="button" class="iv-small-btn" onclick="goTo('index.html?id=${m.patient_id}')">患者さんを開く</button>` : ''}
      </span>
    </div>`;
}

async function selectStaffDay(date){
  ivSelected = (ivSelected === date) ? null : date;
  renderStaffCalendar();
  if(ivSelected){
    // 開いた日の申込みは、見たことにする（未読の点を消す）
    const ids = [...new Set(ivMonthList.filter(m => interviewDate(m.start_at) === ivSelected && m.family_id).map(m => m.patient_id))];
    await Promise.all(ids.map(id => markRead(session.employeeId, id, READ_TARGET.INTERVIEWS)));
  }
}

async function moveStaffMonth(delta){
  if(delta === 0){ ivYear = Number(todayISO().slice(0, 4)); ivMonth = Number(todayISO().slice(5, 7)); }
  else{ const m = calShiftMonth(ivYear, ivMonth, delta); ivYear = m.year; ivMonth = m.month; }
  ivSelected = null;
  await loadInterviewMonth();
}

function renderStaffDayPanel(){
  const box = $('staffDayPanel');
  if(!ivSelected){ box.classList.add('hidden'); box.innerHTML = ''; return; }
  const items = ivMonthList.filter(m => interviewDate(m.start_at) === ivSelected);
  const d = ivSelected.split('-').map(Number);
  const canAdd = ivSelected >= todayISO() && isInterviewDay(ivSelected);
  box.classList.remove('hidden');
  box.innerHTML = `
    <h4>${d[1]}月${d[2]}日（${['日', '月', '火', '水', '木', '金', '土'][calWeekday(ivSelected)]}）の面談 ${items.length}件</h4>
    ${items.length ? `<div class="iv-list">${items.map(m => interviewItemHtml(m, false)).join('')}</div>` : '<p class="muted">この日の面談はありません。</p>'}
    ${canAdd ? '<p style="margin:12px 0 0;"><button type="button" class="iv-small-btn primary" onclick="openAddInterview()">＋ この日に予定を追加</button></p>'
             : '<p class="muted" style="margin-top:10px;">予定を追加できるのは、今日以降で、面談を受け付けている曜日です。</p>'}`;
}

async function changeInterview(id, statusId){
  try{
    await setInterviewStatus(id, statusId, session.employeeId);
    showToast(statusId === INTERVIEW_STATUS.CONFIRMED ? '確定しました' : '更新しました');
    await loadInterviewMonth();
  }catch(e){ showError(e, '更新できませんでした'); }
}

async function cancelInterviewAsStaff(id){
  const ok = await confirmModal({ title: '面談を取り消す', message: 'この面談予約を取り消します。よろしいですか？', okLabel: '取り消す', danger: true });
  if(!ok) return;
  await changeInterview(id, INTERVIEW_STATUS.CANCELLED);
}

/* 予定を追加（職員が直接登録 → 確定になる） */
async function openAddInterview(){
  let patients = [];
  try{ patients = await listAdmittedPatients(); }
  catch(e){ showError(e, '患者さんを読み込めませんでした'); return; }
  const free = interviewTimes(ivSelected).filter(t => !ivBooked.has(`${ivSelected} ${t}`));
  if(!free.length){ showToast('この日は満席です'); return; }
  openModal({
    title: `${fmtDate(ivSelected)} に面談を追加`,
    submitLabel: '追加する',
    body: `
      <label class="form-item"><span>患者さん</span>
        <select class="f-input" name="patient_id">
          ${patients.map(a => `<option value="${a.patient_master.patient_id}" ${a.patient_master.patient_id === ivPatientId ? 'selected' : ''}>${escapeHtml(a.patient_master.patient_name)}（${escapeHtml(a.room_no ?? '—')}号室）</option>`).join('')}
        </select></label>
      <div class="form-grid">
        <label class="form-item"><span>時間</span><select class="f-input" name="time">${free.map(t => `<option>${t}</option>`).join('')}</select></label>
        <label class="form-item"><span>内容</span><select class="f-input" name="type">${masterOptions('interviewType', 1)}</select></label>
      </div>
      <label class="form-item"><span>ひとこと</span><textarea class="f-input" name="note" placeholder="例：退院後の生活について"></textarea></label>`,
    onSubmit: async form => {
      const f = new FormData(form);
      try{
        const result = await createInterview({
          patientId: Number(f.get('patient_id')), employeeId: session.employeeId,
          typeId: Number(f.get('type')), dateISO: ivSelected, time: f.get('time'), note: f.get('note')
        });
        if(result.already){ showToast('その時間は、すでに予約があります'); await loadInterviewMonth(); return false; }
        showToast('追加しました');
        await loadInterviewMonth();
        return true;
      }catch(e){ showError(e, '追加できませんでした'); return false; }
    }
  });
}
