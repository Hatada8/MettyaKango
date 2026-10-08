/* 家族画面：看護師へのメッセージ（20秒ごとに自動で更新） */
let familyChatTimer = null;

function setupFamilyChat(){
  autoGrow($('chatText'));
  $('chatForm').addEventListener('submit', async e => {
    e.preventDefault();
    const body = $('chatText').value.trim();
    if(!body) return;
    try{
      await sendChat({ patientId: session.patientId, familyId: session.familyId, body });
      $('chatText').value = '';
      $('chatText').style.height = '';
      await loadFamilyChat();
    }catch(err){ showError(err, '送信できませんでした'); }
  });
  $('chatText').addEventListener('keydown', e => {
    if(e.key === 'Enter' && (e.ctrlKey || e.metaKey)) $('chatForm').requestSubmit();
  });
  clearInterval(familyChatTimer);
  familyChatTimer = setInterval(() => { if(!document.hidden) loadFamilyChat(); }, 20000);
}

async function loadFamilyChat(){
  try{
    const messages = await listChat(session.patientId);
    renderChatMessages($('chatBox'), messages, 'family');
    if(messages.some(m => m.employee_id && !m.read_flag)) await markChatRead(session.patientId, 'family');
  }catch(e){ showError(e, 'メッセージを読み込めませんでした'); }
}
