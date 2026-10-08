/* 看護師画面：画面の状態 */
let currentPatientId = null;
let admitted = [];              // 入院中の患者（admission ＋ patient_master）
let favoriteIds = new Set();    // 自分のお気に入り（patient_id）
let unreadCounts = {};          // patient_id → ご家族からの未読の数
let detail = null;              // 表示中の患者 { patient, admissions, current }
let symptoms = [];              // 表示中の患者の症状
let nursePollTimer = null;      // 表示中の患者のチャット更新
let nurseListPollTimer = null;  // 患者一覧の更新

/* 表示中の入院（入院中ならその入院、退院済みなら最後の入院） */
function currentStay(){
  return detail ? (detail.current || detail.admissions[0] || null) : null;
}

/* v1 の旗（high / mid / low）の色を、状態の番号（3 / 2 / 1）で使う */
const FLAG_CLASS = { 1: 'low', 2: 'mid', 3: 'high' };
