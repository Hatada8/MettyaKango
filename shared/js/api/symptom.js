/* 患者ごとの症状（patient_symptom）と症状マスタ（symptom_master） */

async function listPatientSymptoms(patientId){
  return db.select('patient_symptom',
    `select=*,symptom_master(symptom_name,symptom_type_id)&patient_id=eq.${patientId}&order=onset_on.nullsfirst,patient_symptom_id`);
}

/* ご家族向けの説明（symptom_description）つきで読む。
   add_read_status_and_symptom_info.sql をまだ実行していないときは、説明なしで読む */
async function listPatientSymptomsWithInfo(patientId){
  try{
    return await db.select('patient_symptom',
      `select=*,symptom_master(symptom_name,symptom_type_id,symptom_description)&patient_id=eq.${patientId}&order=onset_on.nullsfirst,patient_symptom_id`);
  }catch(e){
    return listPatientSymptoms(patientId);
  }
}

/* 選ばれた症状の一覧に合わせて、足りないものを追加・外れたものを削除する */
async function syncPatientSymptoms(patientId, admissionId, selectedIds){
  const current = await listPatientSymptoms(patientId);
  const currentIds = current.map(r => r.symptom_id);
  const selected = selectedIds.map(Number);

  const toAdd = selected.filter(id => !currentIds.includes(id));
  const toRemove = current.filter(r => !selected.includes(r.symptom_id));

  if(toAdd.length){
    await db.insert('patient_symptom', toAdd.map(id => {
      const symptom = masters.symptom.find(s => s.symptom_id === id);
      const isDiagnosis = symptom && symptom.symptom_type_id === SYMPTOM_TYPE.DIAGNOSIS;
      return {
        patient_id: patientId,
        symptom_id: id,
        admission_id: isDiagnosis ? admissionId : null,
        onset_on: isDiagnosis ? todayISO() : null
      };
    }));
  }
  if(toRemove.length){
    await db.softDelete('patient_symptom', `patient_symptom_id=in.(${toRemove.map(r => r.patient_symptom_id).join(',')})`);
  }
}

/* 症状マスタに追加（同じ名前がすでにあればそれを使う。削除済みなら元に戻す） */
async function ensureSymptom(typeId, name){
  const trimmed = name.trim();
  const rows = await db.select('symptom_master',
    `symptom_type_id=eq.${typeId}&symptom_name=eq.${encodeURIComponent(trimmed)}`, { includeDeleted: true });
  if(rows.length){
    if(rows[0].delete_flag === 1) await db.restore('symptom_master', `symptom_id=eq.${rows[0].symptom_id}`);
    return rows[0];
  }
  const [row] = await addMasterRow('symptom', trimmed, { symptom_type_id: typeId });
  return row;
}
