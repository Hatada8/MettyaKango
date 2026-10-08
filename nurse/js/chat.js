/* 看護師画面：家族とのメッセージ（family_chat） */
async function refreshNurseChat(){
  const id = currentPatientId;
  const chat = document.getElementById('nurseChatBox');
  if(!chat || !id) return;
  try{
    const [msgs, families] = await Promise.all([listChat(id), listFamilies(id)]);
    if(id !== currentPatientId) return;

    const accounts = document.getElementById('familyAccounts');
    if(accounts){
      accounts.textContent = families.length
        ? `登録しているご家族：${families.map(f => f.email).join('、')}`
        : 'まだご家族の登録はありません（患者IDをご家族にお伝えください）';
    }

    if(msgs.length === 0){
      chat.innerHTML = `<div class="empty">まだメッセージがありません</div>`;
    }else{
      chat.innerHTML = msgs.map(m => {
        const fromStaff = !!m.employee_id;
        const who = fromStaff ? (m.employee_master ? m.employee_master.employee_name : '職員') : 'ご家族';
        return `
          <div class="msg ${fromStaff ? 'me' : 'them'}">
            <span class="who">${escapeHtml(who)}・${fmtDateTime(m.created_at)}</span>${escapeHtml(m.body)}
          </div>`;
      }).join('');
      chat.scrollTop = chat.scrollHeight;
    }

    // 開いている間に届いたメッセージも、見たことにする
    if(msgs.some(m => m.family_id)) await markRead(session.employeeId, id, READ_TARGET.MESSAGES);
  }catch(e){ showError(e, 'メッセージを読み込めませんでした'); }
}

async function sendNurseMsg(){
  const input = document.getElementById('nurseChatInput');
  const val = input.value.trim();
  if(!val) return;
  input.value = '';
  try{
    await sendChat({ patientId: currentPatientId, employeeId: session.employeeId, body: val });
    await refreshNurseChat();
  }catch(e){
    input.value = val;
    showError(e, '送信できませんでした');
  }
}
