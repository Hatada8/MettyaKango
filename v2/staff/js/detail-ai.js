/* 患者詳細：AI 要約
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

function renderAiSummary(){
  const panel = $('aiPanel');
  const head = `
    <div class="eyebrow">✦ AI SUMMARY</div>
    <h2>AI要約</h2>`;

  // まだ作っていない
  if(!aiSummary){
    if(!detail.current){
      panel.innerHTML = head + '<p class="muted">退院済みのため、新しい要約は作成できません。</p>';
      return;
    }
    panel.innerHTML = head + `
      <p class="muted">
        これまでの記録（基本情報・診断・入院歴・申し送り）を、ひな形に沿ってまとめます。<br>
        ${AI_SUMMARY_ONCE
          ? '<b>このボタンは、この入院中に1回だけ押せます。</b>作成したあとは、文章を手直しして保存できます。'
          : '作成したあとは、文章を手直しして保存できます。記録が増えたら、何回でも作り直せます。'}
      </p>
      <button type="button" class="primary" id="aiBtn" onclick="runAiSummary()">✦ AIで要約する</button>`;
    return;
  }

  // 作成済み
  const s = aiSummary;
  const meta = [`作成：${fmtDateTime(s.generated_at, true)}（${s.generator ? s.generator.employee_name : '—'}）`];
  if(s.edited_text) meta.push(`手直し：${fmtDateTime(s.updated_at, true)}（${s.editor ? s.editor.employee_name : '—'}）`);
  const canRegenerate = !AI_SUMMARY_ONCE && !!detail.current && !aiEditing;

  panel.innerHTML = head + `
    ${AI_SUMMARY_ONCE ? '<p class="muted">この入院のAI要約は作成済みです（作成は1回だけ）。</p>' : ''}
    <div class="letter">
      ${aiEditing
        ? `<textarea class="input" id="aiEditText">${esc(aiSummaryText(s))}</textarea>`
        : `<p>${esc(aiSummaryText(s))}</p>`}
      <div class="ai-meta">${meta.map(esc).join('　／　')}</div>
    </div>
    <div class="ai-actions">
      ${aiEditing
        ? `<button type="button" class="primary" onclick="saveAiEdit()">保存する</button>
           <button type="button" class="light" onclick="aiEditing = false; renderAiSummary()">やめる</button>`
        : `<button type="button" class="light" onclick="aiEditing = true; renderAiSummary()">✎ 手直しする</button>
           ${canRegenerate ? '<button type="button" class="primary" id="aiBtn" onclick="runAiSummary()">✦ もう一度要約する</button>' : ''}`}
      <label class="check"><input type="checkbox" ${s.family_visible ? 'checked' : ''} onchange="toggleAiFamily(this.checked)"> ご家族にも表示する</label>
    </div>
    ${s.edited_text ? `
      <details class="ai-original">
        <summary>AIが作った元の文章を見る</summary>
        <pre>${esc(s.generated_text)}</pre>
      </details>` : ''}`;

  if(aiEditing) autoGrow($('aiEditText'));
}

async function runAiSummary(){
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
  const btn = $('aiBtn');
  const label = btn.textContent;
  btn.disabled = true;
  btn.textContent = '要約しています…';
  try{
    const [allSymptoms, handoverMemos] = await Promise.all([
      listPatientSymptoms(patientId),
      listMemos(patientId, MEMO_TYPE.HANDOVER)
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
      patientId,
      text,
      employeeId: session.employeeId
    });
    if(result.already) toast('この入院のAI要約はすでに作成されています');
    else toast(result.regenerated ? 'AI要約を作り直しました' : 'AI要約を作成しました');
    await loadAiSummary();
  }catch(e){
    showError(e, 'AI要約を作成できませんでした');
    btn.disabled = false;
    btn.textContent = label;
  }
}

async function saveAiEdit(){
  const text = $('aiEditText').value.trim();
  if(!text){ toast('文章が空です'); return; }
  try{
    await saveAiSummaryEdit(aiSummary.ai_summary_id, text, session.employeeId);
    toast('保存しました');
    await loadAiSummary();
  }catch(e){ showError(e, '保存できませんでした'); }
}

async function toggleAiFamily(visible){
  try{
    await setAiSummaryFamilyVisible(aiSummary.ai_summary_id, visible);
    aiSummary.family_visible = visible ? 1 : 0;
    toast(visible ? 'ご家族の画面にも表示します' : 'ご家族の画面には表示しません');
  }catch(e){
    showError(e, '保存できませんでした');
    renderAiSummary();
  }
}
