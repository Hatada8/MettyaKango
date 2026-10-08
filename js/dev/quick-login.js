/* 【仮】テスト用クイックログイン（後で削除） */
async function quickLoginNurse(){
  await ensurePatientsLoaded();
  enterNurseScreen('テスト 看護師');
}

async function quickLoginPatient(){
  await ensurePatientsLoaded();
  const p = patients[0];
  if(!p){ showToast('患者データを読み込めませんでした'); return; }
  enterFamilyScreen('テスト 患者', p);
}
