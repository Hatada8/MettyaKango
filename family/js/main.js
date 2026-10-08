/* 家族画面：起動処理・患者さんの様子・AI要約 */
const LEVEL_MESSAGE = {
  1: '♡ 落ち着いて過ごされています',
  2: '♡ 看護師が様子を見守っています',
  3: ''
};

async function initFamilyPage(){
  if(!requireFamily()) return;
  document.getElementById('familyWelcome').textContent = `${session.email} としてログイン中`;
  try{
    await loadMasters();
  }catch(e){
    showError(e, 'データベースに接続できませんでした');
    return;
  }
  await refreshFamilyPage();

  if(familyPollTimer) clearInterval(familyPollTimer);
  familyPollTimer = setInterval(() => { if(!document.hidden) refreshFamilyPage(); }, 15000);
}
document.addEventListener('DOMContentLoaded', initFamilyPage);

async function refreshFamilyPage(){
  await Promise.all([refreshPatient(), refreshAiSummary(), refreshChat()]);
}

async function refreshPatient(){
  try{
    const [d, s] = await Promise.all([
      getPatientDetail(session.patientId),
      listPatientSymptoms(session.patientId)
    ]);
    if(!d){
      document.getElementById('familyPatientName').textContent = '患者さんの情報が見つかりません';
      document.getElementById('familyPatientMeta').textContent = '病院にお問い合わせください。';
      return;
    }
    familyDetail = d;
    const p = d.patient;
    const age = calcAge(p.birth_date);
    const diag = s.filter(x => x.symptom_master && x.symptom_master.symptom_type_id === SYMPTOM_TYPE.DIAGNOSIS)
      .map(x => x.symptom_master.symptom_name).join('、');

    document.getElementById('familyPatientName').textContent = `${p.patient_name} さん${age != null ? `（${age}歳）` : ''}`;
    const meta = d.current
      ? [`${d.current.room_no ?? '—'}号室に入院中`, `入院${dayOfStay(d.current.admitted_on)}日目`, diag ? `診断名：${diag}` : '']
      : ['退院されました'];
    document.getElementById('familyPatientMeta').textContent = meta.filter(Boolean).join('／');
    document.getElementById('familyState').textContent = d.current ? (LEVEL_MESSAGE[d.current.condition_level_id] || '') : '';
  }catch(e){ showError(e, '読み込めませんでした'); }
}

/* 看護師が「ご家族にも表示する」にした AI 要約だけを出す */
async function refreshAiSummary(){
  const box = document.getElementById('familyAiSummaryBox');
  try{
    const data = await getFamilyAiSummary(session.patientId);
    if(!data){
      box.innerHTML = `<span class="tag">AI要約・まだありません</span>看護師が記録を要約してお知らせすると、ここに様子が表示されます。`;
      return;
    }
    const at = data.edited_text ? data.updated_at : data.generated_at;
    box.innerHTML = `<span class="tag">AI要約・${fmtDateTime(at, true)} 更新</span><div class="ai-text">${escapeHtml(aiSummaryText(data))}</div>`;
  }catch(e){ showError(e, 'AI要約を読み込めませんでした'); }
}
