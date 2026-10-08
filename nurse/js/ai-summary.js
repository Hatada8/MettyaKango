/* 看護師画面：AI要約
   ・今は何回でも作り直せる（AI_SUMMARY_ONCE を true にすると、1 回の入院につき 1 回だけになる）
   ・作成後は手直しして保存できる（作り直すと、手直しした文章は新しい要約で上書きされる）
   ・「ご家族にも表示する」にチェックすると家族画面にも出る */
let aiSummary = null;
let aiEditing = false;

async function loadAiSummary(){
  const stay = currentStay();
  try{
    aiSummary = stay ? await getAiSummary(stay.admission_id) : null;
  }catch(e){
    showError(e, 'AI要約を読み込めませんでした');
    aiSummary = null;
  }
  aiEditing = false;
  renderAiSummary();
}

function aiButtonHtml(label){
  return `
    <button class="ai-btn" id="aiBtn" onclick="runAI()">
      <span class="spin"></span>
      ${label}
    </button>`;
}

function renderAiSummary(){
  const area = document.getElementById('aiArea');
  if(!area) return;

  if(!aiSummary){
    if(!detail.current){
      area.innerHTML = '<div class="empty">退院済みのため、新しい要約は作成できません。</div>';
      return;
    }
    area.innerHTML = `
      <p class="muted" style="margin:0;">
        これまでの記録（基本情報・診断・入院歴・申し送りメモ）を、ひな形に沿ってまとめます。<br>
        ${AI_SUMMARY_ONCE
          ? '<b>このボタンは、この入院中に1回だけ押せます。</b>作成したあとは、文章を手直しして保存できます。'
          : '作成したあとは、文章を手直しして保存できます。記録が増えたら、何回でも作り直せます。'}
      </p>
      ${aiButtonHtml('✨ AIで要約する')}`;
    return;
  }

  const s = aiSummary;
  const meta = [`作成：${fmtDateTime(s.generated_at, true)}（${s.generator ? s.generator.employee_name : '—'}）`];
  if(s.edited_text) meta.push(`手直し：${fmtDateTime(s.updated_at, true)}（${s.editor ? s.editor.employee_name : '—'}）`);
  const canRegenerate = !AI_SUMMARY_ONCE && !!detail.current && !aiEditing;

  area.innerHTML = `
    <div class="ai-summary show" style="margin-top:0;">
      <span class="tag">AI要約結果${AI_SUMMARY_ONCE ? '（この入院では作成済み・作成は1回だけ）' : ''}</span>
      ${aiEditing
        ? `<textarea class="memo-input ai-edit" id="aiEditText">${escapeHtml(aiSummaryText(s))}</textarea>`
        : `<div class="ai-text">${escapeHtml(aiSummaryText(s))}</div>`}
      <div class="ai-meta">${meta.map(escapeHtml).join('　／　')}</div>
    </div>
    <div class="ai-actions">
      ${aiEditing
        ? `<button type="button" class="save-btn" onclick="saveAiEdit()">保存する</button>
           <button type="button" class="mini-btn" onclick="aiEditing = false; renderAiSummary()">やめる</button>`
        : `<button type="button" class="mini-btn" onclick="aiEditing = true; renderAiSummary()">✎ 手直しする</button>`}
      <label class="check"><input type="checkbox" ${s.family_visible ? 'checked' : ''} onchange="toggleAiFamily(this.checked)"> ご家族にも表示する</label>
    </div>
    ${canRegenerate ? aiButtonHtml('✨ もう一度要約する') : ''}
    ${s.edited_text ? `
      <details class="ai-original">
        <summary>AIが作った元の文章を見る</summary>
        <div class="ai-text">${escapeHtml(s.generated_text)}</div>
      </details>` : ''}`;

  if(aiEditing) autoGrow(document.getElementById('aiEditText'));
}

async function runAI(){
  if(!detail.current) return;
  // 作り直すと手直しした文章は消えるので、確認する
  if(aiSummary && aiSummary.edited_text){
    const ok = await confirmModal({
      title: 'もう一度要約する',
      message: '手直しした文章は、新しい要約で上書きされます。よろしいですか？',
      okLabel: '要約する'
    });
    if(!ok) return;
  }
  const btn = document.getElementById('aiBtn');
  btn.classList.add('loading');
  btn.disabled = true;
  try{
    const [allSymptoms, handoverMemos] = await Promise.all([
      listPatientSymptoms(currentPatientId),
      listMemos(currentPatientId, MEMO_TYPE.HANDOVER)
    ]);
    const text = await generateAiSummaryText({
      patient: detail.patient,
      current: detail.current,
      admissions: detail.admissions,
      symptoms: allSymptoms,
      handoverMemos
    });
    const result = await createAiSummary({
      admissionId: detail.current.admission_id,
      patientId: currentPatientId,
      text,
      employeeId: session.employeeId
    });
    if(result.already) showToast('この入院のAI要約はすでに作成されています');
    else showToast(result.regenerated ? 'AI要約を作り直しました' : 'AI要約を作成しました');
    await loadAiSummary();
  }catch(e){
    showError(e, 'AI要約を作成できませんでした');
    btn.classList.remove('loading');
    btn.disabled = false;
  }
}

async function saveAiEdit(){
  const text = document.getElementById('aiEditText').value.trim();
  if(!text){ showToast('文章が空です'); return; }
  try{
    await saveAiSummaryEdit(aiSummary.ai_summary_id, text, session.employeeId);
    showToast('保存しました');
    await loadAiSummary();
  }catch(e){ showError(e, '保存できませんでした'); }
}

async function toggleAiFamily(visible){
  try{
    await setAiSummaryFamilyVisible(aiSummary.ai_summary_id, visible);
    aiSummary.family_visible = visible ? 1 : 0;
    showToast(visible ? 'ご家族の画面にも表示します' : 'ご家族の画面には表示しません');
  }catch(e){
    showError(e, '保存できませんでした');
    renderAiSummary();
  }
}
