/* AI 要約（patient_ai_summary）
   ・1 回の入院につき 1 行（admission_id が一意）
   ・AI が出した原文は generated_text、手直しは edited_text に保存する */

/* 「AIで要約する」を何回押せるか
   false：何回でも作り直せる（同じ入院の要約を新しい文章で上書きする）← 今はこちら
   true ：1 回の入院につき 1 回だけ */
const AI_SUMMARY_ONCE = false;

const AI_SUMMARY_SELECT =
  'select=*,generator:employee_master!generated_by(employee_name),editor:employee_master!updated_by(employee_name)';

async function getAiSummary(admissionId){
  const rows = await db.select('patient_ai_summary', `${AI_SUMMARY_SELECT}&admission_id=eq.${admissionId}`);
  return rows[0] || null;
}

/* 家族に見せてよい最新の要約 */
async function getFamilyAiSummary(patientId){
  const rows = await db.select('patient_ai_summary',
    `${AI_SUMMARY_SELECT}&patient_id=eq.${patientId}&family_visible=eq.1&order=generated_at.desc&limit=1`);
  return rows[0] || null;
}

/* 作成
   ・まだなければ追加 → { row }
   ・すでにあれば：AI_SUMMARY_ONCE が true なら { already: true }、
     false なら新しい文章で上書き（手直し版は消える）→ { row, regenerated: true } */
async function createAiSummary({ admissionId, patientId, text, employeeId }){
  const existing = await db.select('patient_ai_summary', `select=ai_summary_id&admission_id=eq.${admissionId}`, { includeDeleted: true });
  if(existing.length){
    if(AI_SUMMARY_ONCE) return { already: true };
    const [row] = await db.update('patient_ai_summary', `admission_id=eq.${admissionId}`, {
      generated_text: text,
      generated_by: employeeId,
      generated_at: new Date().toISOString(),
      edited_text: null,
      updated_by: null,
      delete_flag: 0
    });
    return { row, regenerated: true };
  }
  try{
    const [row] = await db.insert('patient_ai_summary', {
      admission_id: admissionId,
      patient_id: patientId,
      generated_text: text,
      generated_by: employeeId
    });
    return { row };
  }catch(e){
    // ほぼ同時に別の人が作った場合
    if(isDuplicateError(e)) return { already: true };
    throw e;
  }
}

async function saveAiSummaryEdit(summaryId, text, employeeId){
  return db.update('patient_ai_summary', `ai_summary_id=eq.${summaryId}`, { edited_text: text, updated_by: employeeId });
}

async function setAiSummaryFamilyVisible(summaryId, visible){
  return db.update('patient_ai_summary', `ai_summary_id=eq.${summaryId}`, { family_visible: visible ? 1 : 0 });
}

/* 画面に出す文章（手直し版があればそちらを優先） */
function aiSummaryText(row){
  return row ? (row.edited_text || row.generated_text) : '';
}

/* ---------------------------------------------------------
   要約文の作成（デモ）
   今は外部の AI につながず、データベースの記録をひな形に沿ってまとめます。
   本物の AI に替えるときは、この関数の中身だけを差し替えれば OK です。
   --------------------------------------------------------- */
async function generateAiSummaryText({ patient, current, admissions, symptoms, handoverMemos }){
  const lines = [];
  const age = calcAge(patient.birth_date);

  // 基本情報
  lines.push('【基本情報】');
  lines.push(`${patient.patient_name}さん（${age != null ? age + '歳・' : ''}${masterName('sex', patient.sex_id)}）`);
  const place = [masterName('department', current.department_id), current.room_no ? `${current.room_no}号室` : '',
    current.employee_master ? `主治医：${current.employee_master.employee_name}` : ''].filter(Boolean).join('／');
  if(place) lines.push(place);
  lines.push(`${fmtDate(current.admitted_on)} 入院（今日で${dayOfStay(current.admitted_on)}日目）`);

  // 診断名・アレルギー・既往歴
  const byType = typeId => symptoms.filter(s => s.symptom_master && s.symptom_master.symptom_type_id === typeId);
  const symptomLabel = s => s.symptom_master.symptom_name + (s.onset_on ? `（${fmtDate(s.onset_on)}）` : '');
  lines.push('', '【診断名・アレルギー・既往歴】');
  lines.push(`診断名：${byType(SYMPTOM_TYPE.DIAGNOSIS).map(symptomLabel).join('、') || 'なし'}`);
  lines.push(`アレルギー：${byType(SYMPTOM_TYPE.ALLERGY).map(symptomLabel).join('、') || 'なし'}`);
  lines.push(`既往歴：${byType(SYMPTOM_TYPE.HISTORY).map(symptomLabel).join('、') || 'なし'}`);

  // 病歴・入院歴・治療歴（入院記録と申し送りを日付順に並べる）
  const events = [];
  admissions.forEach(a => {
    events.push({ date: a.admitted_on, text: `入院（${masterName('department', a.department_id) || '診療科未設定'}）` });
    if(a.discharged_on) events.push({ date: a.discharged_on, text: '退院' });
  });
  handoverMemos.forEach(m => {
    const gist = memoGist(m.content);
    if(gist) events.push({ date: m.created_at, text: gist });
  });
  events.sort((x, y) => new Date(x.date) - new Date(y.date));
  lines.push('', '【病歴・入院歴・治療歴】');
  if(events.length){
    events.slice(-12).forEach(ev => lines.push(`${fmtDate(new Date(ev.date).toLocaleDateString('sv-SE', { timeZone: TZ }))}　${ev.text}`));
  }else{
    lines.push('記録なし');
  }

  // 現在の状態
  lines.push('', '【現在の状態】');
  lines.push(`状態：${masterName('conditionLevel', current.condition_level_id)}`);
  if(current.care_note) lines.push(`注意事項：${current.care_note}`);

  // 申し送りの要点（メモの中の【申し送り】の行）
  const todos = handoverMemos
    .map(m => (String(m.content).split('\n').find(l => l.trim().startsWith('【申し送り】')) || '').replace('【申し送り】', '').trim())
    .filter(Boolean);
  if(todos.length){
    lines.push('', '【申し送りの要点】');
    todos.slice(0, 5).forEach(t => lines.push(`・${t}`));
  }

  // 本物の AI のような「考えている時間」を少しだけ置く
  await new Promise(r => setTimeout(r, 900));
  return lines.join('\n');
}

/* メモ本文から 1 行の要点を作る */
function memoGist(content){
  const rows = String(content || '').split('\n').map(s => s.trim()).filter(Boolean);
  if(!rows.length) return '';
  const firstSentence = s => s.split('。')[0];
  const cut = s => (s.length > 60 ? s.slice(0, 60) + '…' : s);

  let head = rows[0];
  const m = head.match(/^【(.+?)】(.*)$/);
  if(m) head = m[2] ? `${m[1]}：${firstSentence(m[2])}` : m[1];
  else head = firstSentence(head);

  const treat = rows.find(r => r.startsWith('【処置】'));
  return cut(head + (treat ? `。処置：${firstSentence(treat.replace('【処置】', ''))}` : ''));
}
