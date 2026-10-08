/* 患者さんの登録・修正フォーム（管理者だけ）
   mode：'create' 新規登録 / 'edit' 修正 / 'readmit' 再入院
   診断名・アレルギー・既往歴は文字で入力し、「、」で区切ると複数登録できます。
   入力した名前は症状マスタ（symptom_master）にも自動で登録されます。 */
async function openPatientForm({ mode = 'create', detail = null, symptoms = [], onDone } = {}){
  const needPerm = mode === 'edit' ? 'can_patient_update' : 'can_patient_create';
  if(!can(needPerm)){ showToast('この操作は管理者だけができます'); return; }

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
  const showPatient = mode !== 'readmit';
  const showAdmission = mode !== 'edit' || !!detail.current;

  const symptomNames = typeId => symptoms
    .filter(s => s.symptom_master && s.symptom_master.symptom_type_id === typeId)
    .map(s => s.symptom_master.symptom_name).join('、');

  const title = { create: '新規患者を登録', edit: '患者情報を修正', readmit: '再入院を登録' }[mode];

  openModal({
    title,
    submitLabel: mode === 'create' ? '登録してIDを発行' : '保存する',
    body: `
      ${showPatient ? `
      <div class="form-section">患者情報</div>
      <div class="form-grid">
        <label class="form-item"><span>患者ID（数字・ご家族のログインに使います）</span>
          <input class="f-input" name="patient_no" inputmode="numeric" value="${esc(patientNo)}" ${mode === 'edit' ? 'readonly' : ''}></label>
        <label class="form-item"><span>性別</span><select class="f-input" name="sex_id">${masterOptions('sex', p.sex_id ?? 2)}</select></label>
      </div>
      <div class="form-grid">
        <label class="form-item"><span>氏名</span><input class="f-input" name="patient_name" value="${esc(p.patient_name)}" placeholder="例：田中 花子"></label>
        <label class="form-item"><span>ふりがな</span><input class="f-input" name="patient_kana" value="${esc(p.patient_kana)}" placeholder="例：たなか はなこ"></label>
      </div>
      <label class="form-item"><span>生年月日</span><input class="f-input" type="date" name="birth_date" value="${esc(p.birth_date)}" max="${todayISO()}"></label>
      ` : `<p class="muted">${esc(p.patient_name)} さん（患者ID ${esc(p.patient_no)}）の新しい入院を登録します。</p>`}

      ${showAdmission ? `
      <div class="form-section">入院情報</div>
      <div class="form-grid">
        <label class="form-item"><span>入院日</span><input class="f-input" type="date" name="admitted_on" value="${esc(a.admitted_on || todayISO())}"></label>
        <label class="form-item"><span>部屋番号</span><input class="f-input" name="room_no" inputmode="numeric" value="${esc(a.room_no ?? '')}" placeholder="例：305"></label>
      </div>
      <div class="form-grid">
        <label class="form-item"><span>分野（診療科）</span><select class="f-input" name="department_id">${masterOptions('department', a.department_id, { blank: '選択してください' })}</select></label>
        <label class="form-item"><span>主治医</span><select class="f-input" name="doctor_employee_id">
          <option value="">未定</option>
          ${doctors.map(d => `<option value="${d.employee_id}" ${d.employee_id === a.doctor_employee_id ? 'selected' : ''}>${esc(d.employee_name)}（${esc(masterName('department', d.department_id))}）</option>`).join('')}
        </select></label>
      </div>
      <label class="form-item"><span>今の状態</span><select class="f-input" name="condition_level_id">${masterOptions('conditionLevel', a.condition_level_id || 1)}</select></label>
      <label class="form-item"><span>注意事項</span><textarea class="f-input" name="care_note" placeholder="例：転倒リスクあり">${esc(a.care_note)}</textarea></label>
      ` : ''}

      <div class="form-section">診断名・アレルギー・既往歴</div>
      ${masters.symptomType.map(t => `
        <label class="form-item"><span>${esc(t.symptom_type_name)}（複数あるときは「、」で区切る）</span>
          <input class="f-input" name="symptom_${t.symptom_type_id}" value="${esc(symptomNames(t.symptom_type_id))}"
            placeholder="${t.symptom_type_id === SYMPTOM_TYPE.ALLERGY ? 'なければ空のまま' : ''}"></label>`).join('')}`,
    onSubmit: async form => {
      const f = new FormData(form);
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
        if(!patientRow.patient_name){ showToast('氏名を入力してください'); return false; }
        if(!Number.isInteger(patientRow.patient_no) || patientRow.patient_no <= 0){ showToast('患者IDは数字で入力してください'); return false; }
      }
      if(admissionRow){
        if(!admissionRow.admitted_on){ showToast('入院日を入力してください'); return false; }
        if(admissionRow.room_no != null && !Number.isInteger(admissionRow.room_no)){ showToast('部屋番号は数字で入力してください'); return false; }
      }

      try{
        let patientId = p.patient_id;
        let admissionId = mode === 'edit' && detail.current ? detail.current.admission_id : null;

        if(mode === 'create'){
          const res = await createPatientWithAdmission(patientRow, admissionRow);
          patientId = res.patient.patient_id;
          admissionId = res.admission.admission_id;
        }else if(mode === 'readmit'){
          admissionId = (await createAdmission(patientId, admissionRow)).admission_id;
        }else{
          const { patient_no, ...patch } = patientRow;
          await updatePatient(patientId, patch);
          if(admissionRow && admissionId) await updateAdmission(admissionId, admissionRow);
        }

        // 症状：入力された名前 → 症状マスタの番号にして保存
        const ids = [];
        for(const t of masters.symptomType){
          const names = String(f.get('symptom_' + t.symptom_type_id) || '')
            .split(/[、,，]/).map(s => s.trim()).filter(s => s && s !== 'なし');
          for(const name of names){
            const row = await ensureSymptom(t.symptom_type_id, name);
            if(!masters.symptom.some(s => s.symptom_id === row.symptom_id)) masters.symptom.push({ ...row, delete_flag: 0 });
            ids.push(row.symptom_id);
          }
        }
        await syncPatientSymptoms(patientId, admissionId, ids);

        if(mode === 'create'){
          showToast(`登録しました（患者ID：${patientRow.patient_no}）`);
        }else{
          showToast(mode === 'edit' ? '保存しました' : '再入院を登録しました');
        }
        if(onDone) onDone(patientId);
        return true;
      }catch(e){
        if(isDuplicateError(e)) showToast('この患者IDはすでに使われているか、入院中の記録がすでにあります');
        else showError(e, '保存できませんでした');
        return false;
      }
    }
  });
}
