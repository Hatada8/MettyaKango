/* 管理画面：患者さんの一覧（退院・削除済みも含む）と、元に戻す・再入院 */
let allPatients = [];

async function loadAdminPatients(){
  $('adminNewPatientBtn').classList.toggle('hidden', !can('can_patient_create'));
  try{
    allPatients = await listAllPatients();
    renderAdminPatients();
  }catch(e){ showError(e, '患者さんを読み込めませんでした'); }
}

function patientStatus(p){
  if(p.delete_flag === 1) return '<span class="badge gray">削除済み</span>';
  if(p.current) return `<span class="badge lv1">入院中（${esc(p.current.room_no ?? '—')}号室）</span>`;
  if(p.admissions.length) return `<span class="badge info">退院（${fmtDate(p.admissions[0].discharged_on)}）</span>`;
  return '<span class="badge gray">入院記録なし</span>';
}

function renderAdminPatients(){
  $('patientTable').innerHTML = `
    <thead><tr><th>患者ID</th><th>氏名</th><th>生年月日</th><th>入院回数</th><th>状態</th><th></th></tr></thead>
    <tbody>${allPatients.map(p => {
      const deleted = p.delete_flag === 1;
      const href = `../nurse/index.html?id=${p.patient_id}`;
      return `
        <tr class="${deleted ? 'deleted' : ''}">
          <td>${esc(p.patient_no)}</td>
          <td>${esc(p.patient_name)}${p.patient_kana ? `<br><small class="muted">${esc(p.patient_kana)}</small>` : ''}</td>
          <td>${fmtDate(p.birth_date) || '—'}</td>
          <td>${p.admissions.length}回</td>
          <td>${patientStatus(p)}</td>
          <td class="actions">
            ${deleted
              ? (can('can_patient_delete') ? `<button type="button" class="light small" onclick="restorePatientRow(${p.patient_id})">元に戻す</button>` : '')
              : `<button type="button" class="light small" onclick="goTo('${href}')">詳細</button>
                 ${!p.current && can('can_patient_create') ? `<button type="button" class="light small" onclick="readmitFromAdmin(${p.patient_id})">再入院</button>` : ''}`}
          </td>
        </tr>`;
    }).join('')}</tbody>`;
}

async function restorePatientRow(patientId){
  try{
    await restorePatient(patientId);
    toast('元に戻しました');
    await loadAdminPatients();
  }catch(e){ showError(e, '元に戻せませんでした'); }
}

async function readmitFromAdmin(patientId){
  try{
    const [detail, symptoms] = await Promise.all([getPatientDetail(patientId), listPatientSymptoms(patientId)]);
    openPatientForm({ mode: 'readmit', detail, symptoms, onDone: loadAdminPatients });
  }catch(e){ showError(e); }
}
