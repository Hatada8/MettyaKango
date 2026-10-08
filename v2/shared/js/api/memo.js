/* メモ（patient_memo）：申し送りメモ・プライベートメモを種別で分けて 1 つのテーブルに保存 */

async function listMemos(patientId, memoTypeId, { familyOnly = false, limit } = {}){
  let q = `select=*,employee_master(employee_name)&patient_id=eq.${patientId}&memo_type_id=eq.${memoTypeId}&order=created_at.desc`;
  if(familyOnly) q += '&family_visible=eq.1';
  if(limit) q += `&limit=${limit}`;
  return db.select('patient_memo', q);
}

async function addMemo({ patientId, admissionId, memoTypeId, content, familyVisible = 0, employeeId }){
  return db.insert('patient_memo', {
    patient_id: patientId,
    admission_id: admissionId || null,
    memo_type_id: memoTypeId,
    content,
    family_visible: familyVisible ? 1 : 0,
    employee_id: employeeId
  });
}

async function setMemoFamilyVisible(memoId, visible){
  return db.update('patient_memo', `memo_id=eq.${memoId}`, { family_visible: visible ? 1 : 0 });
}

async function deleteMemo(memoId){
  return db.softDelete('patient_memo', `memo_id=eq.${memoId}`);
}
