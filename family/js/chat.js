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
  if(!canSendChat()){ showToast('退院されたため、送信できません'); return; }
  try{
    await sendChat({ patientId: session.patientId, familyId: session.familyId, body: val });
    await refreshChat();
  }catch(e){ showError(e, '送信できませんでした'); }
}

/* 退院後は見るだけ（送信欄を隠す） */
function canSendChat(){
  return !familyDetail || !!familyDetail.current;
}
function applyChatMode(){
  const open = canSendChat();
  ['chatInputArea', 'stampRow'].forEach(id => { const el = document.getElementById(id); if(el) el.classList.toggle('hidden', !open); });
  const note = document.getElementById('chatClosedNote');
  if(note) note.classList.toggle('hidden', open);
}
