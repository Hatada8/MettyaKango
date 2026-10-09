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
    renderInterviewHoursEditor();
    renderMasterEditor('hospital', '病院（病院コードと名前）', '新しい病院の名前', false, true);
    renderMasterEditor('department', '分野', '新しい分野（例：泌尿器科）');
    renderMasterEditor('role', '役割（職種）', '新しい役割（例：臨床検査技師）');
    renderMasterEditor('symptom', '症状（診断名・アレルギー・既往歴）', '新しい症状の名前', true);
    renderPermissionTable();
  }catch(e){ showError(e, 'マスタを読み込めませんでした'); }
}

function renderMasterEditor(key, title, placeholder, withType = false, withCode = false){
  const def = MASTER_DEFS[key];
  const rows = masters[key];
  const typeSelect = (selected, name) =>
    `<select class="input" ${name ? `name="${name}"` : ''} data-type>${masterOptions('symptomType', selected)}</select>`;

  $('master-' + key).innerHTML = `
    <h3><span class="n">●</span> ${esc(title)}</h3>
    <p class="muted" style="margin-top:-6px;">名前を直したら「保存」。使わなくなったものは「削除」（削除しても過去の記録はそのまま残ります）。</p>
    <div class="master-list">
      ${rows.map(r => `
        <div class="master-row ${withType ? 'with-desc' : ''}" data-id="${r[def.id]}">
          <span class="num">${r[def.id]}</span>
          ${withType ? typeSelect(r.symptom_type_id) : ''}
          ${withCode ? `<input class="input code" data-code inputmode="numeric" value="${esc(r.hospital_code)}" placeholder="病院コード" aria-label="病院コード">` : ''}
          <input class="input" data-name value="${esc(r[def.name])}">
          <button type="button" class="light small" onclick="saveMasterRow('${key}', this)">保存</button>
          <button type="button" class="danger small" onclick="removeMasterRow('${key}', ${r[def.id]})">削除</button>
          ${withType ? `<input class="input desc" data-desc value="${esc(r.symptom_description || '')}" placeholder="ご家族向けの説明（家族画面で病名をタップすると表示されます）">` : ''}
        </div>`).join('') || '<p class="empty">まだありません</p>'}
    </div>
    <form class="master-row ${withType ? 'with-desc' : ''}" onsubmit="event.preventDefault(); addMasterFromForm('${key}', this)">
      <span class="num">＋</span>
      ${withType ? typeSelect(SYMPTOM_TYPE.DIAGNOSIS, 'type') : ''}
      ${withCode ? `<input class="input code" name="code" inputmode="numeric" placeholder="病院コード（数字）" aria-label="病院コード">` : ''}
      <input class="input" name="name" placeholder="${esc(placeholder)}">
      <button type="submit" class="primary small">追加</button>
      ${withType ? `<input class="input desc" name="desc" placeholder="ご家族向けの説明（あとからでも入力できます）">` : ''}
    </form>`;
}

async function saveMasterRow(key, btn){
  const row = btn.closest('.master-row');
  const def = MASTER_DEFS[key];
  const name = row.querySelector('[data-name]').value.trim();
  if(!name){ toast('名前を入力してください'); return; }
  const patch = { [def.name]: name };
  const code = row.querySelector('[data-code]');
  if(code){
    if(!/^\d+$/.test(code.value.trim())){ toast('病院コードは数字で入力してください'); return; }
    patch.hospital_code = Number(code.value.trim());
  }
  const type = row.querySelector('[data-type]');
  if(type) patch.symptom_type_id = Number(type.value);
  const desc = row.querySelector('[data-desc]');
  if(desc) patch.symptom_description = desc.value.trim() || null;
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
    if(key === 'symptom'){
      const row = await ensureSymptom(Number(form.elements.type.value), name);
      const desc = form.elements.desc.value.trim();
      if(desc) await updateMasterRow('symptom', row.symptom_id, { symptom_description: desc });
    }
    else if(key === 'hospital'){
      const code = form.elements.code.value.trim();
      if(!/^\d+$/.test(code)){ toast('病院コードは数字で入力してください'); return; }
      await addMasterRow(key, name, { hospital_code: Number(code) });
    }
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

/* ---- 面談の受付時間（曜日ごと）：管理者だけが設定できる ---- */
const SLOT_CHOICES = [15, 20, 30, 45, 60, 90];

async function renderInterviewHoursEditor(){
  const box = $('master-interview-hours');
  let rows;
  try{
    rows = await db.select('interview_hours_master', 'order=weekday');
  }catch(e){
    box.innerHTML = `
      <h3><span class="n">●</span> 面談の受付時間（曜日ごと）</h3>
      <p class="empty">まだ使えません。v2/db/add_interview_hours.sql を実行してください。</p>`;
    return;
  }
  const hhmm = t => String(t).slice(0, 5);
  box.innerHTML = `
    <h3><span class="n">●</span> 面談の受付時間（曜日ごと）</h3>
    <p class="muted" style="margin-top:-6px;">ご家族がカレンダーで予約できる曜日と時間です。「受付する」を外した曜日は予約できません。1回の長さごとに、開始から終了までを区切って予約枠になります（終了時刻ちょうどの枠は作りません）。すでに入っている予約は変わりません。</p>
    <div class="table-wrap">
      <table class="list hours-table">
        <thead><tr><th>曜日</th><th class="center">受付する</th><th>開始</th><th>終了</th><th>1回の長さ</th><th></th></tr></thead>
        <tbody>${rows.map(r => `
          <tr data-weekday="${r.weekday}">
            <td><b class="${r.weekday === 0 ? 'sun-text' : r.weekday === 6 ? 'sat-text' : ''}">${WEEKDAY_NAMES[r.weekday]}曜日</b></td>
            <td class="center"><input type="checkbox" data-open ${Number(r.is_open) === 1 ? 'checked' : ''} aria-label="${WEEKDAY_NAMES[r.weekday]}曜日を受け付ける"></td>
            <td><input class="input" type="time" data-start value="${hhmm(r.start_time)}"></td>
            <td><input class="input" type="time" data-end value="${hhmm(r.end_time)}"></td>
            <td><select class="input" data-slot>${SLOT_CHOICES.map(n => `<option value="${n}" ${n === r.slot_min ? 'selected' : ''}>${n}分</option>`).join('')}</select></td>
            <td class="actions"><button type="button" class="light small" onclick="saveInterviewHours(${r.weekday}, this)">保存</button></td>
          </tr>`).join('')}</tbody>
      </table>
    </div>`;
}

async function saveInterviewHours(weekday, btn){
  if(!can('can_master_manage')){ toast('この操作は管理者だけができます'); return; }
  const tr = btn.closest('tr');
  const isOpen = tr.querySelector('[data-open]').checked;
  const start = tr.querySelector('[data-start]').value;
  const end = tr.querySelector('[data-end]').value;
  const slot = Number(tr.querySelector('[data-slot]').value);
  if(!start || !end){ toast('開始と終了の時刻を入れてください'); return; }
  if(timeToMin(end) <= timeToMin(start)){ toast('終了は開始より後にしてください'); return; }
  if(isOpen && timeToMin(start) + slot > timeToMin(end)){ toast('開始から終了までに、1回の長さが入りません'); return; }
  try{
    await db.update('interview_hours_master', `weekday=eq.${weekday}`, {
      is_open: isOpen ? 1 : 0, start_time: start, end_time: end, slot_min: slot
    });
    toast(`${WEEKDAY_NAMES[weekday]}曜日を保存しました`);
    await renderInterviewHoursEditor();
  }catch(e){ showError(e, '保存できませんでした'); }
}
