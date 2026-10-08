/* 患者の登録・修正フォーム（管理者だけ）
   mode：'create' 新規登録 / 'edit' 修正 / 'readmit' 再入院
   患者一覧・患者詳細・管理画面のどこからでも呼べます。 */
async function openPatientForm({ mode = 'create', detail = null, symptoms = [], onDone } = {}){
  const needPerm = mode === 'edit' ? 'can_patient_update' : 'can_patient_create';
  if(!can(needPerm)){ toast('この操作は管理者だけができます'); return; }

  let doctors = [];
  let patientNo = '';
  try{
    [doctors, patientNo] = await Promise.all([
      listDoctors(),
      mode === 'create' ? nextPatientNo() : Promise.resolve(detail.patient.patient_no)
    ]);
  }catch(e){ showError(e); return; }

  const p = (detail && detail.patient) || {};
  const a = mode === 'edit' ? (detail.current || {}) : {};
  const selected = new Set(symptoms.map(s => s.symptom_id));
  const showPatient = mode !== 'readmit';
  const showAdmission = mode !== 'edit' || !!detail.current;

  const symptomChips = typeId => masters.symptom
    .filter(s => s.symptom_type_id === typeId)
    .map(s => `<label class="chip"><input type="checkbox" name="symptom" value="${s.symptom_id}" ${selected.has(s.symptom_id) ? 'checked' : ''}><span>${esc(s.symptom_name)}</span></label>`)
    .join('') || '<span class="muted">まだ登録がありません</span>';

  const symptomBlock = masters.symptomType.map(t => `
    <div class="field">
      <span>${esc(t.symptom_type_name)}</span>
      <div class="chips" id="chips${t.symptom_type_id}">${symptomChips(t.symptom_type_id)}</div>
      <div class="chip-add">
        <input class="input" id="newSymptom${t.symptom_type_id}" placeholder="${esc(t.symptom_type_name)}を新しく追加"
          onkeydown="if(event.key === 'Enter'){ event.preventDefault(); addSymptomChip(${t.symptom_type_id}); }">
        <button type="button" class="light small" onclick="addSymptomChip(${t.symptom_type_id})">追加</button>
      </div>
    </div>`).join('');

  const title = { create: '患者さんを新規登録', edit: '患者情報を修正', readmit: '再入院の登録' }[mode];

  openModal({
    title,
    submitLabel: mode === 'create' ? '登録する' : '保存する',
    body: `
      ${showPatient ? `
      <h3>患者情報</h3>
      <div class="field-row">
        <label class="field"><span>患者ID（数字）</span><input name="patient_no" inputmode="numeric" value="${esc(patientNo)}" ${mode === 'edit' ? 'readonly' : ''} required></label>
        <label class="field"><span>性別</span><select name="sex_id">${masterOptions('sex', p.sex_id ?? 0)}</select></label>
      </div>
      <div class="field-row">
        <label class="field"><span>氏名</span><input name="patient_name" value="${esc(p.patient_name)}" placeholder="例：田中 花子" required></label>
        <label class="field"><span>ふりがな</span><input name="patient_kana" value="${esc(p.patient_kana)}" placeholder="例：たなか はなこ"></label>
      </div>
      <label class="field"><span>生年月日</span><input type="date" name="birth_date" value="${esc(p.birth_date)}" max="${todayISO()}"></label>
      ` : `<p class="muted">${esc(p.patient_name)} さん（患者ID ${esc(p.patient_no)}）の新しい入院を登録します。</p>`}

      ${showAdmission ? `
      <h3>入院情報</h3>
      <div class="field-row">
        <label class="field"><span>入院日</span><input type="date" name="admitted_on" value="${esc(a.admitted_on || todayISO())}" required></label>
        <label class="field"><span>部屋番号</span><input name="room_no" inputmode="numeric" value="${esc(a.room_no ?? '')}" placeholder="例：305"></label>
      </div>
      <div class="field-row">
        <label class="field"><span>分野（診療科）</span><select name="department_id">${masterOptions('department', a.department_id, { blank: '選択してください' })}</select></label>
        <label class="field"><span>主治医</span><select name="doctor_employee_id">
          <option value="">未定</option>
          ${doctors.map(d => `<option value="${d.employee_id}" ${d.employee_id === a.doctor_employee_id ? 'selected' : ''}>${esc(d.employee_name)}（${esc(masterName('department', d.department_id))}）</option>`).join('')}
        </select></label>
      </div>
      <label class="field"><span>今の状態</span><select name="condition_level_id">${masterOptions('conditionLevel', a.condition_level_id || 1)}</select></label>
      <label class="field"><span>注意事項</span><textarea name="care_note" placeholder="例：転倒リスクあり">${esc(a.care_note)}</textarea></label>
      ` : ''}

      <h3>診断名・アレルギー・既往歴</h3>
      ${symptomBlock}`,
    onSubmit: async form => {
      const f = new FormData(form);
      const symptomIds = f.getAll('symptom').map(Number);
      try{
        let patientId = p.patient_id;
        let admissionId = mode === 'edit' && detail.current ? detail.current.admission_id : null;

        const patientRow = showPatient ? {
          patient_no: Number(f.get('patient_no')),
          patient_name: f.get('patient_name').trim(),
          patient_kana: f.get('patient_kana').trim() || null,
          birth_date: f.get('birth_date') || null,
          sex_id: Number(f.get('sex_id'))
        } : null;
        const admissionRow = showAdmission ? {
          admitted_on: f.get('admitted_on'),
          room_no: f.get('room_no') ? Number(f.get('room_no')) : null,
          department_id: f.get('department_id') ? Number(f.get('department_id')) : null,
          doctor_employee_id: f.get('doctor_employee_id') ? Number(f.get('doctor_employee_id')) : null,
          condition_level_id: Number(f.get('condition_level_id')),
          care_note: f.get('care_note').trim() || null
        } : null;

        if(patientRow){
          if(!patientRow.patient_name){ toast('氏名を入力してください'); return false; }
          if(!Number.isInteger(patientRow.patient_no) || patientRow.patient_no <= 0){ toast('患者IDは数字で入力してください'); return false; }
        }
        if(admissionRow && !admissionRow.admitted_on){ toast('入院日を入力してください'); return false; }

        if(mode === 'create'){
          const res = await createPatientWithAdmission(patientRow, admissionRow);
          patientId = res.patient.patient_id;
          admissionId = res.admission.admission_id;
        }else if(mode === 'readmit'){
          const adm = await createAdmission(patientId, admissionRow);
          admissionId = adm.admission_id;
        }else{
          const { patient_no, ...patch } = patientRow;
          await updatePatient(patientId, patch);
          if(admissionRow && admissionId) await updateAdmission(admissionId, admissionRow);
        }
        await syncPatientSymptoms(patientId, admissionId, symptomIds);

        toast({ create: '登録しました', edit: '保存しました', readmit: '再入院を登録しました' }[mode]);
        if(onDone) onDone(patientId);
        return true;
      }catch(e){
        if(isDuplicateError(e)) toast('この患者IDはすでに使われているか、入院中の記録がすでにあります');
        else showError(e, '保存できませんでした');
        return false;
      }
    }
  });
}

/* フォームの中で症状を新しく追加（症状マスタにも登録される） */
async function addSymptomChip(typeId){
  const input = $('newSymptom' + typeId);
  const name = input.value.trim();
  if(!name) return;
  try{
    const row = await ensureSymptom(typeId, name);
    if(!masters.symptom.some(s => s.symptom_id === row.symptom_id)) masters.symptom.push({ ...row, delete_flag: 0 });
    const chips = $('chips' + typeId);
    const exists = chips.querySelector(`input[value="${row.symptom_id}"]`);
    if(exists){
      exists.checked = true;
    }else{
      if(!chips.querySelector('.chip')) chips.innerHTML = '';
      chips.insertAdjacentHTML('beforeend',
        `<label class="chip"><input type="checkbox" name="symptom" value="${row.symptom_id}" checked><span>${esc(row.symptom_name)}</span></label>`);
    }
    input.value = '';
  }catch(e){ showError(e, '追加できませんでした'); }
}
