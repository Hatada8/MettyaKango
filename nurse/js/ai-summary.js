/* 看護師画面：AI要約（自由記述 → 要約）
   ・自由記述の文章を書いて「要約する」を押すと、短くまとめた文章ができる
   ・もとの文章と要約の文字数を並べて比べられる
   ・作成後は要約を手直しして保存できる（作り直すと、手直しした文章は新しい要約で上書きされる）
   ・今は何回でも作り直せる（AI_SUMMARY_ONCE を true にすると、1 回の入院につき 1 回だけになる） */
let aiSummary = null;
let aiEditing = false;
let aiSourceUsed = '';   // 直前に要約したときの自由記述（原文を保存する列がまだないときの代わり）

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

/* 文字数の比べ方（もとの文章 → 要約） */
function countCompareHtml(sourceText, summaryText, edited){
  const sum = countChars(summaryText);
  if(!sourceText) return `<div class="ai-compare">要約：<b>${sum}</b>文字${edited ? '（手直し後）' : ''}</div>`;
  const src = countChars(sourceText);
  const pct = src ? Math.round(sum / src * 100) : 0;
  return `
    <div class="ai-compare">
      <span>自由記述 <b>${src}</b>文字</span>
      <span class="arrow">→</span>
      <span>要約${edited ? '（手直し後）' : ''} <b>${sum}</b>文字</span>
      <span class="ratio">${pct}%（${src - sum >= 0 ? `${src - sum}文字減` : `${sum - src}文字増`}）</span>
    </div>`;
}

function updateSourceCount(){
  const el = document.getElementById('aiSource');
  const out = document.getElementById('aiSourceCount');
  if(el && out) out.textContent = `${countChars(el.value)}文字`;
}

function renderAiSummary(){
  const area = document.getElementById('aiArea');
  if(!area) return;

  const canMake = !!detail.current && (!aiSummary || !AI_SUMMARY_ONCE);
  const typed = document.getElementById('aiSource');
  const sourceValue = typed ? typed.value : (aiSummary && aiSummary.source_text) || '';

  let html = '';
  if(canMake){
    html += `
      <label class="ai-label" for="aiSource">自由記述（今日の様子・気づいたことを、思いつくままに書いてください）</label>
      <textarea class="memo-input" id="aiSource" rows="7" oninput="autoGrow(this); updateSourceCount()"
        placeholder="例：朝食は5割ほど摂取。9時に37.8℃の発熱があり、解熱剤を使用した。ご本人から腰の痛みの訴えがあった。午後はリハビリで歩行器を使って廊下を一周できた。">${escapeHtml(sourceValue)}</textarea>
      <div class="ai-count">書いた文章：<span id="aiSourceCount">0文字</span><span class="muted">（空白・改行は数えません）</span></div>
      <button class="ai-btn" id="aiBtn" onclick="runAI()">
        <span class="spin"></span>
        ✨ ${aiSummary ? 'もう一度要約する' : '要約する'}
      </button>`;
  }else if(!aiSummary){
    html += '<div class="empty">退院済みのため、新しい要約は作成できません。</div>';
  }

  if(aiSummary){
    const s = aiSummary;
    const meta = [`作成：${fmtDateTime(s.generated_at, true)}（${s.generator ? s.generator.employee_name : '—'}）`];
    if(s.edited_text) meta.push(`手直し：${fmtDateTime(s.updated_at, true)}（${s.editor ? s.editor.employee_name : '—'}）`);
    html += `
      <div class="ai-summary show" style="margin-top:18px;">
        <span class="tag">AI要約結果</span>
        ${aiEditing
          ? `<textarea class="memo-input ai-edit" id="aiEditText">${escapeHtml(aiSummaryText(s))}</textarea>`
          : `<div class="ai-text">${escapeHtml(aiSummaryText(s))}</div>`}
        <div class="ai-meta">${meta.map(escapeHtml).join('　／　')}</div>
      </div>
      ${countCompareHtml(s.source_text || aiSourceUsed, aiSummaryText(s), !!s.edited_text)}
      <div class="ai-actions">
        ${aiEditing
          ? `<button type="button" class="save-btn" onclick="saveAiEdit()">保存する</button>
             <button type="button" class="mini-btn" onclick="aiEditing = false; renderAiSummary()">やめる</button>`
          : `<button type="button" class="mini-btn" onclick="aiEditing = true; renderAiSummary()">✎ 手直しする</button>`}
      </div>
      ${s.edited_text ? `
        <details class="ai-original">
          <summary>AIが作った元の要約を見る</summary>
          <div class="ai-text">${escapeHtml(s.generated_text)}</div>
        </details>` : ''}`;
  }

  area.innerHTML = html;
  const src = document.getElementById('aiSource');
  if(src){ autoGrow(src); updateSourceCount(); }
  if(aiEditing) autoGrow(document.getElementById('aiEditText'));
}

async function runAI(){
  if(!detail.current) return;
  const sourceText = document.getElementById('aiSource').value.trim();
  if(!sourceText){ showToast('自由記述を入力してください'); return; }

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
    const text = await generateAiSummaryText({ sourceText });
    aiSourceUsed = sourceText;
    const result = await createAiSummary({
      admissionId: detail.current.admission_id,
      patientId: currentPatientId,
      text,
      sourceText,
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
