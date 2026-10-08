/* 看護師画面：患者の詳細（プロフィール・診断・状態・管理者の操作） */
async function renderPatient(id){
  currentPatientId = id;
  renderPatientList();
  if(isSmallScreen()) setSidebar(false);   // スマホは選んだら一覧を閉じる

  const main = document.getElementById('nurseMain');
  main.innerHTML = `
    <div class="card" id="profileCard"><div class="empty">読み込み中…</div></div>
    <div class="page-menu" id="pageMenu"></div>
  `;

  try{
    await reloadDetail();
  }catch(e){
    showError(e, '患者さんの情報を読み込めませんでした');
  }
}

/* プロフィールの下の、各ページへ行くボタン */
const NURSE_PAGES = [
  { file: 'ai-summary.html',   target: READ_TARGET.AI_SUMMARY,   icon: '✨', title: 'AI要約',         desc: 'これまでの記録をまとめます' },
  { file: 'handover.html',     target: READ_TARGET.HANDOVER,     icon: '🗒️', title: '申し送りメモ',   desc: '今日のことを短く記録します' },
  { file: 'private-memo.html', target: READ_TARGET.PRIVATE_MEMO, icon: '🌱', title: 'プライベートメモ', desc: '趣味・好きなものなど' },
  { file: 'messages.html',     target: READ_TARGET.MESSAGES,     icon: '💬', title: 'メッセージ',      desc: 'ご家族とやりとりします' }
];

function openNursePage(file){
  goTo(`${file}?id=${currentPatientId}`);
}

function renderPageMenu(){
  const box = document.getElementById('pageMenu');
  if(!box) return;
  const unread = unreadMap[currentPatientId] || {};
  box.innerHTML = NURSE_PAGES.map(pg => `
    <button type="button" class="page-btn" onclick="openNursePage('${pg.file}')">
      <span class="page-btn-icon">${pg.icon}</span>
      <span class="page-btn-text">
        <span class="page-btn-title">${pg.title}</span>
        <span class="page-btn-desc">${pg.desc}</span>
      </span>
      ${unread[pg.target] ? `<span class="unread-dot" role="img" aria-label="未読があります" title="まだ見ていない記録があります"></span>` : ''}
      <span class="page-btn-arrow">›</span>
    </button>`).join('');
}

/* 患者マスタ・入院・症状を読み直して、プロフィールを描き直す */
async function reloadDetail(){
  const id = currentPatientId;
  const [d, s] = await Promise.all([getPatientDetail(id), listPatientSymptoms(id)]);
  if(id !== currentPatientId) return false; // 読み込み中に別の患者を選んだ
  if(!d){
    document.getElementById('nurseMain').innerHTML = `<div class="card"><div class="empty">この患者さんは見つかりません（削除された可能性があります）。</div></div>`;
    return false;
  }
  detail = d;
  symptoms = s;
  renderProfile();
  renderPageMenu();
  return true;
}

