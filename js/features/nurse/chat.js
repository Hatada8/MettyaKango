/* ---------------- nurse: chat（家族とのメッセージ） ---------------- */
async function refreshNurseChat(patientId){
  const chat = document.getElementById('nurseChatBox');
  if(!chat) return;
  const msgs = await getChatMessages(patientId);
  if(msgs.length === 0){
    chat.innerHTML = `<div style="font-size:12.5px; color:var(--ink-soft);">まだメッセージがありません</div>`;
    return;
  }
  chat.innerHTML = msgs.map(m => `
    <div class="msg ${m.who==='nurse' ? 'me' : 'them'}">
      <span class="who">${escapeHtml(m.name)}</span>${escapeHtml(m.text)}
    </div>
  `).join('');
  chat.scrollTop = chat.scrollHeight;
}
async function sendNurseMsg(patientId){
  const input = document.getElementById('nurseChatInput');
  const val = input.value.trim();
  if(!val) return;
  input.value = '';
  const msg = { who:'nurse', name: currentUser ? currentUser.name : '看護師', text: val, time: nowTimeStr() };
  await addChatMessage(patientId, msg);
  await refreshNurseChat(patientId);
}
