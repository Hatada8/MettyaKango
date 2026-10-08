/* 看護師画面：申し送りメモ・プライベートメモ
   どちらも patient_memo テーブル。memo_type_id（1 申し送り / 2 プライベート）で分けています。
   メモは書き足すだけ。削除は管理者だけ（delete_flag を 1 にする）。 */
const MEMO_UI = {
  [MEMO_TYPE.HANDOVER]: { text: 'handoverText', family: null, list: 'handoverList', btn: 'saveHandoverBtn', label: '保存' },
  [MEMO_TYPE.PRIVATE]:  { text: 'privateText',  family: null,             list: 'privateList',  btn: 'savePrivateBtn',  label: 'メモを保存' }
};

async function loadMemos(){
  const id = currentPatientId;
  // このページにある種類のメモだけ読み込む（申し送りページ・プライベートページで別々）
  const types = Object.keys(MEMO_UI).map(Number).filter(t => document.getElementById(MEMO_UI[t].list));
  try{
    const lists = await Promise.all(types.map(t => listMemos(id, t)));
    if(id !== currentPatientId) return;
    types.forEach((t, i) => renderMemoList(t, lists[i]));
  }catch(e){ showError(e, 'メモを読み込めませんでした'); }
}

function renderMemoList(memoTypeId, memos){
  const ui = MEMO_UI[memoTypeId];
  const listEl = document.getElementById(ui.list);
  if(!listEl) return;
  if(!memos.length){
    listEl.innerHTML = `<div class="empty">まだ記録がありません</div>`;
    return;
  }
  const withFamily = !!ui.family;
  listEl.innerHTML = memos.map(m => {
    const canToggle = withFamily && (m.employee_id === session.employeeId || can('can_patient_update'));
    const long = m.content.length > 200 || m.content.split('\n').length > 5;
    return `
      <div class="logitem memo-item">
        <div class="memo-head">
          <span class="t">${fmtDateTime(m.created_at, true)}</span>
          <span class="memo-author">${escapeHtml(m.employee_master ? m.employee_master.employee_name : '')}</span>
          ${withFamily && m.family_visible ? '<span class="family-tag">ご家族にも表示中</span>' : ''}
          <span class="memo-tools">
            ${canToggle ? `<button type="button" class="text-link" onclick="toggleMemoFamily(${m.memo_id}, ${m.family_visible ? 0 : 1})">${m.family_visible ? 'ご家族に表示しない' : 'ご家族にも表示する'}</button>` : ''}
            ${can('can_patient_delete') ? `<button type="button" class="text-link danger-link" onclick="removeMemo(${m.memo_id})">削除</button>` : ''}
          </span>
        </div>
        <div class="memo-body ${long ? 'clamp' : ''}">${escapeHtml(m.content)}</div>
        ${long ? `<button type="button" class="text-link" onclick="expandMemo(this)">続きを読む</button>` : ''}
      </div>`;
  }).join('');
}

function expandMemo(btn){
  const body = btn.previousElementSibling;
  const closed = body.classList.toggle('clamp');
  btn.textContent = closed ? '続きを読む' : 'たたむ';
}

async function saveMemo(memoTypeId){
  const ui = MEMO_UI[memoTypeId];
  const textEl = document.getElementById(ui.text);
  const familyEl = ui.family ? document.getElementById(ui.family) : null;
  const content = textEl.value.trim();
  if(!content){ showToast('メモを入力してください'); return; }

  const btn = document.getElementById(ui.btn);
  btn.disabled = true;
  btn.textContent = '保存中…';
  try{
    await addMemo({
      patientId: currentPatientId,
      admissionId: detail.current ? detail.current.admission_id : null,
      memoTypeId,
      content,
      familyVisible: familyEl && familyEl.checked,
      employeeId: session.employeeId
    });
    textEl.value = '';
    textEl.style.height = '';
    if(familyEl) familyEl.checked = false;
    showToast('保存しました');
    await loadMemos();
  }catch(e){
    showError(e, '保存できませんでした');
  }finally{
    btn.disabled = false;
    btn.textContent = ui.label;
  }
}

async function toggleMemoFamily(memoId, visible){
  try{
    await setMemoFamilyVisible(memoId, visible);
    showToast(visible ? 'ご家族の画面にも表示します' : 'ご家族の画面には表示しません');
    await loadMemos();
  }catch(e){ showError(e, '保存できませんでした'); }
}

async function removeMemo(memoId){
  const ok = await confirmModal({ title: 'メモを削除', message: 'このメモを削除しますか？\n（データは「削除済み」として残ります）', okLabel: '削除する', danger: true });
  if(!ok) return;
  try{
    await deleteMemo(memoId);
    showToast('削除しました');
    await loadMemos();
  }catch(e){ showError(e, '削除できませんでした'); }
}