function renderProfile(){
  const card = document.getElementById('profileCard');
  if(!card || !detail) return;
  const p = detail.patient;
  const stay = currentStay();
  const age = calcAge(p.birth_date);
  const fav = favoriteIds.has(p.patient_id);

  const byType = typeId => symptoms
    .filter(s => s.symptom_master && s.symptom_master.symptom_type_id === typeId)
    .map(s => s.symptom_master.symptom_name + (s.onset_on ? `（${fmtDate(s.onset_on)}）` : ''))
    .join('、') || 'なし';

  const adminButtons = [
    can('can_patient_update') ? `<button type="button" class="mini-btn" onclick="openPatientForm({ mode: 'edit', detail, symptoms, onDone: afterPatientSaved })">✎ 修正</button>` : '',
    can('can_patient_create') && !detail.current ? `<button type="button" class="mini-btn" onclick="openPatientForm({ mode: 'readmit', detail, symptoms, onDone: afterPatientSaved })">再入院</button>` : '',
    can('can_patient_update') && detail.current ? `<button type="button" class="mini-btn" onclick="dischargeCurrent()">退院</button>` : '',
    can('can_patient_delete') ? `<button type="button" class="mini-btn danger-btn" onclick="deleteCurrent()">削除</button>` : ''
  ].join('');

  card.innerHTML = `
    <div class="profile-top" style="justify-content:space-between; flex-wrap:wrap;">
      <div style="display:flex; align-items:center; gap:16px;">
        <div class="avatar" style="background:var(--nurse-deep)">${escapeHtml(String(p.patient_name || '？')[0])}</div>
        <div>
          <div class="pname">${escapeHtml(p.patient_name)}　様
            <button type="button" class="fav-star ${fav ? 'on' : ''}" aria-pressed="${fav}"
              aria-label="${fav ? 'お気に入りから外す' : 'お気に入りに登録'}" onclick="toggleFavorite(${p.patient_id})">${fav ? '★' : '☆'}</button>
          </div>
          <div class="psub">
            ${stay && stay.room_no ? `${escapeHtml(stay.room_no)}号室・` : ''}${age != null ? `${escapeHtml(age)}歳・` : ''}${escapeHtml(masterName('sex', p.sex_id))}
            ${detail.current ? `／入院日 ${fmtDate(detail.current.admitted_on)}（${dayOfStay(detail.current.admitted_on)}日目）` : ''}
          </div>
        </div>
      </div>
      ${adminButtons ? `<div class="admin-actions">${adminButtons}</div>` : ''}
    </div>

    ${!detail.current && stay ? `<div class="discharged-note">この患者さんは ${fmtDate(stay.discharged_on)} に退院しています。記録は見られますが、AI要約は作れません。</div>` : ''}

    <div class="grid2">
      <div class="field"><div class="k">診断名</div><div class="v">${escapeHtml(byType(SYMPTOM_TYPE.DIAGNOSIS))}</div></div>
      <div class="field"><div class="k">アレルギー</div><div class="v ${byType(SYMPTOM_TYPE.ALLERGY) !== 'なし' ? 'allergy' : ''}">${escapeHtml(byType(SYMPTOM_TYPE.ALLERGY))}</div></div>
      <div class="field"><div class="k">分野・主治医</div><div class="v">${escapeHtml([stay && masterName('department', stay.department_id), stay && stay.employee_master && stay.employee_master.employee_name].filter(Boolean).join('・') || '—')}</div></div>
    </div>

    <div class="chips">
      <span class="id-badge">患者ID：${escapeHtml(p.patient_no)}</span>
    </div>
  `;
}

/* ---- 管理者だけの操作 ---- */
async function afterPatientSaved(){
  await loadPatientList();
  await reloadDetail();
}

async function dischargeCurrent(){
  const ok = await confirmModal({
    title: '退院にする',
    message: `${detail.patient.patient_name} さんを今日（${fmtDate(todayISO())}）付けで退院にします。\n患者一覧には表示されなくなります。`,
    okLabel: '退院にする'
  });
  if(!ok) return;
  try{
    await dischargeAdmission(detail.current.admission_id);
    showToast('退院にしました');
    await afterPatientSaved();
  }catch(e){ showError(e, '退院にできませんでした'); }
}

async function deleteCurrent(){
  const ok = await confirmModal({
    title: '患者さんを削除',
    message: `${detail.patient.patient_name} さんを削除します。\nデータは消さずに「削除済み」として残ります（管理画面から元に戻せます）。`,
    okLabel: '削除する', danger: true
  });
  if(!ok) return;
  try{
    await deletePatient(detail.patient.patient_id);
    showToast('削除しました');
    currentPatientId = null;
    await loadPatientList();
    if(admitted.length) renderPatient(admitted[0].patient_master.patient_id);
    else document.getElementById('nurseMain').innerHTML = '';
  }catch(e){ showError(e, '削除できませんでした'); }
}
