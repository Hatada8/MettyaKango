/* 共通の小さな関数 */
const TZ = 'Asia/Tokyo';

function $(id){ return document.getElementById(id); }

/* HTML に入れる文字を安全にする */
function esc(value){
  return String(value ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
}

/* 画面下に一言メッセージを出す */
function toast(message){
  let el = $('toast');
  if(!el){
    el = document.createElement('div');
    el.id = 'toast';
    el.className = 'toast';
    document.body.appendChild(el);
  }
  el.textContent = message;
  el.classList.add('show');
  clearTimeout(el._timer);
  el._timer = setTimeout(() => el.classList.remove('show'), 2600);
}

/* エラーをコンソールに出し、利用者には短いメッセージを出す */
function showError(e, message){
  console.error(e);
  toast(message || 'データの読み書きに失敗しました');
}

/* 今日の日付（日本時間）を "YYYY-MM-DD" で */
function todayISO(){
  return new Date().toLocaleDateString('sv-SE', { timeZone: TZ });
}

/* "2026-07-20" → "2026/07/20" */
function fmtDate(date){
  return date ? String(date).slice(0, 10).replace(/-/g, '/') : '';
}

/* 日時（timestamptz）→ "10/07 15:00" */
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

/* 入院日から「何日目」か（入院日を 1 日目とする） */
function dayOfStay(admittedOn){
  if(!admittedOn) return null;
  const ms = new Date(todayISO()) - new Date(admittedOn.slice(0, 10));
  return Math.floor(ms / 86400000) + 1;
}

/* アイコン用：名前の最初の 1 文字と色 */
function initialOf(name){ return (name || '？').trim().charAt(0); }
const AVATAR_COLORS = ['peach', 'lilac', 'blue', 'mint'];
function avatarColor(id){ return AVATAR_COLORS[Number(id) % AVATAR_COLORS.length]; }

/* URL の ?id=1 などを読む */
function queryParam(name){ return new URLSearchParams(location.search).get(name); }

/* テキストエリアを中身に合わせて伸ばす（上限を超えたらスクロール） */
function autoGrow(textarea){
  const resize = () => {
    textarea.style.height = 'auto';
    textarea.style.height = textarea.scrollHeight + 2 + 'px';
  };
  textarea.addEventListener('input', resize);
  resize();
}
