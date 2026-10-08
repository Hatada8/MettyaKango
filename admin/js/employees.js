/* 管理画面：職員の登録・修正・削除 */
let employees = [];

async function loadEmployees(){
  try{
    employees = await listEmployees({ includeDeleted: $('showDeletedEmployees').checked });
    renderEmployees();
  }catch(e){ showError(e, '職員を読み込めませんでした'); }
}

function renderEmployees(){
  $('employeeTable').innerHTML = `
    <thead><tr><th>職員番号</th><th>氏名</th><th>役割</th><th>権限</th><th>病院</th><th>分野</th><th>状態</th><th></th></tr></thead>
    <tbody>${employees.map(e => {
      const deleted = e.delete_flag === 1;
      const self = e.employee_id === session.employeeId;
      return `
        <tr class="${deleted ? 'deleted' : ''}">
          <td>${esc(e.employee_no)}</td>
          <td>${esc(e.employee_name)}${e.employee_kana ? `<br><small class="muted">${esc(e.employee_kana)}</small>` : ''}</td>
          <td>${esc(e.role_master ? e.role_master.role_name : '')}</td>
          <td>${esc(e.permission_master ? e.permission_master.permission_name : '')}</td>
          <td>${esc(e.hospital_id ? masterName('hospital', e.hospital_id) || '—' : '—')}</td>
          <td>${esc(e.department_master ? e.department_master.department_name : '—')}</td>
          <td><span class="badge ${deleted ? 'gray' : 'lv1'}">${deleted ? '削除済み' : '有効'}</span></td>
          <td class="actions">
            ${deleted
              ? `<button type="button" class="light small" onclick="restoreEmployeeRow(${e.employee_id})">元に戻す</button>`
              : `<button type="button" class="light small" onclick="openEmployeeForm(${e.employee_id})">修正</button>
                 ${self ? '' : `<button type="button" class="danger small" onclick="deleteEmployeeRow(${e.employee_id})">削除</button>`}`}
          </td>
        </tr>`;
    }).join('')}</tbody>`;
}

function openEmployeeForm(employeeId){
  const e = employees.find(x => x.employee_id === employeeId) || {};
  const isNew = !employeeId;
  openModal({
    title: isNew ? '職員を登録' : '職員を修正',
    submitLabel: isNew ? '登録する' : '保存する',
    body: `
      <div class="field-row">
        <label class="field"><span>職員番号（ログインID・数字。病院ごとに付けます）</span>
          <input name="employee_no" inputmode="numeric" value="${esc(e.employee_no ?? '')}" ${isNew ? '' : 'readonly'} required></label>
        <label class="field"><span>パスワード${isNew ? '' : '（変えるときだけ入力）'}</span>
          <input name="password" type="password" autocomplete="new-password" ${isNew ? 'required' : ''}></label>
      </div>
      <div class="field-row">
        <label class="field"><span>氏名</span><input name="name" value="${esc(e.employee_name)}" required></label>
        <label class="field"><span>ふりがな</span><input name="kana" value="${esc(e.employee_kana)}"></label>
      </div>
      ${masters.hospital.length ? `<label class="field"><span>病院</span><select name="hospital_id">${masterOptions('hospital', e.hospital_id || masters.hospital[0].hospital_id)}</select></label>` : ''}
      <div class="field-row">
        <label class="field"><span>役割（職種）</span><select name="role_id">${masterOptions('role', e.role_id || 2)}</select></label>
        <label class="field"><span>権限</span><select name="permission_id">${masterOptions('permission', e.permission_id || 2)}</select></label>
        <label class="field"><span>分野</span><select name="department_id">${masterOptions('department', e.department_id, { blank: 'なし' })}</select></label>
      </div>`,
    onSubmit: async form => {
      const f = new FormData(form);
      const data = {
        employeeNo: f.get('employee_no').trim(),
        password: f.get('password'),
        name: f.get('name').trim(),
        kana: f.get('kana').trim(),
        roleId: f.get('role_id'),
        permissionId: f.get('permission_id'),
        departmentId: f.get('department_id'),
        hospitalId: f.get('hospital_id')
      };
      if(!/^\d+$/.test(data.employeeNo)){ toast('職員番号は数字で入力してください'); return false; }
      if(!data.name){ toast('氏名を入力してください'); return false; }
      if(isNew && data.password.length < 4){ toast('パスワードは4文字以上にしてください'); return false; }
      if(!isNew && data.password && data.password.length < 4){ toast('パスワードは4文字以上にしてください'); return false; }
      try{
        if(isNew) await createEmployee(data);
        else await updateEmployee(employeeId, data);
        toast(isNew ? '登録しました' : '保存しました');
        await loadEmployees();
        return true;
      }catch(err){
        if(isDuplicateError(err)) toast('この病院では、この職員番号はすでに使われています');
        else showError(err, '保存できませんでした');
        return false;
      }
    }
  });
}

async function deleteEmployeeRow(employeeId){
  const e = employees.find(x => x.employee_id === employeeId);
  const ok = await confirmModal({ title: '職員を削除', message: `${e.employee_name} さんを削除します。\nログインできなくなります（あとで元に戻せます）。`, okLabel: '削除する', danger: true });
  if(!ok) return;
  try{ await deleteEmployee(employeeId); toast('削除しました'); await loadEmployees(); }
  catch(err){ showError(err, '削除できませんでした'); }
}

async function restoreEmployeeRow(employeeId){
  try{ await restoreEmployee(employeeId); toast('元に戻しました'); await loadEmployees(); }
  catch(err){ showError(err, '元に戻せませんでした'); }
}

$('showDeletedEmployees').addEventListener('change', loadEmployees);
