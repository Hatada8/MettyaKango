/* 患者（patient_master）と入院記録（admission） */

/* 入院中の患者一覧（今の入院記録＋患者マスタ＋主治医名） */
async function listAdmittedPatients(){
  return db.select('admission',
    'select=*,patient_master!inner(*),employee_master(employee_name)' +
    '&discharged_on=is.null&patient_master.delete_flag=eq.0&order=room_no');
}

/* 全患者（管理画面用。削除済みも含む） */
async function listAllPatients(){
  const [patients, admissions] = await Promise.all([
    db.select('patient_master', 'order=patient_no', { includeDeleted: true }),
    db.select('admission', 'select=admission_id,patient_id,admitted_on,discharged_on,room_no&order=admitted_on.desc')
  ]);
  return patients.map(p => {
    const list = admissions.filter(a => a.patient_id === p.patient_id);
    return { ...p, admissions: list, current: list.find(a => !a.discharged_on) || null };
  });
}

/* 1 人分：患者マスタ＋入院記録（新しい順）＋今の入院 */
async function getPatientDetail(patientId){
  const [patients, admissions] = await Promise.all([
    db.select('patient_master', `patient_id=eq.${patientId}`),
    db.select('admission', `select=*,employee_master(employee_name)&patient_id=eq.${patientId}&order=admitted_on.desc`)
  ]);
  if(!patients.length) return null;
  return {
    patient: patients[0],
    admissions,
    current: admissions.find(a => !a.discharged_on) || null
  };
}

async function findPatientByNo(patientNo){
  const rows = await db.select('patient_master', `patient_no=eq.${Number(patientNo)}`);
  return rows[0] || null;
}

/* 次の患者番号（今の最大＋1） */
async function nextPatientNo(){
  const rows = await db.select('patient_master', 'select=patient_no&order=patient_no.desc&limit=1', { includeDeleted: true });
  return rows.length ? Number(rows[0].patient_no) + 1 : 100001;
}

/* 新規登録：患者マスタ → 入院記録 の順に作る */
async function createPatientWithAdmission(patient, admission){
  const [p] = await db.insert('patient_master', patient);
  try{
    const [a] = await db.insert('admission', { ...admission, patient_id: p.patient_id });
    return { patient: p, admission: a };
  }catch(e){
    // 入院記録が作れなかったら、患者マスタも無効にしておく
    await db.softDelete('patient_master', `patient_id=eq.${p.patient_id}`).catch(() => {});
    throw e;
  }
}

async function createAdmission(patientId, admission){
  const [a] = await db.insert('admission', { ...admission, patient_id: patientId });
  return a;
}

async function updatePatient(patientId, patch){
  return db.update('patient_master', `patient_id=eq.${patientId}`, patch);
}

async function updateAdmission(admissionId, patch){
  return db.update('admission', `admission_id=eq.${admissionId}`, patch);
}

async function deletePatient(patientId){
  return db.softDelete('patient_master', `patient_id=eq.${patientId}`);
}

async function restorePatient(patientId){
  return db.restore('patient_master', `patient_id=eq.${patientId}`);
}

async function dischargeAdmission(admissionId){
  return updateAdmission(admissionId, { discharged_on: todayISO() });
}
