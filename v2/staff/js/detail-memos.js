/* 患者詳細：申し送りメモ・プライベートメモ
   どちらも patient_memo テーブル。memo_type_id（1 申し送り / 2 プライベート）で分けています。
   メモは書き足すだけ。削除は管理者だけ（delete_flag を 1 にする）。 */

function setupMemos(){
  autoGrow($('handoverText'));
  autoGrow($('privateText'));

  $('handoverForm').addEventListener('submit', e => {
    e.preventDefault();
    saveMemo(MEMO_TYPE.HANDOVER, $('handoverText'), $('handoverFamily'));
  });
  $('privateForm').addEventListener('submit', e => {
    e.preventDefault();
    saveMemo(MEMO_TYPE.PRIVATE, $('privateText'), null);
  });
}

async function loadMemos(){
  try{
    const [handover, priv] = await Promise.all([
      listMemos(patientId, MEMO_TYPE.HANDOVER),
      listMemos(patientId, MEMO_TYPE.PRIVATE)
    ]);
    renderMemoList($('handoverList'), handover, true);
    renderMemoList($('privateList'), priv, false);
  }catch(e){ showError(e, 'メモを読み込めませんでした'); }
}

function renderMemoList(container, memos, withFamily){
  if(!memos.length){
    container.innerHTML = '<p class="empty">まだメモはありません。</p>';
    return;
  }
  container.innerHTML = memos.map(m => {
    const mine = m.employee_id === session.employeeId;
    const canToggle = withFamily && (mine || can('can_patient_update'));
    const long = m.content.length > 220 || m.content.split('\n').length > 6;
    return `
      <div class="entry">
        <div class="entry-head">
          <b>${esc(m.employee_master ? m.employee_master.employee_name : '—')}</b>
          <span>${fmtDateTime(m.created_at, true)}</span>
          ${withFamily && m.family_visible ? '<span class="badge info">ご家族にも表示中</span>' : ''}
          <span class="spacer"></span>
          ${canToggle ? `<button type="button" class="text-link" onclick="toggleMemoFamily(${m.memo_id}, ${m.family_visible ? 0 : 1})">${m.family_visible ? 'ご家族に表示しない' : 'ご家族にも表示する'}</button>` : ''}
          ${can('can_patient_delete') ? `<button type="button" class="text-link" style="color:var(--red)" onclick="removeMemo(${m.memo_id})">削除</button>` : ''}
        </div>
        <p class="entry-body ${long ? 'clamp' : ''}">${esc(m.content)}</p>
        ${long ? `<button type="button" class="text-link" onclick="expandMemo(this)">続きを読む</button>` : ''}
      </div>`;
  }).join('');
}

function expandMemo(btn){
  const body = btn.previousElementSibling;
  const open = body.classList.toggle('clamp');
  btn.textContent = open ? '続きを読む' : 'たたむ';
}

async function saveMemo(memoTypeId, textarea, familyCheck){
  const content = textarea.value.trim();
  if(!content){ toast('メモを入力してください'); return; }
  try{
    await addMemo({
      patientId,
      admissionId: detail.current ? detail.current.admission_id : null,
      memoTypeId,
      content,
      familyVisible: familyCheck && familyCheck.checked,
      employeeId: session.employeeId
    });
    textarea.value = '';
    textarea.style.height = '';
    if(familyCheck) familyCheck.checked = false;
    toast('保存しました');
    await loadMemos();
  }catch(e){ showError(e, '保存できませんでした'); }
}

async function toggleMemoFamily(memoId, visible){
  try{
    await setMemoFamilyVisible(memoId, visible);
    toast(visible ? 'ご家族の画面にも表示します' : 'ご家族の画面には表示しません');
    await loadMemos();
  }catch(e){ showError(e, '保存できませんでした'); }
}

async function removeMemo(memoId){
  const ok = await confirmModal({ title: 'メモを削除', message: 'このメモを削除しますか？\n（データは「削除済み」として残ります）', okLabel: '削除する', danger: true });
  if(!ok) return;
  try{
    await deleteMemo(memoId);
    toast('削除しました');
    await loadMemos();
  }catch(e){ showError(e, '削除できませんでした'); }
}
