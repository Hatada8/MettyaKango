/* 家族画面：病棟とのメッセージ（family_chat） */
async function refreshChat(){
  const chat = document.getElementById('chatBox');
  if(!chat) return;
  try{
    const msgs = await listChat(session.patientId);
    if(msgs.length === 0){
      chat.innerHTML = `<div class="empty">まだメッセージがありません</div>`;
    }else{
      chat.innerHTML = msgs.map(m => {
        const fromFamily = !!m.family_id;
        const who = fromFamily ? 'ご家族' : (m.employee_master ? `${m.employee_master.employee_name}（病棟）` : '病棟');
        return `
          <div class="msg ${fromFamily ? 'me' : 'them'}">
            <span class="who">${escapeHtml(who)}・${fmtDateTime(m.created_at)}</span>${escapeHtml(m.body)}
          </div>`;
      }).join('');
      chat.scrollTop = chat.scrollHeight;
    }
    // 病棟からのメッセージを既読にする
    if(msgs.some(m => m.employee_id && !m.read_flag)) await markChatRead(session.patientId, 'family');
  }catch(e){ showError(e, 'メッセージを読み込めませんでした'); }
}

async function sendMsg(){
  const input = document.getElementById('chatInput');
  const val = input.value.trim();
  if(!val) return;
  input.value = '';
  await appendMsg(val);
}
async function sendStamp(text){
  await appendMsg(text);
}
async function appendMsg(val){
  try{
    await sendChat({ patientId: session.patientId, familyId: session.familyId, body: val });
    await refreshChat();
  }catch(e){ showError(e, '送信できませんでした'); }
}
