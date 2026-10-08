/* 家族（family_master）
   ログイン：患者 ID ＋ メールアドレス ＋ パスワード
   ・そのメールアドレスが初めてなら、その場で登録する（メールの確認はしない）
   ・2 回目からはパスワードを照合する
   結果：{ family, patient, created } または { error: 'patient' | 'password' | 'disabled' } */
async function familyLogin(patientNo, email, password){
  const patient = await findPatientByNo(patientNo);
  if(!patient) return { error: 'patient' };

  const mail = email.trim().toLowerCase();
  const hash = await sha256Hex(password);
  const rows = await db.select('family_master',
    `patient_id=eq.${patient.patient_id}&email=eq.${encodeURIComponent(mail)}`, { includeDeleted: true });

  if(!rows.length){
    const [family] = await db.insert('family_master', {
      patient_id: patient.patient_id, email: mail, password_hash: hash, last_login_at: new Date().toISOString()
    });
    return { family, patient, created: true };
  }

  const family = rows[0];
  if(family.delete_flag === 1) return { error: 'disabled' };
  if(family.password_hash !== hash) return { error: 'password' };
  await db.update('family_master', `family_id=eq.${family.family_id}`, { last_login_at: new Date().toISOString() });
  return { family, patient, created: false };
}

async function listFamilies(patientId){
  return db.select('family_master', `select=family_id,email,last_login_at,created_at&patient_id=eq.${patientId}&order=created_at`);
}

function buildFamilySession(family, patient){
  return {
    kind: 'family',
    familyId: family.family_id,
    patientId: patient.patient_id,
    patientNo: patient.patient_no,
    email: family.email
  };
}
