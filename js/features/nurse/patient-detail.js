/* ---------------- nurse: patient detail ---------------- */
async function renderPatient(id){
  currentPatientId = id;
  attachedImage = null;
  if(nursePollTimer){ clearInterval(nursePollTimer); nursePollTimer = null; }
  renderPatientList();
  const p = patients.find(x=>x.id===id);
  if(!p) return;
  const main = document.getElementById('nurseMain');
  main.innerHTML = `
    <div class="card">
      <div class="profile-top" style="justify-content:space-between;">
        <div style="display:flex; align-items:center; gap:16px;">
          <div class="avatar" style="background:var(--nurse-deep)">${escapeHtml(String(p.name||'？')[0])}</div>
          <div>
            <div class="pname">${escapeHtml(p.name)}　様</div>
            <div class="psub">${escapeHtml(p.room)}号室・${escapeHtml(p.age)}歳・${escapeHtml(p.sex)}／入院日 ${escapeHtml(p.admitted)}</div>
          </div>
        </div>
      </div>
      <div class="grid2">
        <div class="field"><div class="k">診断名</div><div class="v">${escapeHtml(p.diag)}</div></div>
        <div class="field"><div class="k">アレルギー</div><div class="v">${escapeHtml(p.allergy)}</div></div>
      </div>
      <div class="chips" id="issuesChips">
        ${p.issues.map((i, idx) => `<span class="chip ${i.includes('要注意')||i.includes('リスク')?'warn':''}">${escapeHtml(i)} <span class="chip-remove" onclick="removeIssueAt(${p.id}, ${idx})">×</span></span>`).join('')}
        <span class="id-badge">家族用ID：${escapeHtml(p.familyCode)}</span>
      </div>
      <div class="issue-add-row">
        <select id="issuePreset">
          <option value="">よく使う項目から選ぶ</option>
          <option value="転倒リスク:低">転倒リスク:低</option>
          <option value="転倒リスク:中">転倒リスク:中</option>
          <option value="転倒リスク:高">転倒リスク:高</option>
          <option value="発熱あり">発熱あり</option>
          <option value="食事量:低下">食事量:低下</option>
          <option value="食事量:良好">食事量:良好</option>
          <option value="リハビリ意欲:良好">リハビリ意欲:良好</option>
          <option value="要注意">要注意</option>
          <option value="家族への説明:未実施">家族への説明:未実施</option>
        </select>
        <input type="text" id="issueCustom" placeholder="または自由入力">
        <button type="button" onclick="addIssue(${p.id})">＋ 追加</button>
      </div>
    </div>

    <div class="card">
      <h3><span class="n">●</span> カルテ・記録メモ</h3>
      <textarea class="notes" id="notesArea" placeholder="カルテの内容をここに貼り付け（コピペ）してください">${escapeHtml(p.rawNotes)}</textarea>

      <div class="image-attach-row">
        <button type="button" class="attach-btn" onclick="document.getElementById('imageFileInput').click()">🖼️ 画像を選択</button>
        <input type="file" id="imageFileInput" accept="image/*" style="display:none;" onchange="handleImageFileSelect(event)">
        <span class="attach-hint">またはこのカード内でスクリーンショットを貼り付け（Ctrl+V）</span>
      </div>
      <div id="imagePreviewWrap" style="display:none;">
        <img id="imagePreviewThumb" src="" alt="添付画像プレビュー">
        <button type="button" class="remove-image-btn" onclick="removeAttachedImage()">× 画像を削除</button>
      </div>

      <button class="ai-btn" id="aiBtn" onclick="runAI(${p.id})">
        <span class="spin"></span>
        ✨ AIで要約する
      </button>
      <div class="ai-summary" id="aiSummaryBox">
        <span class="tag">AI要約結果</span>
        <span id="aiSummaryText"></span>
      </div>
    </div>

    <div class="card">
      <h3>🗒️ 今日の簡単記録（申し送りメモ）</h3>
      <div class="log-form">
        <div class="log-row">
          <select id="logCategory">
            <option>バイタル</option>
            <option>食事</option>
            <option>リハビリ</option>
            <option>本人・家族の様子</option>
            <option>その他</option>
          </select>
          <input type="time" id="logTime" value="${nowTimeStr()}" style="width:110px;">
        </div>
        <input type="text" id="logMemo" placeholder="例：食事8割摂取、笑顔あり" style="border:1px solid var(--line); border-radius:8px; padding:10px 12px; font-size:13px; background:var(--bg);">
        <button class="save-btn" id="saveLogBtn" type="button" onclick="addLog(${p.id})">記録を保存</button>
      </div>
      <div class="loglist" id="logList">
        <div style="font-size:12.5px; color:var(--ink-soft);">読み込み中…</div>
      </div>
    </div>

    <div class="card">
      <h3>📅 家族からの面談予約リクエスト</h3>
      <div id="apptRequestList">
        <div style="font-size:12.5px; color:var(--ink-soft);">読み込み中…</div>
      </div>
    </div>

    <div class="card">
      <h3>💬 家族とのメッセージ</h3>
      <div class="chat nurse-chat" id="nurseChatBox" style="max-height:220px;">
        <div style="font-size:12.5px; color:var(--ink-soft);">読み込み中…</div>
      </div>
      <div class="chat-input">
        <input id="nurseChatInput" type="text" placeholder="家族へメッセージを送る…" onkeydown="if(event.key==='Enter') sendNurseMsg(${p.id})">
        <button class="chat-send" onclick="sendNurseMsg(${p.id})">送信</button>
      </div>
    </div>
  `;
  const records = await getRecords(id);
  renderLogList(records);
  const appts = await getAppointments(id);
  renderApptRequestList(appts, id);
  await refreshNurseChat(id);
  nursePollTimer = setInterval(async ()=>{
    await refreshNurseChat(id);
    const latestAppts = await getAppointments(id);
    renderApptRequestList(latestAppts, id);
  }, 8000);
}

