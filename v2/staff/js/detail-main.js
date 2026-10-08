/* 患者詳細：起動と、画面全体で共有するデータ */
const patientId = Number(queryParam('id'));
let detail = null;      // { patient, admissions, current }
let symptoms = [];      // patient_symptom（症状名つき）
let isFavorite = false;

/* 今表示している入院（入院中ならその入院、退院済みなら最後の入院） */
function currentStay(){
  return detail.current || detail.admissions[0] || null;
}

/* 患者マスタ・入院・症状を読み直して、上の部分を描き直す */
async function reloadDetail(){
  const [d, s, favs] = await Promise.all([
    getPatientDetail(patientId),
    listPatientSymptoms(patientId),
    listFavoritePatientIds(session.employeeId)
  ]);
  if(!d){
    $('notFound').classList.remove('hidden');
    $('detailBody').classList.add('hidden');
    ['editBtn', 'readmitBtn', 'dischargeBtn', 'deleteBtn'].forEach(id => $(id).classList.add('hidden'));
    return false;
  }
  detail = d;
  symptoms = s;
  isFavorite = favs.has(patientId);
  $('detailBody').classList.remove('hidden');
  renderProfile();
  renderFacts();
  renderAdminButtons();
  return true;
}

document.addEventListener('DOMContentLoaded', async () => {
  if(!requireStaff()) return;
  renderHeader({ subtitle: '患者詳細・記録', active: 'list' });
  if(!patientId){ $('notFound').classList.remove('hidden'); return; }

  try{
    await loadMasters();
    if(!await reloadDetail()) return;
  }catch(e){
    showError(e, '患者さんの情報を読み込めませんでした');
    return;
  }

  setupMemos();
  setupChat();
  // 下の部分は並べて読み込む
  await Promise.all([loadAiSummary(), loadMemos(), loadChat()]);
});
