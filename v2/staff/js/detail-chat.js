/* 患者詳細：ご家族とのチャット（20秒ごとに自動で更新） */
let chatTimer = null;

function setupChat(){
  autoGrow($('chatText'));
  $('chatForm').addEventListener('submit', async e => {
    e.preventDefault();
    const body = $('chatText').value.trim();
    if(!body) return;
    try{
      await sendChat({ patientId, employeeId: session.employeeId, body });
      $('chatText').value = '';
      $('chatText').style.height = '';
      await loadChat();
    }catch(err){ showError(err, '送信できませんでした'); }
  });
  $('chatText').addEventListener('keydown', e => {
    if(e.key === 'Enter' && (e.ctrlKey || e.metaKey)) $('chatForm').requestSubmit();
  });

  clearInterval(chatTimer);
  chatTimer = setInterval(() => { if(!document.hidden) loadChat(); }, 20000);
}

async function loadChat(){
  try{
    const [messages, families] = await Promise.all([listChat(patientId), listFamilies(patientId)]);
    renderChatMessages($('chatBox'), messages, 'staff');
    $('familyAccounts').textContent = families.length
      ? `登録しているご家族：${families.length}名（${families.map(f => f.email).join('、')}）`
      : 'まだご家族の登録はありません（患者IDをお伝えください）';
    if(messages.some(m => m.family_id && !m.read_flag)) await markChatRead(patientId, 'staff');
  }catch(e){ showError(e, 'チャットを読み込めませんでした'); }
}
