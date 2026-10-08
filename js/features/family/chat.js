/* ---------------- family: chat ---------------- */
async function refreshChat(){
  const chat = document.getElementById('chatBox');
  if(!chat || !currentFamilyPatient) return;
  const msgs = await getChatMessages(currentFamilyPatient.id);
  if(msgs.length === 0){
    chat.innerHTML = `<div style="font-size:12.5px; color:var(--ink-soft);">まだメッセージがありません</div>`;
    return;
  }
  chat.innerHTML = msgs.map(m => `
    <div class="msg ${m.who==='family' ? 'me' : 'them'}">
      <span class="who">${escapeHtml(m.name)}</span>${escapeHtml(m.text)}
    </div>
  `).join('');
  chat.scrollTop = chat.scrollHeight;
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
  if(!currentFamilyPatient) return;
  const msg = { who:'family', name: currentUser ? currentUser.name : '家族', text: val, time: nowTimeStr() };
  await addChatMessage(currentFamilyPatient.id, msg);
  await refreshChat();
}
