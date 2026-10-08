/* 面談の予約（interview_appointment）
   ・ご家族が日時を選んで申し込む → 職員が確定・取り消し・完了にする
   ・職員が直接登録することもできる（そのときは確定になる）
   ・同じ時間に有効な予約は 1 件だけ（データベース側でも二重予約を止める）
   ・消すときは取り消し（状態 3）にする。行は消さない */

const INTERVIEW_STATUS = { REQUESTED: 1, CONFIRMED: 2, CANCELLED: 3, DONE: 4 };

/* 面談を受け付ける時間帯（日本時間）：13:00〜17:00、30分ごと */
const INTERVIEW_START_HOUR = 13;
const INTERVIEW_END_HOUR = 17;
const INTERVIEW_STEP_MIN = 30;

/* "13:00", "13:30", … "16:30" の一覧 */
function interviewTimes(){
  const times = [];
  for(let m = INTERVIEW_START_HOUR * 60; m < INTERVIEW_END_HOUR * 60; m += INTERVIEW_STEP_MIN){
    times.push(`${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`);
  }
  return times;
}

/* 日付 "2026-10-12" と時刻 "13:30"（日本時間）→ データベースに入れる日時 */
function interviewStartAt(dateISO, time){
  return `${dateISO}T${time}:00+09:00`;
}

/* URL の条件（?start_at=gte.…）に入れる日時。「+」は記号として読まれてしまうので変換する */
function interviewQueryAt(dateISO){
  return encodeURIComponent(interviewStartAt(dateISO, '00:00'));
}

/* 日時 → 日本時間の日付 "YYYY-MM-DD" と 時刻 "HH:MM" */
function interviewDate(ts){
  return new Date(ts).toLocaleDateString('sv-SE', { timeZone: TZ });
}
function interviewTime(ts){
  return new Date(ts).toLocaleTimeString('ja-JP', { timeZone: TZ, hour: '2-digit', minute: '2-digit', hour12: false });
}

const INTERVIEW_SELECT =
  'select=*,patient_master(patient_name,patient_no),family_master(email),employee_master(employee_name)';

/* 期間（fromDate〜toDate、日本時間の日付）の面談。patientId を渡すとその患者だけ */
async function listInterviews({ fromDate, toDate, patientId, includeCancelled = false } = {}){
  let q = `${INTERVIEW_SELECT}&order=start_at`;
  if(fromDate) q += `&start_at=gte.${interviewQueryAt(fromDate)}`;
  if(toDate) q += `&start_at=lt.${interviewQueryAt(toDate)}`;
  if(patientId) q += `&patient_id=eq.${patientId}`;
  if(!includeCancelled) q += `&interview_status_id=neq.${INTERVIEW_STATUS.CANCELLED}`;
  return db.select('interview_appointment', q);
}

/* すでに埋まっている開始時刻（"YYYY-MM-DD HH:MM" の集合）。申込み中・確定が対象 */
async function bookedInterviewSlots(fromDate, toDate){
  const rows = await db.select('interview_appointment',
    `select=start_at&interview_status_id=in.(1,2)&start_at=gte.${interviewQueryAt(fromDate)}&start_at=lt.${interviewQueryAt(toDate)}`);
  return new Set(rows.map(r => `${interviewDate(r.start_at)} ${interviewTime(r.start_at)}`));
}

/* 申し込み・登録。同じ時間がすでに埋まっていれば { already: true } */
async function createInterview({ patientId, familyId = null, employeeId = null, typeId, dateISO, time, note = '' }){
  try{
    const [row] = await db.insert('interview_appointment', {
      patient_id: patientId,
      family_id: familyId,
      employee_id: employeeId,
      interview_type_id: typeId,
      interview_status_id: employeeId ? INTERVIEW_STATUS.CONFIRMED : INTERVIEW_STATUS.REQUESTED,
      start_at: interviewStartAt(dateISO, time),
      duration_min: INTERVIEW_STEP_MIN,
      note: note.trim() || null
    });
    return { row };
  }catch(e){
    if(isDuplicateError(e)) return { already: true };
    throw e;
  }
}

/* 状態を変える（確定・取り消し・完了）。変えた職員を記録する */
async function setInterviewStatus(interviewId, statusId, employeeId = null){
  const patch = { interview_status_id: statusId };
  if(employeeId) patch.employee_id = employeeId;
  return db.update('interview_appointment', `interview_id=eq.${interviewId}`, patch);
}

/* 確認待ち（申込み中）で、これから先の面談。patientId を渡すとその患者だけ */
async function listPendingInterviews(patientId){
  let q = `${INTERVIEW_SELECT}&interview_status_id=eq.${INTERVIEW_STATUS.REQUESTED}&start_at=gte.${new Date().toISOString()}&order=start_at`;
  if(patientId) q += `&patient_id=eq.${patientId}`;
  return db.select('interview_appointment', q);
}
