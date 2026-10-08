/* 入力用のポップアップ（モーダル）
   openModal({ title, body: 'HTML', submitLabel, onSubmit: async (form) => true で閉じる }) */
function openModal({ title, body, submitLabel = '保存する', onSubmit, danger = false }){
  closeModal();
  const wrap = document.createElement('div');
  wrap.id = 'modal';
  wrap.className = 'modal-back';
  wrap.innerHTML = `
    <form class="modal" novalidate>
      <div class="modal-head">
        <h2>${esc(title)}</h2>
        <button type="button" class="icon-btn" aria-label="閉じる" data-close>×</button>
      </div>
      <div class="modal-body">${body}</div>
      <div class="modal-foot">
        <button type="button" class="light" data-close>キャンセル</button>
        <button type="submit" class="${danger ? 'danger' : 'primary'}">${esc(submitLabel)}</button>
      </div>
    </form>`;
  document.body.appendChild(wrap);
  document.body.classList.add('no-scroll');

  const form = wrap.querySelector('form');
  wrap.querySelectorAll('[data-close]').forEach(b => b.addEventListener('click', closeModal));
  wrap.addEventListener('mousedown', e => { if(e.target === wrap) closeModal(); });
  form.addEventListener('submit', async e => {
    e.preventDefault();
    const btn = form.querySelector('button[type=submit]');
    btn.disabled = true;
    try{
      const ok = await onSubmit(form);
      if(ok !== false) closeModal();
    }finally{
      btn.disabled = false;
    }
  });
  const first = form.querySelector('input, select, textarea');
  if(first) first.focus();
  return form;
}

function closeModal(){
  const m = $('modal');
  if(m) m.remove();
  document.body.classList.remove('no-scroll');
}

document.addEventListener('keydown', e => { if(e.key === 'Escape') closeModal(); });

/* はい／いいえの確認 */
function confirmModal({ title, message, okLabel = 'OK', danger = false }){
  return new Promise(resolve => {
    let decided = false;
    openModal({
      title, danger, submitLabel: okLabel,
      body: `<p class="confirm-text">${esc(message)}</p>`,
      onSubmit: async () => { decided = true; resolve(true); return true; }
    });
    const observer = new MutationObserver(() => {
      if(!$('modal')){ observer.disconnect(); if(!decided) resolve(false); }
    });
    observer.observe(document.body, { childList: true });
  });
}
