/* ---------------- nurse: 新規患者登録 ---------------- */
function toggleAddPatientForm(){
  const form = document.getElementById('addPatientForm');
  form.style.display = form.style.display === 'none' ? 'block' : 'none';
}
async function addPatient(){
  const name = document.getElementById('npName').value.trim();
  const room = document.getElementById('npRoom').value.trim();
  const age = document.getElementById('npAge').value.trim();
  const sex = document.getElementById('npSex').value;
  const diag = document.getElementById('npDiag').value.trim();
  const allergy = document.getElementById('npAllergy').value.trim() || 'なし';
  if(!name || !room || !age || !diag){ showToast('氏名・部屋番号・年齢・診断名は必須です'); return; }

  const code = generateFamilyCode();
  const today = new Date();
  const admitted = `${today.getFullYear()}/${String(today.getMonth()+1).padStart(2,'0')}/${String(today.getDate()).padStart(2,'0')}`;
  const newPatient = {
    id: Date.now(),
    name, room, age:Number(age), sex, diag, allergy,
    admitted, flag:'low', issues:[], rawNotes:'', aiSummary:'',
    familyCode: code
  };
  const ok = await createPatient(newPatient);
  if(!ok) return;

  patients.push(newPatient);
  ['npName','npRoom','npAge','npDiag','npAllergy'].forEach(id=> document.getElementById(id).value = '');
  toggleAddPatientForm();
  renderPatientList();
  renderPatient(newPatient.id);
  alert(`患者「${name}」を登録しました。\n\n家族用ログインID：${code}\n\nこのIDをご家族にお伝えください。ログイン画面の「患者ID」欄に入力するとご覧いただけます。`);
}

/* ---------------- nurse: patient list ---------------- */
/* これから先の予約だけを、近い順に返す（済んだ予約はバッジに出さない） */
function upcomingAppts(appts){
  if(!appts || appts.length === 0) return [];
  const now = `${todayISO()} ${nowTimeStr()}`;
  return appts
    .filter(a => `${a.date} ${a.time}` >= now)
    .sort((a,b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`));
}
function renderPatientList(){
  const label = document.getElementById('patientCountLabel');
  if(label) label.textContent = `担当患者 ／ ${patients.length}名`;

  const list = document.getElementById('patientList');
  const q = (document.getElementById('patientSearch')?.value || '').trim();
  const sexFilter = document.getElementById('patientSexFilter')?.value || '';
  let filtered = q ? patients.filter(p => p.name.includes(q)) : patients;
  if(sexFilter) filtered = filtered.filter(p => p.sex === sexFilter);
  if(patients.length === 0){
    list.innerHTML = `<div style="font-size:12.5px; color:var(--ink-soft); padding:16px 8px;">まだ患者が登録されていません。<br>「＋ 新規患者を登録」から追加してください。</div>`;
    return;
  }
  if(filtered.length === 0){
    list.innerHTML = `<div style="font-size:12.5px; color:var(--ink-soft); padding:16px 8px;">該当する患者が見つかりません</div>`;
    return;
  }
  list.innerHTML = filtered.map(p => {
    const up = upcomingAppts(appointmentsIndex[p.id]);
    return `
    <div class="patient-item ${p.id===currentPatientId?'active':''}" onclick="renderPatient(${p.id})">
      <div class="avatar">${escapeHtml(String(p.name||'？')[0])}</div>
      <div class="meta">
        <div class="name">${escapeHtml(p.name)}</div>
        <div class="room">${escapeHtml(p.room)}号室・${escapeHtml(p.age)}歳・ID:${escapeHtml(p.familyCode)}</div>
      </div>
      ${ up.length > 0 ? `<span class="appt-badge" title="これからの面談予約 ${up.length}件">📅 ${escapeHtml(up[0].time)}</span>` : '' }
      <div class="flag ${p.flag}"></div>
    </div>
  `;}).join('');
}

async function refreshAppointmentsIndex(){
  if(useSupabase){
    try{
      // 患者ごとに問い合わせず、1回でまとめて取得する
      const res = await fetch(`${SUPABASE_URL}/rest/v1/appointments?order=created_at.desc`, { headers: sbHeaders() });
      if(!res.ok) throw new Error(await res.text());
      const rows = await res.json();
      const idx = {};
      rows.forEach(r => {
        const a = { id:r.id, template:r.template, date:r.date, time:r.time, note:r.note, requestedBy:r.requested_by, createdAt:r.created_at };
        (idx[r.patient_id] = idx[r.patient_id] || []).push(a);
      });
      appointmentsIndex = idx;
      return;
    }catch(e){ console.error(e); }
  }
  const idx = {};
  for(const p of patients){
    idx[p.id] = await getAppointments(p.id);
  }
  appointmentsIndex = idx;
}

/* ---------------- nurse: 本日の面談タイムテーブル ---------------- */
