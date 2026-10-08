/* 看護師の各ページ（AI要約・申し送りメモ・プライベートメモ・メッセージ）の共通の起動処理
   どのページも ?id=患者ID で開き、上に「← 患者プロフィールへ」と患者さんの名前を出します。 */
async function initSubPage(onReady){
  if(!requireStaff()) return;
  document.getElementById('nurseWelcome').textContent =
    `${session.name} さん（${session.roleName}・${session.permissionName}）としてログイン中`;

  currentPatientId = Number(new URLSearchParams(location.search).get('id'));
  if(!currentPatientId){ goTo('index.html'); return; }

  try{
    await loadMasters();
    detail = await getPatientDetail(currentPatientId);
  }catch(e){
    showError(e, 'データベースに接続できませんでした');
    return;
  }
  if(!detail){
    document.getElementById('subBody').innerHTML = `<div class="card"><div class="empty">この患者さんは見つかりません（削除された可能性があります）。</div></div>`;
    return;
  }

  const p = detail.patient;
  const stay = currentStay();
  const age = calcAge(p.birth_date);
  document.getElementById('subPatient').innerHTML = `
    <div class="avatar">${escapeHtml(String(p.patient_name || '？')[0])}</div>
    <div>
      <div class="sub-name">${escapeHtml(p.patient_name)}　様</div>
      <div class="sub-meta">${stay && stay.room_no ? `${escapeHtml(stay.room_no)}号室・` : ''}${age != null ? `${escapeHtml(age)}歳・` : ''}${escapeHtml(masterName('sex', p.sex_id))}</div>
    </div>`;

  await onReady();
}

function backToProfile(){
  goTo(`index.html?id=${currentPatientId}`);
}
