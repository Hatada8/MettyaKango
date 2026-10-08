/* ---------------- 共通カレンダー部品 ----------------
   日付は常に "YYYY-MM-DD" 形式（<input type="date"> と同じ）で扱う。
   どの画面（看護師の面談タイムテーブル／家族の面談予約）からも呼び出せる。 */
function pad2(n){ return String(n).padStart(2, '0'); }

function dateToStr(year, month, day){
  return `${year}-${pad2(month)}-${pad2(day)}`;
}

function renderCalendar(containerEl, state){
  const { year, month, selectedDate, minDate, markedDates, onSelect, onPrevMonth, onNextMonth } = state;
  const first = new Date(year, month - 1, 1);
  const startWeekday = first.getDay();
  const daysInMonth = new Date(year, month, 0).getDate();
  const todayStr = todayISO();

  const cells = [];
  for(let i = 0; i < startWeekday; i++) cells.push('<div class="cal-cell empty"></div>');
  for(let d = 1; d <= daysInMonth; d++){
    const dateStr = dateToStr(year, month, d);
    const disabled = !!(minDate && dateStr < minDate);
    const classes = ['cal-cell'];
    if(dateStr === selectedDate) classes.push('selected');
    if(dateStr === todayStr) classes.push('today');
    if(disabled) classes.push('disabled');
    const hasMark = markedDates && markedDates.has(dateStr);
    cells.push(
      `<button type="button" class="${classes.join(' ')}" data-date="${dateStr}" ${disabled ? 'disabled' : ''}>` +
      `${d}${hasMark ? '<span class="cal-dot"></span>' : ''}</button>`
    );
  }

  containerEl.innerHTML = `
    <div class="cal-header">
      <button type="button" class="cal-nav" data-nav="prev">‹</button>
      <div class="cal-title">${year}年${month}月</div>
      <button type="button" class="cal-nav" data-nav="next">›</button>
    </div>
    <div class="cal-weekdays">${['日','月','火','水','木','金','土'].map(w => `<div>${w}</div>`).join('')}</div>
    <div class="cal-grid">${cells.join('')}</div>
  `;

  containerEl.querySelectorAll('.cal-cell[data-date]').forEach(btn => {
    btn.addEventListener('click', () => onSelect(btn.getAttribute('data-date')));
  });
  containerEl.querySelector('[data-nav="prev"]').addEventListener('click', onPrevMonth);
  containerEl.querySelector('[data-nav="next"]').addEventListener('click', onNextMonth);
}
