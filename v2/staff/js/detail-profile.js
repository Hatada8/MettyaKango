/* 患者詳細：プロフィール・状態・診断・入院歴・管理者の操作 */

function renderProfile(){
  const p = detail.patient;
  const stay = currentStay();
  const age = calcAge(p.birth_date);

  // 退院済みの案内
  const note = $('dischargedNote');
  if(!detail.current && stay){
    note.textContent = `この患者さんは ${fmtDate(stay.discharged_on)} に退院しています。記録の閲覧はできますが、AI要約は作成できません。`;
    note.classList.remove('hidden');
  }else{
    note.classList.add('hidden');
  }

  const level = stay ? stay.condition_level_id : 1;
  const levelButtons = masters.conditionLevel.map(l =>
    `<button type="button" class="lv${l.condition_level_id} ${l.condition_level_id === level ? 'on' : ''}"
       ${detail.current ? '' : 'disabled'} onclick="changeCondition(${l.condition_level_id})">${esc(l.condition_level_name)}</button>`
  ).join('');

  $('profilePanel').innerHTML = `
    <span class="avatar large ${avatarColor(p.patient_id)}">${esc(initialOf(p.patient_name))}</span>
    <div class="profile-main">
      <h2>
        ${esc(p.patient_name)} 様
        <button type="button" class="star ${isFavorite ? 'on' : ''}" aria-pressed="${isFavorite}"
          aria-label="${isFavorite ? 'お気に入りから外す' : 'お気に入りに登録'}" onclick="toggleDetailFavorite()">${isFavorite ? '★' : '☆'}</button>
      </h2>
      ${p.patient_kana ? `<p class="muted" style="margin:-4px 0 6px;">${esc(p.patient_kana)}</p>` : ''}
      <ul class="meta">
        <li><small>患者ID</small>${esc(p.patient_no)}</li>
        <li>${age != null ? `${age}歳・` : ''}${esc(masterName('sex', p.sex_id))}</li>
        ${p.birth_date ? `<li><small>生年月日</small>${fmtDate(p.birth_date)}</li>` : ''}
        ${stay && stay.room_no ? `<li><small>部屋</small>${esc(stay.room_no)}号室</li>` : ''}
        ${stay && stay.department_id ? `<li><small>分野</small>${esc(masterName('department', stay.department_id))}</li>` : ''}
        ${stay && stay.employee_master ? `<li><small>主治医</small>${esc(stay.employee_master.employee_name)}</li>` : ''}
        ${detail.current ? `<li><small>入院</small>${fmtDate(detail.current.admitted_on)}（${dayOfStay(detail.current.admitted_on)}日目）</li>` : ''}
      </ul>
    </div>
    <div class="condition-box">
      <small>今の状態（職員みんなが変更できます）</small>
      <div class="segmented">${levelButtons}</div>
    </div>`;
}

function renderFacts(){
  const stay = currentStay();
  const byType = typeId => symptoms.filter(s => s.symptom_master && s.symptom_master.symptom_type_id === typeId);
  const names = list => list.map(s => esc(s.symptom_master.symptom_name) + (s.onset_on ? `<small style="display:inline;">（${fmtDate(s.onset_on)}）</small>` : '')).join('、');

  const rows = [];
  masters.symptomType.forEach(t => {
    const list = byType(t.symptom_type_id);
    const isAllergy = t.symptom_type_id === SYMPTOM_TYPE.ALLERGY;
    const icon = { 1: '✚', 2: '!', 3: '↺' }[t.symptom_type_id] || '・';
    rows.push(`
      <div class="fact ${isAllergy && list.length ? 'alert' : ''}">
        <span>${icon}</span>
        <div><small>${esc(t.symptom_type_name)}</small><b>${list.length ? names(list) : 'なし'}</b></div>
      </div>`);
  });
  rows.push(`
    <div class="fact">
      <span>△</span>
      <div><small>注意事項</small><b>${stay && stay.care_note ? esc(stay.care_note) : 'なし'}</b></div>
    </div>`);
  $('facts').innerHTML = rows.join('');

  $('historyList').innerHTML = detail.admissions.map(a => `
    <li>
      <time>${fmtDate(a.admitted_on)} 〜 ${a.discharged_on ? fmtDate(a.discharged_on) : '入院中'}</time>
      <span>${esc(masterName('department', a.department_id) || '分野未設定')}${a.room_no ? `・${esc(a.room_no)}号室` : ''}</span>
    </li>`).join('') || '<li class="muted">入院記録はありません</li>';
}

/* 状態の変更（安定・要観察・要注意） */
async function changeCondition(levelId){
  if(!detail.current || detail.current.condition_level_id === levelId) return;
  try{
    await updateAdmission(detail.current.admission_id, { condition_level_id: levelId });
    detail.current.condition_level_id = levelId;
    renderProfile();
    toast(`状態を「${masterName('conditionLevel', levelId)}」にしました`);
  }catch(e){ showError(e, '状態を変更できませんでした'); }
}

async function toggleDetailFavorite(){
  try{
    await setFavorite(session.employeeId, patientId, !isFavorite);
    isFavorite = !isFavorite;
    renderProfile();
    toast(isFavorite ? 'お気に入りに登録しました' : 'お気に入りから外しました');
  }catch(e){ showError(e, 'お気に入りを保存できませんでした'); }
}

/* ---- 管理者だけの操作 ---- */
function renderAdminButtons(){
  $('editBtn').classList.toggle('hidden', !can('can_patient_update'));
  $('readmitBtn').classList.toggle('hidden', !can('can_patient_create') || !!detail.current);
  $('dischargeBtn').classList.toggle('hidden', !can('can_patient_update') || !detail.current);
  $('deleteBtn').classList.toggle('hidden', !can('can_patient_delete'));
}

$('editBtn').addEventListener('click', () =>
  openPatientForm({ mode: 'edit', detail, symptoms, onDone: reloadDetail }));

$('readmitBtn').addEventListener('click', () =>
  openPatientForm({ mode: 'readmit', detail, symptoms, onDone: async () => { await reloadDetail(); await loadAiSummary(); } }));

$('dischargeBtn').addEventListener('click', async () => {
  const ok = await confirmModal({
    title: '退院にする',
    message: `${detail.patient.patient_name} さんを今日（${fmtDate(todayISO())}）付けで退院にします。\n患者一覧には表示されなくなります。`,
    okLabel: '退院にする'
  });
  if(!ok) return;
  try{
    await dischargeAdmission(detail.current.admission_id);
    toast('退院にしました');
    await reloadDetail();
    await loadAiSummary();
  }catch(e){ showError(e, '退院にできませんでした'); }
});

$('deleteBtn').addEventListener('click', async () => {
  const ok = await confirmModal({
    title: '患者さんを削除',
    message: `${detail.patient.patient_name} さんを削除します。\nデータは消さずに「削除済み」として残ります（管理画面から元に戻せます）。`,
    okLabel: '削除する', danger: true
  });
  if(!ok) return;
  try{
    await deletePatient(patientId);
    toast('削除しました');
    setTimeout(() => goTo('index.html'), 600);
  }catch(e){ showError(e, '削除できませんでした'); }
});
