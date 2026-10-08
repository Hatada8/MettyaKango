/* 管理画面：マスタの編集（分野・役割・症状・権限）
   分野・役割・症状は同じ形なので、1 つの関数（renderMasterEditor）で編集画面を作ります。 */
const PERMISSION_FLAGS = [
  { key: 'can_patient_create',  label: '患者の新規登録' },
  { key: 'can_patient_update',  label: '患者情報の修正' },
  { key: 'can_patient_delete',  label: '患者の削除' },
  { key: 'can_employee_manage', label: '職員の管理' },
  { key: 'can_master_manage',   label: 'マスタの編集' }
];

async function loadMasterEditors(){
  try{
    await loadMasters();
    renderMasterEditor('department', '分野', '新しい分野（例：泌尿器科）');
    renderMasterEditor('role', '役割（職種）', '新しい役割（例：臨床検査技師）');
    renderMasterEditor('symptom', '症状（診断名・アレルギー・既往歴）', '新しい症状の名前', true);
    renderPermissionTable();
  }catch(e){ showError(e, 'マスタを読み込めませんでした'); }
}

function renderMasterEditor(key, title, placeholder, withType = false){
  const def = MASTER_DEFS[key];
  const rows = masters[key];
  const typeSelect = (selected, name) =>
    `<select class="input" ${name ? `name="${name}"` : ''} data-type>${masterOptions('symptomType', selected)}</select>`;

  $('master-' + key).innerHTML = `
    <h2>${esc(title)}</h2>
    <p class="muted">名前を直したら「保存」。使わなくなったものは「削除」（削除しても過去の記録はそのまま残ります）。</p>
    <div class="master-list">
      ${rows.map(r => `
        <div class="master-row" data-id="${r[def.id]}">
          <span class="num">${r[def.id]}</span>
          ${withType ? typeSelect(r.symptom_type_id) : ''}
          <input class="input" value="${esc(r[def.name])}">
          <button type="button" class="light small" onclick="saveMasterRow('${key}', this)">保存</button>
          <button type="button" class="danger small" onclick="removeMasterRow('${key}', ${r[def.id]})">削除</button>
        </div>`).join('') || '<p class="empty">まだありません</p>'}
    </div>
    <form class="master-row" onsubmit="event.preventDefault(); addMasterFromForm('${key}', this)">
      <span class="num">＋</span>
      ${withType ? typeSelect(SYMPTOM_TYPE.DIAGNOSIS, 'type') : ''}
      <input class="input" name="name" placeholder="${esc(placeholder)}">
      <button type="submit" class="primary small">追加</button>
    </form>`;
}

async function saveMasterRow(key, btn){
  const row = btn.closest('.master-row');
  const def = MASTER_DEFS[key];
  const name = row.querySelector('input').value.trim();
  if(!name){ toast('名前を入力してください'); return; }
  const patch = { [def.name]: name };
  const type = row.querySelector('[data-type]');
  if(type) patch.symptom_type_id = Number(type.value);
  try{
    await updateMasterRow(key, row.dataset.id, patch);
    toast('保存しました');
    await loadMasterEditors();
  }catch(e){
    if(isDuplicateError(e)) toast('同じ名前がすでにあります');
    else showError(e, '保存できませんでした');
  }
}

async function addMasterFromForm(key, form){
  const name = form.elements.name.value.trim();
  if(!name){ toast('名前を入力してください'); return; }
  try{
    if(key === 'symptom') await ensureSymptom(Number(form.elements.type.value), name);
    else await addMasterRow(key, name);
    toast('追加しました');
    await loadMasterEditors();
  }catch(e){
    if(isDuplicateError(e)) toast('同じ名前がすでにあります');
    else showError(e, '追加できませんでした');
  }
}

async function removeMasterRow(key, id){
  const ok = await confirmModal({ title: '削除', message: `「${masterName(key, id)}」を削除しますか？\n選択肢に出なくなりますが、過去の記録はそのまま残ります。`, okLabel: '削除する', danger: true });
  if(!ok) return;
  try{
    await deleteMasterRow(key, id);
    toast('削除しました');
    await loadMasterEditors();
  }catch(e){ showError(e, '削除できませんでした'); }
}

/* ---- 権限：できることを 0/1 で切り替える ---- */
function renderPermissionTable(){
  $('permissionTable').innerHTML = `
    <thead><tr><th>権限</th>${PERMISSION_FLAGS.map(f => `<th class="center">${f.label}</th>`).join('')}</tr></thead>
    <tbody>${masters.permission.map(p => `
      <tr>
        <td><b>${esc(p.permission_name)}</b></td>
        ${PERMISSION_FLAGS.map(f => `
          <td class="center"><input type="checkbox" ${Number(p[f.key]) === 1 ? 'checked' : ''}
            aria-label="${esc(p.permission_name)}：${f.label}"
            onchange="togglePermission(${p.permission_id}, '${f.key}', this)"></td>`).join('')}
      </tr>`).join('')}</tbody>`;
}

async function togglePermission(permissionId, flag, checkbox){
  // 自分の権限から「マスタの編集」を外すと、この画面に戻れなくなるので確認する
  if(permissionId === session.permissionId && !checkbox.checked && (flag === 'can_master_manage' || flag === 'can_employee_manage')){
    const ok = await confirmModal({ title: '確認', message: 'ご自分の権限です。外すと、次にログインしたときからこの操作ができなくなります。よろしいですか？', okLabel: '外す' });
    if(!ok){ checkbox.checked = true; return; }
  }
  try{
    await updateMasterRow('permission', permissionId, { [flag]: checkbox.checked ? 1 : 0 });
    toast('保存しました（次のログインから反映されます）');
    await loadMasters();
  }catch(e){
    checkbox.checked = !checkbox.checked;
    showError(e, '保存できませんでした');
  }
}

$('permissionAddForm').addEventListener('submit', async e => {
  e.preventDefault();
  const name = $('newPermissionName').value.trim();
  if(!name){ toast('名前を入力してください'); return; }
  try{
    await addMasterRow('permission', name);
    $('newPermissionName').value = '';
    toast('追加しました');
    await loadMasterEditors();
  }catch(err){ showError(err, '追加できませんでした'); }
});
