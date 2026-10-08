/* 職員と家族のメッセージ（family_chat）
   職員が送ったら employee_id、家族が送ったら family_id に値が入る */

async function listChat(patientId){
  return db.select('family_chat',
    `select=*,employee_master(employee_name)&patient_id=eq.${patientId}&order=created_at`);
}

async function sendChat({ patientId, employeeId = null, familyId = null, body }){
  return db.insert('family_chat', { patient_id: patientId, employee_id: employeeId, family_id: familyId, body });
}

/* 相手からのメッセージを既読にする（reader：'staff' か 'family'） */
async function markChatRead(patientId, reader){
  const from = reader === 'staff' ? 'family_id=not.is.null' : 'employee_id=not.is.null';
  return db.update('family_chat', `patient_id=eq.${patientId}&read_flag=eq.0&${from}`, { read_flag: 1 });
}

/* 職員側：患者ごとの「家族からの未読」の数 */
async function unreadCountsForStaff(){
  const rows = await db.select('family_chat', 'select=patient_id&read_flag=eq.0&family_id=not.is.null');
  const counts = {};
  rows.forEach(r => { counts[r.patient_id] = (counts[r.patient_id] || 0) + 1; });
  return counts;
}
