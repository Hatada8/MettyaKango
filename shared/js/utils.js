/* 共通の小さな道具（時刻・日付・エスケープ・トースト）
   shared/js/api/ のファイル（v2 と同じもの）が使う名前（esc・toast など）もここで用意しています。 */
const TZ = 'Asia/Tokyo';

function $(id){ return document.getElementById(id); }

function nowTimeStr(){
  const d = new Date();
  return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
}
function escapeHtml(str){
  const d = document.createElement('div');
  d.textContent = str == null ? '' : String(str);
  return d.innerHTML.replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
const esc = escapeHtml;

/* 今日の日付（日本時間）を "YYYY-MM-DD" で */
function todayISO(){
  return new Date().toLocaleDateString('sv-SE', { timeZone: TZ });
}

/* "2026-07-20" → "2026/07/20" */
function fmtDate(date){
  return date ? String(date).slice(0, 10).replace(/-/g, '/') : '';
}

/* 日時 → "10/07 15:00"（withYear で年も） */
function fmtDateTime(ts, withYear = false){
  if(!ts) return '';
  return new Date(ts).toLocaleString('ja-JP', {
    timeZone: TZ,
    year: withYear ? 'numeric' : undefined,
    month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit'
  });
}

/* 生年月日から年齢 */
function calcAge(birthDate){
  if(!birthDate) return null;
  const [by, bm, bd] = birthDate.split('-').map(Number);
  const [ty, tm, td] = todayISO().split('-').map(Number);
  return ty - by - ((tm < bm || (tm === bm && td < bd)) ? 1 : 0);
}

/* 入院日から「何日目」か */
function dayOfStay(admittedOn){
  if(!admittedOn) return null;
  const ms = new Date(todayISO()) - new Date(admittedOn.slice(0, 10));
  return Math.floor(ms / 86400000) + 1;
}

/* テキストエリアを中身に合わせて伸ばす（CSS の max-height を超えたらスクロール） */
function autoGrow(textarea){
  const resize = () => {
    textarea.style.height = 'auto';
    textarea.style.height = textarea.scrollHeight + 2 + 'px';
  };
  textarea.addEventListener('input', resize);
  resize();
}

/* ---------------- toast ---------------- */
let toastTimeout;
function showToast(msg){
  let t = document.getElementById('toast');
  if(!t){
    t = document.createElement('div');
    t.id = 'toast';
    t.className = 'toast';
    document.body.appendChild(t);
  }
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(()=> t.classList.remove('show'), 2400);
}
const toast = showToast;

/* エラーはコンソールに出し、画面には短いメッセージを出す */
function showError(e, message){
  console.error(e);
  showToast(message || 'データの読み書きに失敗しました');
}