function runAI(id){
  const p = patients.find(x=>x.id===id);
  const btn = document.getElementById('aiBtn');
  const box = document.getElementById('aiSummaryBox');
  const text = document.getElementById('aiSummaryText');
  const notes = document.getElementById('notesArea').value.trim();
  if(!notes && !attachedImage){ showToast('カルテのテキストを貼り付けるか、画像を添付してください'); return; }
  btn.classList.add('loading');
  btn.disabled = true;
  box.classList.remove('show');
  text.textContent = '';
  setTimeout(async ()=>{
    btn.classList.remove('loading');
    btn.disabled = false;
    box.classList.add('show');
    const summary = notes
      ? (p.aiSummary && notes === p.rawNotes ? p.aiSummary : notes)
      : (p.aiSummary || '（画像からの自動読み取りは準備中のデモ表示です。テキストの貼り付けも合わせてお試しください）');
    typeText(text, summary);
    const ok = await saveAiSummary(id, summary);
    if(ok){
      showToast((!notes && attachedImage)
        ? 'AI要約を保存しました（画像添付・デモ表示）'
        : 'AI要約を保存しました（家族画面にも反映されます）');
    }
  }, 1100);
}

/* ---------------- カルテ画像の添付（ファイル選択／貼り付け） ---------------- */
function handleImageFileSelect(event){
  const file = event.target.files[0];
  if(file) loadImageFile(file);
  event.target.value = '';
}
function loadImageFile(file){
  if(!file.type.startsWith('image/')){ showToast('画像ファイルを選択してください'); return; }
  const reader = new FileReader();
  reader.onload = function(e){
    attachedImage = e.target.result;
    const wrap = document.getElementById('imagePreviewWrap');
    const thumb = document.getElementById('imagePreviewThumb');
    if(wrap && thumb){
      thumb.src = attachedImage;
      wrap.style.display = 'flex';
    }
    showToast('画像を読み込みました');
  };
  reader.readAsDataURL(file);
}
function removeAttachedImage(){
  attachedImage = null;
  const wrap = document.getElementById('imagePreviewWrap');
  if(wrap) wrap.style.display = 'none';
}
document.addEventListener('paste', function(e){
  const nurseScreen = document.getElementById('screen-nurse');
  if(!nurseScreen || !nurseScreen.classList.contains('active')) return;
  const items = e.clipboardData && e.clipboardData.items;
  if(!items) return;
  for(const item of items){
    if(item.type && item.type.startsWith('image/')){
      const file = item.getAsFile();
      if(file){ loadImageFile(file); e.preventDefault(); }
      break;
    }
  }
});

/* ---------------- 患者ステータス（issues）の追加・削除 ---------------- */
async function addIssue(patientId){
  const preset = document.getElementById('issuePreset').value;
  const custom = document.getElementById('issueCustom').value.trim();
  const value = custom || preset;
  if(!value){ showToast('項目を選択するか、自由入力してください'); return; }
  const p = patients.find(x=>x.id===patientId);
  if(!p) return;
  if(p.issues.includes(value)){ showToast('すでに追加されています'); return; }
  p.issues.push(value);
  const ok = await updatePatient(p);
  if(ok){
    document.getElementById('issueCustom').value = '';
    document.getElementById('issuePreset').value = '';
    renderIssuesChips(p);
    showToast('ステータスを追加しました');
  }
}
async function removeIssueAt(patientId, index){
  const p = patients.find(x=>x.id===patientId);
  if(!p || index < 0 || index >= p.issues.length) return;
  p.issues = p.issues.filter((_, i) => i !== index);
  const ok = await updatePatient(p);
  if(ok){
    renderIssuesChips(p);
    showToast('ステータスを削除しました');
  }
}
function renderIssuesChips(p){
  const el = document.getElementById('issuesChips');
  if(!el) return;
  el.innerHTML = p.issues.map((i, idx) => `
    <span class="chip ${i.includes('要注意')||i.includes('リスク')?'warn':''}">${escapeHtml(i)} <span class="chip-remove" onclick="removeIssueAt(${p.id}, ${idx})">×</span></span>
  `).join('') + `<span class="id-badge">家族用ID：${escapeHtml(p.familyCode)}</span>`;
}
