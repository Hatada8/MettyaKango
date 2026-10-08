/* ---------------- nurse: 今日の簡単記録（申し送りメモ） ---------------- */
function renderLogList(records){
  const listEl = document.getElementById('logList');
  if(!listEl) return;
  if(records.length === 0){
    listEl.innerHTML = `<div style="font-size:12.5px; color:var(--ink-soft);">まだ記録がありません</div>`;
    return;
  }
  listEl.innerHTML = records.map(r => `
    <div class="logitem"><span class="t">${escapeHtml(r.time)}</span><span>【${escapeHtml(r.category)}】${escapeHtml(r.memo)}　<span style="color:var(--ink-soft);">(${escapeHtml(r.author||'')})</span></span></div>
  `).join('');
}

async function addLog(id){
  const cat = document.getElementById('logCategory').value;
  const time = document.getElementById('logTime').value || nowTimeStr();
  const memoInput = document.getElementById('logMemo');
  const memo = memoInput.value.trim();
  if(!memo){ showToast('メモを入力してください'); return; }

  const btn = document.getElementById('saveLogBtn');
  btn.disabled = true;
  btn.textContent = '保存中…';

  const entry = { time, category:cat, memo, author: currentUser ? currentUser.name : '看護師' };
  const ok = await addRecord(id, entry);

  btn.disabled = false;
  btn.textContent = '記録を保存';

  if(ok){
    const records = await getRecords(id);
    renderLogList(records);
    memoInput.value = '';
    showToast('記録を保存しました');
  }
}
