/* 看護師画面：起動処理 */
async function initNurseScreen(){
  if(!requireStaff()) return;
  document.getElementById('nurseWelcome').textContent =
    `${session.name} さん（${session.roleName}・${session.permissionName}）としてログイン中`;
  document.getElementById('adminLink').classList.toggle('hidden', !canOpenAdmin());
  document.getElementById('addPatientBtn').classList.toggle('hidden', !can('can_patient_create'));

  try{
    await loadMasters();
  }catch(e){
    showError(e, 'データベースに接続できませんでした');
    return;
  }
  await loadPatientList();

  // ?id= で指定があればその患者（管理画面の「詳細」から）、
  // なければお気に入りの先頭、それもなければ一覧の先頭を表示
  const requested = Number(new URLSearchParams(location.search).get('id'));
  const first = admitted.find(a => favoriteIds.has(a.patient_master.patient_id)) || admitted[0];
  if(requested) renderPatient(requested);
  else if(first) renderPatient(first.patient_master.patient_id);

  // 一覧（状態・未読）を 15 秒ごとに更新
  if(nurseListPollTimer) clearInterval(nurseListPollTimer);
  nurseListPollTimer = setInterval(() => { if(!document.hidden) loadPatientList(); }, 15000);
}
document.addEventListener('DOMContentLoaded', initNurseScreen);
