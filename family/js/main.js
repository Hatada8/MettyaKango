/* 家族画面：起動処理・患者さんの様子・AI要約 */
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
  await Promise.all([refreshPatient(), refreshChat()]);
}

async function refreshPatient(){
  try{
    const [d, s] = await Promise.all([
      getPatientDetail(session.patientId),
      listPatientSymptomsWithInfo(session.patientId)
    ]);
    if(!d){
      document.getElementById('familyPatientName').textContent = '患者さんの情報が見つかりません';
      document.getElementById('familyPatientMeta').textContent = '病院にお問い合わせください。';
      return;
    }
    familyDetail = d;
    applyChatMode();
    const p = d.patient;
    const age = calcAge(p.birth_date);
    const diag = s.filter(x => x.symptom_master && x.symptom_master.symptom_type_id === SYMPTOM_TYPE.DIAGNOSIS)
      .map(x => x.symptom_master.symptom_name).join('、');

    document.getElementById('familyPatientName').textContent = `${p.patient_name} さん${age != null ? `（${age}歳）` : ''}`;
    const meta = d.current
      ? [`${d.current.room_no ?? '—'}号室に入院中`, `入院${dayOfStay(d.current.admitted_on)}日目`, diag ? `診断名：${diag}` : '']
      : ['退院されました'];
    document.getElementById('familyPatientMeta').textContent = meta.filter(Boolean).join('／');

    familyKeywords = s.filter(x => x.symptom_master &&
      [SYMPTOM_TYPE.DIAGNOSIS, SYMPTOM_TYPE.HISTORY].includes(x.symptom_master.symptom_type_id));
    renderKeywords();
  }catch(e){ showError(e, '読み込めませんでした'); }
}

/* 病状のキーワード（診断名・既往歴）を並べる。タップすると下に説明が出る */
function renderKeywords(){
  const list = document.getElementById('keywordList');
  const hint = document.querySelector('.keyword-hint');
  if(!familyKeywords.length){
    list.innerHTML = '<span class="muted">登録されている病状はありません。</span>';
    hint.classList.add('hidden');
    closeKeyword();
    return;
  }
  hint.classList.remove('hidden');
  list.innerHTML = familyKeywords.map(x => {
    const m = x.symptom_master;
    const isHistory = m.symptom_type_id === SYMPTOM_TYPE.HISTORY;
    const on = x.symptom_id === openKeywordId;
    return `<button type="button" class="keyword ${isHistory ? 'history' : ''} ${on ? 'on' : ''}"
      aria-expanded="${on}" onclick="toggleKeyword(${x.symptom_id})">${isHistory ? '<small>既往歴</small>' : ''}${escapeHtml(m.symptom_name)}</button>`;
  }).join('');
  if(openKeywordId && !familyKeywords.some(x => x.symptom_id === openKeywordId)) closeKeyword();
  else if(openKeywordId) renderKeywordDetail();
}

function toggleKeyword(symptomId){
  openKeywordId = (openKeywordId === symptomId) ? null : symptomId;
  renderKeywords();
  if(!openKeywordId) closeKeyword();
}

function closeKeyword(){
  openKeywordId = null;
  const box = document.getElementById('keywordDetail');
  box.classList.add('hidden');
  box.innerHTML = '';
}

function renderKeywordDetail(){
  const x = familyKeywords.find(k => k.symptom_id === openKeywordId);
  const box = document.getElementById('keywordDetail');
  if(!x){ closeKeyword(); return; }
  const m = x.symptom_master;
  const type = m.symptom_type_id === SYMPTOM_TYPE.HISTORY ? '既往歴（過去にかかった病気）' : '診断名';
  box.innerHTML = `
    <div class="keyword-detail-head"><b>${escapeHtml(m.symptom_name)}</b><span>${type}</span></div>
    <p>${m.symptom_description ? escapeHtml(m.symptom_description) : 'この病状の説明は、まだ登録されていません。詳しくは担当の医師・看護師におたずねください。'}</p>
    ${x.onset_on ? `<p class="keyword-date">診断・発症日：${fmtDate(x.onset_on)}</p>` : ''}
    <p class="keyword-note">※一般的な説明です。患者さんごとの詳しい状態は、担当の医師・看護師におたずねください。</p>`;
  box.classList.remove('hidden');
}

