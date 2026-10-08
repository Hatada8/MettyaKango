/* 月のカレンダー（日曜はじまり）の部品
   ご家族の「面談の予約」と、職員の「面談予定」の両方で使います。
   日付は "YYYY-MM-DD"（日本時間）の文字で扱い、ブラウザの時差に左右されないようにしています。 */

const CAL_MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const CAL_DOW = [
  { en: 'SUN', cls: 'sun' }, { en: 'MON', cls: '' }, { en: 'TUE', cls: '' }, { en: 'WED', cls: '' },
  { en: 'THU', cls: '' }, { en: 'FRI', cls: '' }, { en: 'SAT', cls: 'sat' }
];

function calISO(y, m, d){
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

/* 月を前後にずらす（month は 1〜12） */
function calShiftMonth(year, month, delta){
  const d = new Date(Date.UTC(year, month - 1 + delta, 1));
  return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1 };
}

/* 月の最初の日と、次の月の最初の日（期間を調べるときに使う） */
function calMonthRange(year, month){
  const next = calShiftMonth(year, month, 1);
  return { from: calISO(year, month, 1), to: calISO(next.year, next.month, 1) };
}

/* 曜日（0 日曜〜6 土曜） */
function calWeekday(dateISO){
  const [y, m, d] = dateISO.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

/* カレンダーの HTML を作る
   options：
     year, month         表示する月
     selected            選んでいる日（"YYYY-MM-DD"）
     isDisabled(date)    押せない日なら true
     cellHtml(date)      日付の下に入れる中身（予約の表示など）
     selectFn            日を押したときに呼ぶ関数の名前（日付を渡す）
     monthFn             前の月・次の月を押したときに呼ぶ関数の名前（-1 か 1 を渡す。0 で今月）*/
function calendarHtml({ year, month, selected, isDisabled, cellHtml, selectFn, monthFn }){
  const first = new Date(Date.UTC(year, month - 1, 1));
  const lead = first.getUTCDay();
  const days = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const weeks = Math.ceil((lead + days) / 7);
  const today = todayISO();

  let cells = '';
  for(let i = 0; i < weeks * 7; i++){
    const d = new Date(Date.UTC(year, month - 1, 1 - lead + i));
    const date = calISO(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate());
    const inMonth = d.getUTCMonth() + 1 === month;
    const dow = d.getUTCDay();
    const disabled = !inMonth || (isDisabled && isDisabled(date));
    const cls = ['cal-cell', CAL_DOW[dow].cls, inMonth ? '' : 'out', disabled ? 'disabled' : '',
      date === today ? 'today' : '', date === selected ? 'selected' : ''].filter(Boolean).join(' ');
    cells += `
      <div class="${cls}" ${disabled ? 'aria-disabled="true"' : `role="button" tabindex="0" onclick="${selectFn}('${date}')" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();${selectFn}('${date}')}"`}
        aria-label="${month}月${d.getUTCDate()}日">
        <span class="cal-day">${d.getUTCDate()}</span>
        ${inMonth && cellHtml ? `<div class="cal-body">${cellHtml(date)}</div>` : ''}
      </div>`;
  }

  return `
    <div class="cal">
      <div class="cal-head">
        <div class="cal-title">
          <span class="cal-num">${month}</span><span class="cal-en">${CAL_MONTH_NAMES[month - 1]}</span>
        </div>
        <div class="cal-nav">
          <button type="button" class="cal-btn" aria-label="前の月" onclick="${monthFn}(-1)">‹</button>
          <button type="button" class="cal-btn today-btn" onclick="${monthFn}(0)">今月</button>
          <button type="button" class="cal-btn" aria-label="次の月" onclick="${monthFn}(1)">›</button>
        </div>
        <div class="cal-year">${year}</div>
      </div>
      <div class="cal-dow">${CAL_DOW.map(w => `<span class="${w.cls}">${w.en}</span>`).join('')}</div>
      <div class="cal-grid">${cells}</div>
    </div>`;
}
