/* 看護師画面：画面の状態 */
let currentPatientId = null;
let admitted = [];              // 入院中の患者（admission ＋ patient_master）
let favoriteIds = new Set();    // 自分のお気に入り（patient_id）
let unreadMap = {};             // patient_id → { 読んでいないページの番号: true }（READ_TARGET）
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

/* 患者一覧の開閉（☰）。スマホ（幅 860px 以下）だけ。初期は閉じておく。PC はいつも開いたまま */
function isSmallScreen(){ return window.matchMedia('(max-width: 860px)').matches; }

function setSidebar(open){
  const shell = document.getElementById('nurseShell');
  const btn = document.getElementById('sidebarToggle');
  if(!shell) return;
  shell.classList.toggle('sidebar-collapsed', !open);
  if(btn) btn.setAttribute('aria-expanded', String(open));
  // スマホでモーダルとして開いている間は、後ろの画面をスクロールさせない
  document.body.classList.toggle('no-scroll', open && isSmallScreen());
}

function toggleSidebar(){
  const shell = document.getElementById('nurseShell');
  setSidebar(shell.classList.contains('sidebar-collapsed'));
}

function initSidebar(){
  setSidebar(!isSmallScreen());
}

document.addEventListener('keydown', e => { if(e.key === 'Escape' && isSmallScreen()) setSidebar(false); });
window.addEventListener('resize', () => { if(!isSmallScreen()) document.body.classList.remove('no-scroll'); });
