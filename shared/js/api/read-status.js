/* 既読の管理（staff_read_status）
   職員ごと・患者ごと・ページごとに「最後に見た日時」を覚えておき、
   それよりあとに他の人が書いた記録があれば「未読」とします（数ではなく、あるかないかだけ）。
   最後に見た日時は、データベース側のトリガーが現在時刻を入れます。 */

/* 番号（read_target_master） */
const READ_TARGET = { AI_SUMMARY: 1, HANDOVER: 2, PRIVATE_MEMO: 3, MESSAGES: 4 };

/* 古い記録は未読に数えない（毎回の読み込みを軽くするため） */
const UNREAD_DAYS = 30;

/* そのページを見た、と記録する。失敗しても画面は止めない */
async function markRead(employeeId, patientId, targetId){
  try{
    await db.upsert('staff_read_status',
      { employee_id: employeeId, patient_id: patientId, target_id: targetId, delete_flag: 0 },
      'employee_id,patient_id,target_id');
  }catch(e){ console.warn('既読を記録できませんでした', e); }
}

/* 患者ごとの未読を調べる → { patient_id: { 1: true, 2: true, ... } }（未読があるものだけ） */
async function unreadByPatient(employeeId){
  const since = new Date(Date.now() - UNREAD_DAYS * 86400000).toISOString();
  let reads, memos, chats, sums;
  try{
    [reads, memos, chats, sums] = await Promise.all([
      db.select('staff_read_status', `select=patient_id,target_id,last_read_at&employee_id=eq.${employeeId}`),
      db.select('patient_memo', `select=patient_id,memo_type_id,created_at&employee_id=neq.${employeeId}&created_at=gt.${since}`),
      db.select('family_chat', `select=patient_id,created_at&family_id=not.is.null&created_at=gt.${since}`),
      db.select('patient_ai_summary', 'select=patient_id,generated_at,generated_by,edited_text,updated_at,updated_by')
    ]);
  }catch(e){
    console.warn('未読を調べられませんでした（add_read_status_and_symptom_info.sql を実行しましたか？）', e);
    return {};
  }

  const lastRead = {};
  reads.forEach(r => { lastRead[`${r.patient_id}:${r.target_id}`] = new Date(r.last_read_at).getTime(); });

  const result = {};
  const check = (patientId, targetId, at) => {
    const seen = lastRead[`${patientId}:${targetId}`] || 0;
    if(new Date(at).getTime() > seen){
      (result[patientId] = result[patientId] || {})[targetId] = true;
    }
  };

  memos.forEach(m => {
    const target = m.memo_type_id === MEMO_TYPE.HANDOVER ? READ_TARGET.HANDOVER
                 : m.memo_type_id === MEMO_TYPE.PRIVATE ? READ_TARGET.PRIVATE_MEMO : null;
    if(target) check(m.patient_id, target, m.created_at);
  });
  chats.forEach(c => check(c.patient_id, READ_TARGET.MESSAGES, c.created_at));
  sums.forEach(s => {
    // 他の人が作った・作り直した、または手直しした要約
    if(s.generated_by !== employeeId) check(s.patient_id, READ_TARGET.AI_SUMMARY, s.generated_at);
    if(s.edited_text && s.updated_by !== employeeId) check(s.patient_id, READ_TARGET.AI_SUMMARY, s.updated_at);
  });
  return result;
}

function hasUnread(map, patientId){
  return !!(map[patientId] && Object.keys(map[patientId]).length);
}
