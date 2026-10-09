/* 面談の予約（interview_appointment）
   ・ご家族が日時を選んで申し込む → 職員が確定・取り消し・完了にする
   ・職員が直接登録することもできる（そのときは確定になる）
   ・同じ時間に有効な予約は 1 件だけ（データベース側でも二重予約を止める）
   ・消すときは取り消し（状態 3）にする。行は消さない */

const INTERVIEW_STATUS = { REQUESTED: 1, CONFIRMED: 2, CANCELLED: 3, DONE: 4 };

/* 面談を受け付ける時間は、曜日ごとのマスタ（interview_hours_master）で決める（管理者が設定）。
   マスタがまだないとき（add_interview_hours.sql を実行する前）は、平日の 13:00〜17:00・30分ごとにする */
const INTERVIEW_DEFAULT_HOURS = [0, 1, 2, 3, 4, 5, 6].map(w => ({
  weekday: w, is_open: (w >= 1 && w <= 5) ? 1 : 0, start_time: '13:00:00', end_time: '17:00:00', slot_min: 30
}));
let interviewHours = INTERVIEW_DEFAULT_HOURS;
const WEEKDAY_NAMES = ['日', '月', '火', '水', '木', '金', '土'];

async function loadInterviewHours(){
  try{
    const rows = await db.select('interview_hours_master', 'order=weekday');
    interviewHours = rows.length ? rows : INTERVIEW_DEFAULT_HOURS;
  }catch(e){
    interviewHours = INTERVIEW_DEFAULT_HOURS;
  }
  return interviewHours;
}

/* "2026-10-12" の曜日（0 日〜6 土） */
function interviewWeekday(dateISO){
  const [y, m, d] = dateISO.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

function interviewHoursFor(dateISO){
  return interviewHours.find(h => h.weekday === interviewWeekday(dateISO)) || null;
}

/* "13:30:00" → 780（分） */
function timeToMin(t){
  const [h, m] = String(t).split(':').map(Number);
  return h * 60 + (m || 0);
}
function minToTime(m){
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
}

/* その日に受け付ける時間の一覧。"13:00", "13:30", … （休みの曜日は空） */
function interviewTimes(dateISO){
  const h = interviewHoursFor(dateISO);
  if(!h || Number(h.is_open) !== 1) return [];
  const times = [];
  for(let m = timeToMin(h.start_time); m + h.slot_min <= timeToMin(h.end_time); m += h.slot_min) times.push(minToTime(m));
  return times;
}

/* その日の1回の面談の長さ（分） */
function interviewSlotMin(dateISO){
  const h = interviewHoursFor(dateISO);
  return h ? h.slot_min : 30;
}

/* 受け付けている日か */
function isInterviewDay(dateISO){
  return interviewTimes(dateISO).length > 0;
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
      duration_min: interviewSlotMin(dateISO),
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
