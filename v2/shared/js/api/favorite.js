/* お気に入り（employee_favorite）：職員ごとに、患者一覧の上に固定する患者 */

async function listFavoritePatientIds(employeeId){
  const rows = await db.select('employee_favorite', `select=patient_id&employee_id=eq.${employeeId}`);
  return new Set(rows.map(r => r.patient_id));
}

/* on = true で登録、false で外す（行は消さず delete_flag を切り替える） */
async function setFavorite(employeeId, patientId, on){
  return db.upsert('employee_favorite',
    { employee_id: employeeId, patient_id: patientId, delete_flag: on ? 0 : 1 },
    'employee_id,patient_id');
}
