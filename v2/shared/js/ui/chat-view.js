/* 職員と家族のチャット表示（職員画面・家族画面の両方で使う）
   mySide：'staff' なら職員の発言を右側、'family' なら家族の発言を右側に出す */
function renderChatMessages(container, messages, mySide){
  if(!messages.length){
    container.innerHTML = '<p class="empty">まだメッセージはありません。</p>';
    return;
  }
  container.innerHTML = messages.map(m => {
    const fromStaff = !!m.employee_id;
    const mine = (mySide === 'staff') === fromStaff;
    const who = fromStaff
      ? `${(m.employee_master && m.employee_master.employee_name) || '職員'}`
      : 'ご家族';
    return `
      <div class="bubble-row ${mine ? 'mine' : ''}">
        <div class="bubble">
          <small>${esc(who)}・${fmtDateTime(m.created_at)}</small>
          <p>${esc(m.body)}</p>
        </div>
      </div>`;
  }).join('');
  container.scrollTop = container.scrollHeight;
}
